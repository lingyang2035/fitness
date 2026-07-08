import json
from datetime import datetime, timedelta
from flask import request, g
from app.db import get_db

def get_week_start(dt=None):
    """Return ISO Monday date string (YYYY-MM-DD) for the given datetime."""
    dt = dt or datetime.now()
    monday = dt - timedelta(days=dt.weekday())
    return monday.strftime('%Y-%m-%d')

def get_week_range(week_start_str):
    """Return (monday, sunday) date objects from a week_start string."""
    monday = datetime.strptime(week_start_str, '%Y-%m-%d')
    sunday = monday + timedelta(days=6)
    return monday, sunday

def log_action(action, user_id=None, details=None):
    """Record an action in the access log."""
    db = get_db()
    db.execute(
        "INSERT INTO access_logs (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)",
        (
            user_id or session_get('user_id'),
            action,
            json.dumps(details, ensure_ascii=False) if details else None,
            request.remote_addr,
            request.headers.get('User-Agent', '')[:500]
        )
    )
    db.commit()

def session_get(key):
    """Safe session getter — works outside request context."""
    try:
        from flask import session
        return session.get(key)
    except RuntimeError:
        return None

# Safe fields to expose in API responses (excludes password_hash)
_USER_SAFE_FIELDS = ('id', 'username', 'display_name', 'role', 'avatar_emoji',
                     'is_active', 'created_at', 'last_login', 'family_id')

def safe_user_dict(user):
    """Return a dict with only safe-to-expose fields, stripping password_hash."""
    return {k: user[k] for k in _USER_SAFE_FIELDS if k in user.keys()}

def cleanup_old_logs():
    """Remove logs older than LOG_RETENTION_DAYS."""
    db = get_db()
    from app.config import Config
    cutoff = datetime.now() - timedelta(days=Config.LOG_RETENTION_DAYS)
    db.execute("DELETE FROM access_logs WHERE created_at < ?", (cutoff.isoformat(),))
    db.commit()
