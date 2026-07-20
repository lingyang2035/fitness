from app.db import get_db

def get_records(week_start=None, user_id=None, year_month=None):
    db = get_db()
    query = """
        SELECT r.*, u.display_name as user_display_name, u.avatar_emoji as user_avatar_emoji
        FROM exercise_records r
        JOIN users u ON r.user_id = u.id
        WHERE 1=1
    """
    params = []
    if year_month:
        query += " AND r.week_start LIKE ?"
        params.append(year_month + '%')
    elif week_start:
        query += " AND r.week_start = ?"
        params.append(week_start)
    if user_id:
        query += " AND r.user_id = ?"
        params.append(user_id)
    query += " ORDER BY r.recorded_at DESC"
    return db.execute(query, params).fetchall()

def get_all_records(week_start=None, user_id=None, exercise_type=None, limit=50, offset=0):
    db = get_db()
    query = """
        SELECT r.*, u.display_name as user_display_name, u.avatar_emoji as user_avatar_emoji
        FROM exercise_records r
        JOIN users u ON r.user_id = u.id
        WHERE 1=1
    """
    params = []
    if week_start:
        query += " AND r.week_start = ?"
        params.append(week_start)
    if user_id:
        query += " AND r.user_id = ?"
        params.append(user_id)
    if exercise_type:
        query += " AND r.exercise_type = ?"
        params.append(exercise_type)
    query += " ORDER BY r.recorded_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    return db.execute(query, params).fetchall()

def create_record(user_id, exercise_type, duration_minutes, quantity, note=None, week_start=None):
    from app.utils import get_week_start as week_calc
    from datetime import datetime
    db = get_db()
    ws = week_start or week_calc()
    db.execute(
        "INSERT INTO exercise_records (user_id, exercise_type, duration_minutes, quantity, week_start, note, recorded_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (user_id, exercise_type, duration_minutes, quantity, ws, note, datetime.now().isoformat())
    )
    db.commit()
    return db.execute("SELECT * FROM exercise_records WHERE id = last_insert_rowid()").fetchone()

def delete_record(record_id, user_id=None):
    """Delete a record. If user_id provided, only delete if owned by that user."""
    db = get_db()
    if user_id:
        cursor = db.execute("DELETE FROM exercise_records WHERE id = ? AND user_id = ?", (record_id, user_id))
    else:
        cursor = db.execute("DELETE FROM exercise_records WHERE id = ?", (record_id,))
    db.commit()
    return cursor.rowcount > 0

def get_week_summary(week_start, user_id=None):
    db = get_db()
    query = """
        SELECT COALESCE(SUM(duration_minutes), 0) as total_duration,
               COUNT(*) as record_count
        FROM exercise_records
        WHERE week_start = ?
    """
    params = [week_start]
    if user_id:
        query += " AND user_id = ?"
        params.append(user_id)
    return db.execute(query, params).fetchone()

def get_records_count_all():
    db = get_db()
    row = db.execute("SELECT COUNT(*) as cnt FROM exercise_records").fetchone()
    return row['cnt'] if row else 0

def get_records_count_this_week(week_start):
    db = get_db()
    row = db.execute("SELECT COUNT(*) as cnt FROM exercise_records WHERE week_start = ?", (week_start,)).fetchone()
    return row['cnt'] if row else 0

_exercise_types_cache = None

def get_exercise_types():
    global _exercise_types_cache
    if _exercise_types_cache is None:
        db = get_db()
        _exercise_types_cache = db.execute(
            "SELECT * FROM exercise_types WHERE is_active = 1 ORDER BY sort_order"
        ).fetchall()
    return _exercise_types_cache

def _invalidate_types_cache():
    global _exercise_types_cache
    _exercise_types_cache = None

def get_exercise_type_by_name(name):
    db = get_db()
    return db.execute("SELECT * FROM exercise_types WHERE name = ?", (name,)).fetchone()

def upsert_exercise_type(name, unit, icon=None, sort_order=0, is_active=1):
    db = get_db()
    db.execute(
        """INSERT INTO exercise_types (name, unit, icon, sort_order, is_active)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(name) DO UPDATE SET unit=excluded.unit, icon=excluded.icon,
           sort_order=excluded.sort_order, is_active=excluded.is_active""",
        (name, unit, icon, sort_order, is_active)
    )
    db.commit()
    _invalidate_types_cache()
