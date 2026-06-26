"""
migrate_user_activity.py
------------------
Run this script to add last_login_at and last_active_at columns to the users table.
Usage:
    python backend/migrate_user_activity.py
"""
import os
import sys
import sqlite3

# Set CWD
backend_dir = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(backend_dir, "tts_batch.db")

print(f"Connecting to database at: {db_path}...")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get existing columns in the 'users' table
cursor.execute("PRAGMA table_info(users)")
columns = [row[1] for row in cursor.fetchall()]

print(f"Existing columns in 'users': {columns}")

# Add last_login_at
if "last_login_at" not in columns:
    print("Adding column 'last_login_at' to 'users' table...")
    cursor.execute("ALTER TABLE users ADD COLUMN last_login_at DATETIME")
    conn.commit()
else:
    print("Column 'last_login_at' already exists.")

# Add last_active_at
if "last_active_at" not in columns:
    print("Adding column 'last_active_at' to 'users' table...")
    cursor.execute("ALTER TABLE users ADD COLUMN last_active_at DATETIME")
    conn.commit()
else:
    print("Column 'last_active_at' already exists.")

conn.close()
print("Migration completed successfully!")
