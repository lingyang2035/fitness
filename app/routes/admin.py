from flask import Blueprint, request, jsonify, session
from app.models.users import (
    get_all_users, get_all_users_including_inactive, get_user_by_id,
    create_user, update_user, reset_user_password, user_count
)
from app.models.records import (
    get_all_records, delete_record as delete_record_model,
    get_records_count_all, get_records_count_this_week,
    upsert_exercise_type, get_exercise_types
)
from app.models.invites import get_invite_tokens, invites_count
from app.models.logs import get_logs, get_log_actions
from app.auth import admin_required
from app.utils import log_action, get_week_start, safe_user_dict

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/api/admin/dashboard', methods=['GET'])
@admin_required
def dashboard():
    return jsonify({
        'total_users': user_count(),
        'total_records': get_records_count_all(),
        'records_this_week': get_records_count_this_week(get_week_start()),
        'total_invites': invites_count()
    })

@admin_bp.route('/api/admin/users', methods=['GET'])
@admin_required
def list_users():
    users = get_all_users_including_inactive()
    return jsonify({'users': [safe_user_dict(u) for u in users]})

@admin_bp.route('/api/admin/users', methods=['POST'])
@admin_required
def add_user():
    data = request.get_json() or {}
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''
    display_name = (data.get('display_name') or '').strip()
    role = (data.get('role') or 'member').strip()
    avatar = data.get('avatar_emoji') or '👤'

    if not username or len(username) < 2:
        return jsonify({'error': '用户名至少2个字符'}), 400
    if len(password) < 8:
        return jsonify({'error': '密码至少8个字符'}), 400
    if not display_name:
        return jsonify({'error': '请输入显示名称'}), 400

    user = create_user(username, password, display_name, role=role, avatar_emoji=avatar)
    if not user:
        return jsonify({'error': '用户名已存在'}), 400

    log_action('admin_create_user', session['user_id'], {'target_user': user['id']})
    return jsonify(safe_user_dict(user)), 201

@admin_bp.route('/api/admin/users/<int:user_id>', methods=['PUT'])
@admin_required
def edit_user(user_id):
    data = request.get_json() or {}
    user = update_user(user_id,
                       display_name=data.get('display_name'),
                       avatar_emoji=data.get('avatar_emoji'),
                       role=data.get('role'),
                       is_active=data.get('is_active'))
    if not user:
        return jsonify({'error': '用户不存在'}), 404

    if data.get('new_password') and len(data.get('new_password', '')) >= 8:
        reset_user_password(user_id, data['new_password'])

    log_action('admin_edit_user', session['user_id'], {'target_user': user_id})
    return jsonify(safe_user_dict(user))

@admin_bp.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@admin_required
def deactivate_user(user_id):
    if user_id == session['user_id']:
        return jsonify({'error': '不能停用自己的账号'}), 400
    user = update_user(user_id, is_active=0)
    if not user:
        return jsonify({'error': '用户不存在'}), 404
    log_action('admin_deactivate_user', session['user_id'], {'target_user': user_id})
    return jsonify({'message': '已停用'})

@admin_bp.route('/api/admin/records', methods=['GET'])
@admin_required
def list_all_records():
    week_start = request.args.get('week_start')
    user_id = request.args.get('user_id', type=int)
    exercise_type = request.args.get('exercise_type')
    limit = request.args.get('limit', 50, type=int)
    offset = request.args.get('offset', 0, type=int)

    records = get_all_records(
        week_start=week_start, user_id=user_id,
        exercise_type=exercise_type, limit=limit, offset=offset
    )
    # Get unit mapping
    types = get_exercise_types()
    unit_map = {t['name']: t['unit'] for t in types}

    result = []
    for r in records:
        d = dict(r)
        d['unit'] = '个' if unit_map.get(r['exercise_type']) == 'count' else 'km'
        result.append(d)

    return jsonify({'records': result})

@admin_bp.route('/api/admin/records/<int:record_id>', methods=['DELETE'])
@admin_required
def remove_record_admin(record_id):
    success = delete_record_model(record_id)
    if not success:
        return jsonify({'error': '记录不存在'}), 404
    log_action('admin_delete_record', session['user_id'], {'record_id': record_id})
    return jsonify({'message': '已删除'})

@admin_bp.route('/api/admin/logs', methods=['GET'])
@admin_required
def view_logs():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    user_id = request.args.get('user_id', type=int)
    action = request.args.get('action')
    from_date = request.args.get('from_date')
    to_date = request.args.get('to_date')

    logs, total = get_logs(
        page=page, per_page=per_page, user_id=user_id,
        action=action, from_date=from_date, to_date=to_date
    )
    total_pages = (total + per_page - 1) // per_page

    return jsonify({
        'logs': [dict(l) for l in logs],
        'pagination': {
            'page': page, 'per_page': per_page,
            'total': total, 'total_pages': total_pages
        }
    })

@admin_bp.route('/api/admin/logs/actions', methods=['GET'])
@admin_required
def get_actions():
    actions = get_log_actions()
    return jsonify({'actions': actions})

@admin_bp.route('/api/admin/invites', methods=['GET'])
@admin_required
def list_invites():
    tokens = get_invite_tokens()
    return jsonify({'invites': [dict(t) for t in tokens]})

@admin_bp.route('/api/admin/invites/<int:token_id>', methods=['DELETE'])
@admin_required
def revoke_invite(token_id):
    from app.models.invites import revoke_token
    revoke_token(token_id)
    log_action('admin_revoke_invite', session['user_id'], {'token_id': token_id})
    return jsonify({'message': '已撤销'})

@admin_bp.route('/api/admin/types', methods=['GET'])
@admin_required
def list_types():
    types = get_exercise_types()
    return jsonify({'types': [dict(t) for t in types]})

@admin_bp.route('/api/admin/types', methods=['POST'])
@admin_required
def add_type():
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    unit = (data.get('unit') or 'count').strip()
    icon = (data.get('icon') or '').strip() or None
    try:
        sort_order = int(data.get('sort_order', 0))
        is_active = int(data.get('is_active', 1))
    except (ValueError, TypeError):
        return jsonify({'error': '请输入有效数字'}), 400

    if not name:
        return jsonify({'error': '请输入类型名称'}), 400

    upsert_exercise_type(name, unit, icon, sort_order, is_active)
    log_action('admin_add_type', session['user_id'], {'type_name': name})
    return jsonify({'message': '已保存'}), 201
