from app.db import get_db

def get_logs(page=1, per_page=20, user_id=None, action=None, from_date=None, to_date=None):
    db = get_db()
    query = """
        SELECT l.*, u.display_name as user_display_name
        FROM access_logs l
        LEFT JOIN users u ON l.user_id = u.id
        WHERE 1=1
    """
    params = []
    if user_id:
        query += " AND l.user_id = ?"
        params.append(user_id)
    if action:
        query += " AND l.action = ?"
        params.append(action)
    if from_date:
        query += " AND l.created_at >= ?"
        params.append(from_date)
    if to_date:
        query += " AND l.created_at <= ?"
        params.append(to_date)
    query += " ORDER BY l.created_at DESC LIMIT ? OFFSET ?"
    params.extend([per_page, (page - 1) * per_page])
    rows = db.execute(query, params).fetchall()

    # Count total
    count_query = "SELECT COUNT(*) as cnt FROM access_logs l WHERE 1=1"
    count_params = []
    if user_id:
        count_query += " AND l.user_id = ?"
        count_params.append(user_id)
    if action:
        count_query += " AND l.action = ?"
        count_params.append(action)
    if from_date:
        count_query += " AND l.created_at >= ?"
        count_params.append(from_date)
    if to_date:
        count_query += " AND l.created_at <= ?"
        count_params.append(to_date)
    total = db.execute(count_query, count_params).fetchone()['cnt']

    return rows, total

def get_log_actions():
    db = get_db()
    rows = db.execute("SELECT DISTINCT action FROM access_logs ORDER BY action").fetchall()
    return [r['action'] for r in rows]
