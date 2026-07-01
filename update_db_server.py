import os
import sqlite3

def migrate():
    # Always resolve DB path relative to this script's location
    script_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(script_dir, "backend", "tts_batch.db")
    
    if not os.path.exists(db_path):
        print(f"Warning: Database not found at {db_path}")
    
    print(f"Connecting to database: {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        # Check if expires_at already exists
        cursor.execute("PRAGMA table_info(generated_audios)")
        columns = [row[1] for row in cursor.fetchall()]
        if 'expires_at' not in columns:
            print("Adding 'expires_at' column to 'generated_audios' table...")
            cursor.execute("ALTER TABLE generated_audios ADD COLUMN expires_at TIMESTAMP")
            conn.commit()
            print("Migration successful! Column 'expires_at' added.")
        else:
            print("Migration skipped: 'expires_at' column already exists in 'generated_audios'.")
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        conn.close()

if __name__ == '__main__':
    migrate()
