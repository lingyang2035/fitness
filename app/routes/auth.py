from flask import Blueprint, request, jsonify, session, current_app
from app.models.users import (
    get_user_by_username, create_user, authenticate, user_count,
    get_user_by_id, update_user, reset_user_password
)
from app.models.invites import verify_token, mark_token_used
from app.auth import login_required
from app.utils import log_action, safe_user_dict
import time
import re

auth_bp = Blueprint('auth', __name__)


def _is_valid_password(password):
    """密码必须至少8位，且同时包含数字和字母"""
    return bool(re.search(r'[a-zA-Z]', password) and re.search(r'[0-9]', password))

# In-memory rate limiter for login (resets on restart)
_login_attempts = {}  # {ip_or_username: [(timestamp, ...)]}


def _check_rate_limit(key):
    """Return True if rate limit exceeded."""
    now = time.time()
    window = current_app.config.get('LOGIN_WINDOW_SECONDS', 60)
    max_attempts = current_app.config.get('MAX_LOGIN_ATTEMPTS', 5)
    attempts = _login_attempts.get(key, [])
    # Prune old entries
    attempts = [t for t in attempts if now - t < window]
    _login_attempts[key] = attempts
    return len(attempts) >= max_attempts


def _record_attempt(key):
    """Record a failed login attempt."""
    _login_attempts.setdefault(key, []).append(time.time())

@auth_bp.route('/api/auth/setup', methods=['POST'])
def setup():
    """First-run admin creation — only works when no users exist."""
    if user_count() > 0:
        return jsonify({'error': '系统已初始化'}), 400

    data = request.get_json() or {}
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''
    display_name = (data.get('display_name') or '').strip()

    if not username or len(username) < 2:
        return jsonify({'error': '用户名至少2个字符'}), 400
    if len(password) < 8:
        return jsonify({'error': '密码至少8个字符'}), 400
    if not _is_valid_password(password):
        return jsonify({'error': '密码必须包含数字和字母'}), 400
    if not display_name:
        return jsonify({'error': '请输入显示名称'}), 400

    user = create_user(username, password, display_name, role='admin', avatar_emoji='👑')
    if not user:
        return jsonify({'error': '用户名已存在'}), 400

    session.permanent = True
    session['user_id'] = user['id']
    session['role'] = user['role']
    session['display_name'] = user['display_name']

    log_action('admin_setup', user['id'])
    return jsonify(safe_user_dict(user)), 201

@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''

    if not username or not password:
        return jsonify({'error': '请输入用户名和密码'}), 400

    # Rate limit by IP + username
    rate_key = f"{request.remote_addr}:{username}"
    if _check_rate_limit(rate_key):
        return jsonify({'error': '登录尝试过于频繁，请稍后再试'}), 429

    user = authenticate(username, password)
    if not user:
        _record_attempt(rate_key)
        log_action('login_failed', details={'username': username})
        return jsonify({'error': '用户名或密码错误'}), 401

    session.permanent = True
    session['user_id'] = user['id']
    session['role'] = user['role']
    session['display_name'] = user['display_name']

    log_action('login', user['id'])
    return jsonify({
        'id': user['id'],
        'username': user['username'],
        'display_name': user['display_name'],
        'role': user['role'],
        'avatar_emoji': user['avatar_emoji']
    })

@auth_bp.route('/api/auth/register', methods=['POST'])
def register():
    # Rate limit: 5 requests per 60s per IP
    key = f"register:{request.remote_addr}"
    if _check_rate_limit(key):
        return jsonify({'error': '请求过于频繁，请稍后重试'}), 429
    _record_attempt(key)

    data = request.get_json() or {}
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''
    display_name = (data.get('display_name') or '').strip()
    token = (data.get('token') or '').strip()

    if not token:
        return jsonify({'error': '需要邀请令牌'}), 400
    if not username or len(username) < 2:
        return jsonify({'error': '用户名至少2个字符'}), 400
    if len(password) < 8:
        return jsonify({'error': '密码至少8个字符'}), 400
    if not _is_valid_password(password):
        return jsonify({'error': '密码必须包含数字和字母'}), 400
    if not display_name:
        return jsonify({'error': '请输入显示名称'}), 400

    valid, msg, token_row = verify_token(token)
    if not valid:
        return jsonify({'error': msg}), 400

    user = create_user(username, password, display_name, role='member',
                       family_id=token_row['family_id'])
    if not user:
        return jsonify({'error': '用户名已存在'}), 400

    mark_token_used(token, user['id'])

    session.permanent = True
    session['user_id'] = user['id']
    session['role'] = user['role']
    session['display_name'] = user['display_name']

    log_action('register', user['id'], {'token': token[:8] + '...'})
    return jsonify(safe_user_dict(user)), 201

@auth_bp.route('/api/auth/logout', methods=['POST'])
@login_required
def logout():
    log_action('logout', session.get('user_id'))
    session.clear()
    return jsonify({'message': '已退出'})

@auth_bp.route('/api/auth/me', methods=['GET'])
@login_required
def me():
    user = get_user_by_id(session['user_id'])
    if not user:
        session.clear()
        return jsonify({'error': '用户不存在'}), 401
    return jsonify({
        'id': user['id'],
        'username': user['username'],
        'display_name': user['display_name'],
        'role': user['role'],
        'avatar_emoji': user['avatar_emoji']
    })

@auth_bp.route('/api/auth/password', methods=['PUT'])
@login_required
def change_password():
    data = request.get_json() or {}
    old_password = data.get('old_password') or ''
    new_password = data.get('new_password') or ''

    # Rate limit: 5 requests per 60s per user
    key = f"password_change:{session['user_id']}"
    if _check_rate_limit(key):
        return jsonify({'error': '请求过于频繁，请稍后重试'}), 429
    _record_attempt(key)

    if len(new_password) < 8:
        return jsonify({'error': '新密码至少8个字符'}), 400
    if not _is_valid_password(new_password):
        return jsonify({'error': '密码必须包含数字和字母'}), 400

    user = get_user_by_id(session['user_id'])
    if not user:
        return jsonify({'error': '用户不存在'}), 404

    from app.auth import check_password
    if not check_password(old_password, user['password_hash']):
        return jsonify({'error': '原密码错误'}), 400

    reset_user_password(user['id'], new_password)
    log_action('change_password', user['id'])
    return jsonify({'message': '密码已更新'})
