from app.db import get_db
from app.auth import hash_password, check_password
from datetime import datetime

def get_user_by_id(user_id):
    db = get_db()
    return db.execute("SELECT * FROM users WHERE id = ? AND is_active = 1", (user_id,)).fetchone()

def get_user_by_username(username):
    db = get_db()
    return db.execute("SELECT * FROM users WHERE username = ? AND is_active = 1", (username,)).fetchone()

def get_all_users():
    db = get_db()
    return db.execute("SELECT * FROM users WHERE is_active = 1 ORDER BY created_at").fetchall()

def get_all_users_including_inactive():
    db = get_db()
    return db.execute("SELECT * FROM users ORDER BY created_at").fetchall()

def create_user(username, password, display_name, role='member', avatar_emoji='👤', family_id=1):
    db = get_db()
    try:
        db.execute(
            "INSERT INTO users (username, password_hash, display_name, role, avatar_emoji, family_id) VALUES (?, ?, ?, ?, ?, ?)",
            (username, hash_password(password), display_name, role, avatar_emoji, family_id)
        )
        db.commit()
        return db.execute("SELECT * FROM users WHERE id = last_insert_rowid()").fetchone()
    except Exception:
        return None

def update_user(user_id, **kwargs):
    db = get_db()
    allowed = {'display_name', 'avatar_emoji', 'is_active', 'role'}
    updates = {k: v for k, v in kwargs.items() if k in allowed}
    if not updates:
        return None
    if 'is_active' in updates:
        updates['is_active'] = 1 if updates['is_active'] else 0
    set_clause = ', '.join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [user_id]
    db.execute(f"UPDATE users SET {set_clause} WHERE id = ?", values)
    db.commit()
    return get_user_by_id(user_id)

def reset_user_password(user_id, new_password):
    db = get_db()
    db.execute("UPDATE users SET password_hash = ? WHERE id = ?", (hash_password(new_password), user_id))
    db.commit()

def update_last_login(user_id):
    db = get_db()
    db.execute("UPDATE users SET last_login = ? WHERE id = ?", (datetime.now().isoformat(), user_id))
    db.commit()

def user_count():
    db = get_db()
    row = db.execute("SELECT COUNT(*) as cnt FROM users WHERE is_active = 1").fetchone()
    return row['cnt'] if row else 0

def authenticate(username, password):
    user = get_user_by_username(username)
    if user and check_password(password, user['password_hash']):
        update_last_login(user['id'])
        return user
    return None
