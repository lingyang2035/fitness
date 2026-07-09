import sqlite3
import os
from flask import g, current_app

def get_db():
    """Get database connection for the current request."""
    if 'db' not in g:
        db_path = current_app.config['DATABASE']
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        g.db = conn
    return g.db

def close_db(e=None):
    """Close database connection at end of request."""
    db = g.pop('db', None)
    if db is not None:
        db.close()

def init_db():
    """Create all tables and seed exercise types."""
    db = get_db()

    db.executescript("""
        CREATE TABLE IF NOT EXISTS families (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL DEFAULT '我家',
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS users (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            family_id       INTEGER NOT NULL DEFAULT 1,
            username        TEXT UNIQUE NOT NULL,
            password_hash   TEXT NOT NULL,
            display_name    TEXT NOT NULL,
            role            TEXT NOT NULL DEFAULT 'member',
            avatar_emoji    TEXT DEFAULT '👤',
            is_active       INTEGER NOT NULL DEFAULT 1,
            created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login      TIMESTAMP,
            FOREIGN KEY (family_id) REFERENCES families(id)
        );

        CREATE TABLE IF NOT EXISTS exercise_types (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT UNIQUE NOT NULL,
            unit        TEXT NOT NULL DEFAULT 'km',
            icon        TEXT,
            sort_order  INTEGER DEFAULT 0,
            is_active   INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS exercise_records (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id           INTEGER NOT NULL,
            exercise_type     TEXT NOT NULL,
            duration_minutes  INTEGER NOT NULL DEFAULT 0,
            quantity          REAL NOT NULL DEFAULT 0,
            recorded_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            week_start        TEXT NOT NULL,
            note              TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS invite_tokens (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            token             TEXT UNIQUE NOT NULL,
            family_id         INTEGER NOT NULL DEFAULT 1,
            created_by        INTEGER NOT NULL,
            is_used           INTEGER NOT NULL DEFAULT 0,
            used_by_user_id   INTEGER,
            expires_at        TIMESTAMP,
            max_uses          INTEGER DEFAULT 1,
            use_count         INTEGER DEFAULT 0,
            created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (family_id) REFERENCES families(id),
            FOREIGN KEY (created_by) REFERENCES users(id),
            FOREIGN KEY (used_by_user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS access_logs (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER,
            action      TEXT NOT NULL,
            details     TEXT,
            ip_address  TEXT,
            user_agent  TEXT,
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS settings (
            key         TEXT PRIMARY KEY,
            value       TEXT NOT NULL,
            updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_records_week ON exercise_records(week_start);
        CREATE INDEX IF NOT EXISTS idx_records_user ON exercise_records(user_id);
        CREATE INDEX IF NOT EXISTS idx_records_type ON exercise_records(exercise_type);
        CREATE INDEX IF NOT EXISTS idx_records_recorded ON exercise_records(recorded_at);
        CREATE INDEX IF NOT EXISTS idx_records_week_user ON exercise_records(week_start, user_id, recorded_at DESC);
        CREATE INDEX IF NOT EXISTS idx_logs_user ON access_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_logs_action ON access_logs(action);
        CREATE INDEX IF NOT EXISTS idx_logs_created ON access_logs(created_at);
        CREATE INDEX IF NOT EXISTS idx_tokens_token ON invite_tokens(token);
    """)

    # Seed family if empty
    db.execute("INSERT OR IGNORE INTO families (id, name) VALUES (1, '我家')")

    # Seed exercise types
    types = [
        ('跑步', 'km', 'footprints', 1),
        ('壶铃', 'none', 'dumbbell', 2),
        ('拉伸', 'count', 'stretch-horizontal', 3),
        ('跳绳', 'count', 'skip-forward', 4),
        ('游泳', 'km', 'waves', 5),
        ('引体向上', 'count', 'arrow-up-circle', 6),
        ('吊单杠', 'count', 'arrow-up', 7),
        ('靠墙站立', 'count', 'person-standing', 8),
    ]
    for name, unit, icon, sort_order in types:
        db.execute(
            "INSERT OR IGNORE INTO exercise_types (name, unit, icon, sort_order) VALUES (?, ?, ?, ?)",
            (name, unit, icon, sort_order)
        )

    # Migrate existing types: 壶铃 → time-only (unit='none')
    db.execute("UPDATE exercise_types SET unit='none' WHERE name='壶铃' AND unit='count'")
    # Migrate: 吊单杠/拉伸 → count-based (unit='count')
    db.execute("UPDATE exercise_types SET unit='count' WHERE name IN ('吊单杠', '拉伸') AND unit='none'")
    db.commit()
