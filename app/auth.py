import hashlib
import secrets
from functools import wraps
from flask import session, jsonify

def hash_password(password):
    """Hash a password using SHA-256 with a random salt."""
    salt = secrets.token_hex(16)
    h = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}${h}"

def check_password(password, password_hash):
    """Verify a password against its hash."""
    try:
        salt, h = password_hash.split('$', 1)
        return h == hashlib.sha256((password + salt).encode()).hexdigest()
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
