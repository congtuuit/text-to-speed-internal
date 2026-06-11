import sqlite3

def upgrade():
    try:
        conn = sqlite3.connect('tts_batch.db')
        cursor = conn.cursor()
        # Add column model_name
        cursor.execute("ALTER TABLE batch_jobs ADD COLUMN model_name VARCHAR DEFAULT 'gemini-2.5-flash-preview-tts'")
        conn.commit()
        print("Successfully added model_name column to batch_jobs table.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("Column model_name already exists.")
        else:
            print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == '__main__':
    upgrade()
