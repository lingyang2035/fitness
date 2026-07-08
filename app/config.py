import os
import secrets

def _load_or_create_secret_key():
    """Load SECRET_KEY from env or file; persist if generated."""
    key = os.environ.get('SECRET_KEY')
    if key:
        return key
    key_path = os.environ.get(
        'SECRET_KEY_FILE',
        os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'secret_key')
    )
    try:
        with open(key_path) as f:
            return f.read().strip()
    except FileNotFoundError:
        key = secrets.token_hex(32)
        os.makedirs(os.path.dirname(key_path), exist_ok=True)
        with open(key_path, 'w') as f:
            f.write(key)
        return key

class Config:
    SECRET_KEY = _load_or_create_secret_key()
    DATABASE = os.environ.get('DATABASE_PATH', os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'fitness.db'))
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    SESSION_COOKIE_SECURE = os.environ.get('SESSION_SECURE', '0') == '1'  # Must set to '1' in production behind HTTPS
    PERMANENT_SESSION_LIFETIME = 7 * 24 * 60 * 60  # 7 days
    LOG_RETENTION_DAYS = 90
    MAX_LOGIN_ATTEMPTS = 5
    LOGIN_WINDOW_SECONDS = 60

    # Configurable URL prefix for reverse proxy sub-path deployment (e.g. /fitness)
    APP_PREFIX = os.environ.get('APP_PREFIX', '')
    # Scope session cookie to the sub-path so it doesn't leak to other apps
    # Nginx proxy_cookie_path rewrites / to /fitness/ when APP_PREFIX is set
    SESSION_COOKIE_PATH = '/'
