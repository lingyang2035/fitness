from flask import Blueprint, request, jsonify, session
from app.models.users import (
    get_user_by_username, create_user, authenticate, user_count,
    get_user_by_id, update_user, reset_user_password
)
from app.models.invites import verify_token, mark_token_used
from app.auth import login_required
from app.utils import log_action

auth_bp = Blueprint('auth', __name__)

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
    if len(password) < 4:
        return jsonify({'error': '密码至少4个字符'}), 400
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
    return jsonify(dict(user)), 201

@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''

    if not username or not password:
        return jsonify({'error': '请输入用户名和密码'}), 400

    user = authenticate(username, password)
    if not user:
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
    data = request.get_json() or {}
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''
    display_name = (data.get('display_name') or '').strip()
    token = (data.get('token') or '').strip()

    if not token:
        return jsonify({'error': '需要邀请令牌'}), 400
    if not username or len(username) < 2:
        return jsonify({'error': '用户名至少2个字符'}), 400
    if len(password) < 4:
        return jsonify({'error': '密码至少4个字符'}), 400
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
    return jsonify(dict(user)), 201

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

    if len(new_password) < 4:
        return jsonify({'error': '新密码至少4个字符'}), 400

    user = get_user_by_id(session['user_id'])
    if not user:
        return jsonify({'error': '用户不存在'}), 404

    from app.auth import check_password
    if not check_password(old_password, user['password_hash']):
        return jsonify({'error': '原密码错误'}), 400

    reset_user_password(user['id'], new_password)
    log_action('change_password', user['id'])
    return jsonify({'message': '密码已更新'})
