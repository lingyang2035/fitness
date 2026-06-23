from flask import Blueprint, request, jsonify, session
from app.models.records import get_records, get_exercise_types
from app.auth import login_required
from app.utils import get_week_start

stats_bp = Blueprint('stats', __name__)

@stats_bp.route('/api/stats', methods=['GET'])
@login_required
def get_stats():
    week_start = request.args.get('week_start') or get_week_start()

    records = get_records(week_start=week_start)

    # Get unit mapping
    types = get_exercise_types()
    unit_map = {t['name']: t['unit'] for t in types}

    # Aggregate by user
    stats = {}
    for r in records:
        uid = r['user_id']
        if uid not in stats:
            stats[uid] = {
                'user_id': uid,
                'display_name': r['user_display_name'],
                'avatar_emoji': r['user_avatar_emoji'],
                'total_duration': 0,
                'total_quantity_km': 0.0,
                'record_count': 0,
                'breakdown': {}
            }
        stats[uid]['total_duration'] += r['duration_minutes']
        stats[uid]['record_count'] += 1
        unit = unit_map.get(r['exercise_type'], 'km')
        if unit == 'km':
            stats[uid]['total_quantity_km'] += r['quantity']

        etype = r['exercise_type']
        if etype not in stats[uid]['breakdown']:
            stats[uid]['breakdown'][etype] = {'count': 0, 'duration': 0, 'quantity': 0}
        stats[uid]['breakdown'][etype]['count'] += 1
        stats[uid]['breakdown'][etype]['duration'] += r['duration_minutes']
        stats[uid]['breakdown'][etype]['quantity'] += r['quantity']

    # Sort by total duration descending
    sorted_stats = sorted(stats.values(), key=lambda x: x['total_duration'], reverse=True)

    return jsonify({'stats': sorted_stats})
