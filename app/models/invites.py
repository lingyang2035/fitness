import uuid
from datetime import datetime, timedelta
from app.db import get_db

def create_invite_token(created_by, family_id=1, expires_in_days=None, max_uses=1):
    db = get_db()
    token = uuid.uuid4().hex
    expires_at = None
    if expires_in_days:
        expires_at = (datetime.now() + timedelta(days=expires_in_days)).isoformat()
    db.execute(
        "INSERT INTO invite_tokens (token, family_id, created_by, expires_at, max_uses) VALUES (?, ?, ?, ?, ?)",
        (token, family_id, created_by, expires_at, max_uses)
    )
    db.commit()
    return db.execute("SELECT * FROM invite_tokens WHERE token = ?", (token,)).fetchone()

def verify_token(token):
    """Check if an invite token is valid. Returns (valid, message, token_record)."""
    db = get_db()
    row = db.execute("SELECT * FROM invite_tokens WHERE token = ?", (token,)).fetchone()
    if not row:
        return False, '邀请链接无效', None
    if row['is_used'] and row['use_count'] >= row['max_uses']:
        return False, '邀请链接已被使用', None
    if row['expires_at'] and row['expires_at'] < datetime.now().isoformat():
        return False, '邀请链接已过期', None
    return True, '有效', row

def mark_token_used(token, used_by_user_id):
    db = get_db()
    db.execute(
        "UPDATE invite_tokens SET use_count = use_count + 1, used_by_user_id = ?, is_used = CASE WHEN use_count + 1 >= max_uses THEN 1 ELSE 0 END WHERE token = ?",
        (used_by_user_id, token)
    )
    db.commit()

def get_invite_tokens(created_by=None):
    db = get_db()
    if created_by:
        return db.execute("SELECT * FROM invite_tokens WHERE created_by = ? ORDER BY created_at DESC", (created_by,)).fetchall()
    return db.execute("""
        SELECT t.*, u.display_name as creator_name
        FROM invite_tokens t
        LEFT JOIN users u ON t.created_by = u.id
        ORDER BY t.created_at DESC
    """).fetchall()

def revoke_token(token_id, created_by=None):
    db = get_db()
    if created_by:
        cursor = db.execute("UPDATE invite_tokens SET is_used = 1 WHERE id = ? AND created_by = ?", (token_id, created_by))
    else:
        cursor = db.execute("UPDATE invite_tokens SET is_used = 1 WHERE id = ?", (token_id,))
    db.commit()
    return cursor.rowcount > 0

def invites_count():
    db = get_db()
    row = db.execute("SELECT COUNT(*) as cnt FROM invite_tokens").fetchone()
    return row['cnt'] if row else 0
