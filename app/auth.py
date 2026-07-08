import hashlib
import hmac
import secrets
from functools import wraps
from flask import session, jsonify

def hash_password(password):
    """Hash password with PBKDF2-SHA256 (OWASP 2023: 600k iterations)."""
    salt = secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 600000)
    return f"pbkdf2${salt}${h.hex()}"

def check_password(password, password_hash):
    """Verify password. Supports legacy SHA-256 and current PBKDF2."""
    try:
        if password_hash.startswith('pbkdf2$'):
            _, salt, h = password_hash.split('$', 2)
            expected = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 600000)
            return hmac.compare_digest(expected.hex(), h)
        else:
            # Legacy SHA-256 with salt (backward compatible)
            salt, h = password_hash.split('$', 1)
            expected = hashlib.sha256((password + salt).encode()).hexdigest()
            return hmac.compare_digest(expected, h)
    except (ValueError, AttributeError):
        return False

def login_required(f):
    """Decorator to require authentication for API routes."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': '请先登录'}), 401
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    """Decorator to require admin role for API routes."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': '请先登录'}), 401
        if session.get('role') != 'admin':
            return jsonify({'error': '需要管理员权限'}), 403
        return f(*args, **kwargs)
    return decorated

def page_login_required(f):
    """Decorator for page routes — redirects to login instead of returning JSON."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            from flask import redirect, url_for
            return redirect(url_for('main.login_page'))
        return f(*args, **kwargs)
    return decorated

def page_admin_required(f):
    """Decorator for admin page routes."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            from flask import redirect, url_for
            return redirect(url_for('main.login_page'))
        if session.get('role') != 'admin':
            from flask import abort
            abort(403)
        return f(*args, **kwargs)
    return decorated
