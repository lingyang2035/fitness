from flask import Flask, jsonify, Response, request
from app.config import Config
from app.db import init_db, close_db
from werkzeug.middleware.proxy_fix import ProxyFix


def create_app(config_class=Config):
    app = Flask(__name__, static_folder='../static', static_url_path='/static')
    app.config.from_object(config_class)

    # --- ProxyFix: handle X-Forwarded-For/Proto/Host from nginx ---
    # x_prefix=0: we handle SCRIPT_NAME dynamically per-request below
    app.wsgi_app = ProxyFix(
        app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=0
    )

    # --- Middleware: set SCRIPT_NAME dynamically from X-Forwarded-Prefix ---
    class PrefixMiddleware:
        def __init__(self, wsgi_app):
            self.app = wsgi_app
        def __call__(self, environ, start_response):
            prefix = environ.get('HTTP_X_FORWARDED_PREFIX', '')
            if prefix:
                environ['SCRIPT_NAME'] = prefix
            return self.app(environ, start_response)

    app.wsgi_app = PrefixMiddleware(app.wsgi_app)

    # --- Dynamic app_prefix for templates (empty for direct, /fitness via nginx) ---
    @app.context_processor
    def inject_prefix():
        prefix = request.headers.get('X-Forwarded-Prefix', '')
        return {'app_prefix': prefix}

    # ---- PWA dynamic routes ----

    @app.route('/manifest.json')
    def serve_manifest():
        prefix = request.headers.get('X-Forwarded-Prefix', '')
        return jsonify({
            "name": "家庭健身",
            "short_name": "健身",
            "description": "家庭健身记录与统计",
            "start_url": prefix + "/app",
            "display": "standalone",
            "background_color": "#ffffff",
            "theme_color": "#4f46e5",
            "orientation": "portrait",
            "icons": [
                {
                    "src": prefix + "/static/icon-192.png",
                    "sizes": "192x192",
                    "type": "image/png",
                    "purpose": "any maskable"
                },
                {
                    "src": prefix + "/static/icon-512.png",
                    "sizes": "512x512",
                    "type": "image/png",
                    "purpose": "any maskable"
                }
            ]
        })

    @app.route('/sw.js')
    def serve_sw():
        prefix = request.headers.get('X-Forwarded-Prefix', '')
        sw_js = f'''const CACHE_NAME = 'fitness-v3';
const STATIC_ASSETS = [
    '{prefix}/static/js/api.js',
    '{prefix}/static/js/app.js',
    '{prefix}/static/js/admin.js',
    '{prefix}/static/manifest.json'
];

self.addEventListener('install', (event) => {{
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {{
            return cache.addAll(STATIC_ASSETS).catch(err => {{
                console.warn('SW: some static assets failed to cache', err);
            }});
        }})
    );
}});

self.addEventListener('activate', (event) => {{
    event.waitUntil(
        caches.keys().then((keys) => {{
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        }})
    );
}});

self.addEventListener('fetch', (event) => {{
    if (event.request.url.includes('/api/')) {{
        return;
    }}
    const reqUrl = new URL(event.request.url);
    if (reqUrl.origin !== self.location.origin) {{
        return;
    }}
    event.respondWith(
        caches.match(event.request).then((cached) => {{
            const fetched = fetch(event.request).then((response) => {{
                if (response && response.status === 200 && response.type === 'basic') {{
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {{
                        cache.put(event.request, clone);
                    }});
                }}
                return response;
            }}).catch(() => {{
                if (event.request.mode === 'navigate') {{
                    return caches.match('{prefix}/static/offline.html');
                }}
                return cached;
            }});
            return cached || fetched;
        }})
    );
}});
'''
        return Response(sw_js, mimetype='application/javascript')

    # Register DB close handler
    app.teardown_appcontext(close_db)

    # Register blueprints (routes are unaware of the prefix — ProxyFix handles it)
    from app.routes.main import main_bp
    from app.routes.auth import auth_bp
    from app.routes.records import records_bp
    from app.routes.stats import stats_bp
    from app.routes.invite import invite_bp
    from app.routes.admin import admin_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(records_bp)
    app.register_blueprint(stats_bp)
    app.register_blueprint(invite_bp)
    app.register_blueprint(admin_bp)

    # Initialize database on first request
    @app.before_request
    def _init_db():
        init_db()

    return app
