from flask import Blueprint, request, jsonify, session
from app.models.records import (
    get_records, create_record, delete_record, get_exercise_types,
    get_week_summary
)
from app.models.records import get_records as get_records_model
from app.models.users import get_user_by_id
from app.auth import login_required
from app.utils import log_action, get_week_start

records_bp = Blueprint('records', __name__)

@records_bp.route('/api/records', methods=['GET'])
@login_required
def list_records():
    week_start = request.args.get('week_start') or get_week_start()
    mode = request.args.get('mode', 'all')
    user_id_param = request.args.get('user_id')

    if mode == 'me':
        records = get_records(week_start=week_start, user_id=session['user_id'])
    elif user_id_param:
        try:
            records = get_records(week_start=week_start, user_id=int(user_id_param))
        except (ValueError, TypeError):
            return jsonify({'error': '无效的用户ID'}), 400
    else:
        records = get_records(week_start=week_start)

    # Get exercise types for unit mapping
    types = get_exercise_types()
    unit_map = {t['name']: t['unit'] for t in types}

    # Calculate summary
    total_duration = sum(r['duration_minutes'] for r in records)
    total_quantity = sum(r['quantity'] for r in records if unit_map.get(r['exercise_type']) == 'km')

    result = []
    for r in records:
        d = dict(r)
        unit = unit_map.get(r['exercise_type'], 'km')
        d['unit'] = '个' if unit == 'count' else 'km'
        result.append(d)

    return jsonify({
        'records': result,
        'summary': {
            'total_duration': total_duration,
            'total_quantity': round(total_quantity, 1),
            'record_count': len(records)
        }
    })

@records_bp.route('/api/records', methods=['POST'])
@login_required
def add_record():
    data = request.get_json() or {}
    exercise_type = (data.get('exercise_type') or '').strip()
    try:
        duration_minutes = int(data.get('duration_minutes', 0))
        quantity = float(data.get('quantity', 0))
    except (ValueError, TypeError):
        return jsonify({'error': '请输入有效数字'}), 400
    note = (data.get('note') or '').strip() or None

    if not exercise_type:
        return jsonify({'error': '请选择运动类型'}), 400
    if duration_minutes <= 0:
        return jsonify({'error': '请输入有效时长'}), 400

    record = create_record(
        user_id=session['user_id'],
        exercise_type=exercise_type,
        duration_minutes=duration_minutes,
        quantity=quantity,
        note=note
    )

    log_action('create_record', session['user_id'],
               {'type': exercise_type, 'duration': duration_minutes, 'quantity': quantity})

    # Join user info
    user = get_user_by_id(session['user_id'])
    record_dict = dict(record)
    record_dict['user_display_name'] = user['display_name'] if user else ''
    record_dict['user_avatar_emoji'] = user['avatar_emoji'] if user else ''

    return jsonify(record_dict), 201

@records_bp.route('/api/records/<int:record_id>', methods=['DELETE'])
@login_required
def remove_record(record_id):
    # Regular users can only delete their own records; admins can delete any
    restrict_user = None if session.get('role') == 'admin' else session['user_id']
    success = delete_record(record_id, user_id=restrict_user)
    if not success:
        return jsonify({'error': '记录不存在或无权删除'}), 404

    log_action('delete_record', session['user_id'], {'record_id': record_id})
    return jsonify({'message': '已删除'})

@records_bp.route('/api/types', methods=['GET'])
def list_types():
    types = get_exercise_types()
    return jsonify({
        'types': [{'name': t['name'], 'unit': t['unit'], 'icon': t['icon']} for t in types]
    })
