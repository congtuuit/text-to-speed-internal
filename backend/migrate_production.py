import sqlite3

DB_PATH = 'tts_batch.db'

ALTERS = [
    ('batch_jobs', 'owner_id', 'ALTER TABLE batch_jobs ADD COLUMN owner_id INTEGER'),
    ('batch_jobs', 'workspace_id', 'ALTER TABLE batch_jobs ADD COLUMN workspace_id INTEGER'),
    ('file_tasks', 'owner_id', 'ALTER TABLE file_tasks ADD COLUMN owner_id INTEGER'),
    ('settings', 'owner_id', 'ALTER TABLE settings ADD COLUMN owner_id INTEGER'),
    ('saved_voices', 'owner_id', 'ALTER TABLE saved_voices ADD COLUMN owner_id INTEGER'),
    ('generated_audios', 'owner_id', 'ALTER TABLE generated_audios ADD COLUMN owner_id INTEGER'),
]

CREATE_TABLES = [
    '''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email VARCHAR NOT NULL UNIQUE,
        password_hash VARCHAR NOT NULL,
        full_name VARCHAR,
        role VARCHAR DEFAULT 'user',
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )''',
    '''CREATE TABLE IF NOT EXISTS workspaces (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name VARCHAR NOT NULL,
        slug VARCHAR NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )''',
    '''CREATE TABLE IF NOT EXISTS plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR NOT NULL UNIQUE,
        monthly_characters INTEGER DEFAULT 0,
        storage_gb INTEGER DEFAULT 0,
        max_projects INTEGER DEFAULT 0,
        api_access INTEGER DEFAULT 0,
        price_cents INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )''',
    '''CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        plan_id INTEGER NOT NULL,
        status VARCHAR DEFAULT 'trial',
        current_period_start DATETIME,
        current_period_end DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(plan_id) REFERENCES plans(id)
    )''',
    '''CREATE TABLE IF NOT EXISTS usage_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        period_yyyy_mm VARCHAR NOT NULL,
        characters_used INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, period_yyyy_mm),
        FOREIGN KEY(user_id) REFERENCES users(id)
    )''',
    '''CREATE TABLE IF NOT EXISTS api_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        key_prefix VARCHAR NOT NULL,
        hashed_key VARCHAR NOT NULL,
        label VARCHAR,
        last_used_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )''',
]


def column_exists(conn, table, column):
    rows = conn.execute(f'PRAGMA table_info({table})').fetchall()
    return any(row[1] == column for row in rows)


def upgrade():
    conn = sqlite3.connect(DB_PATH)
    try:
        for statement in CREATE_TABLES:
            conn.execute(statement)
        for table, column, statement in ALTERS:
            if not column_exists(conn, table, column):
                conn.execute(statement)
        conn.commit()
        print('production schema migration completed')
    finally:
        conn.close()


if __name__ == '__main__':
    upgrade()
