import os
import secrets

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', secrets.token_hex(32))
    DATABASE = os.environ.get('DATABASE_PATH', os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'fitness.db'))
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = 31 * 24 * 60 * 60  # 31 days
    LOG_RETENTION_DAYS = 90
    MAX_LOGIN_ATTEMPTS = 5
    LOGIN_WINDOW_SECONDS = 60

    # Configurable URL prefix for reverse proxy sub-path deployment (e.g. /fitness)
    APP_PREFIX = os.environ.get('APP_PREFIX', '')
    # Scope session cookie to the sub-path so it doesn't leak to other apps
    # Nginx proxy_cookie_path rewrites / to /fitness/ when APP_PREFIX is set
    SESSION_COOKIE_PATH = '/'
