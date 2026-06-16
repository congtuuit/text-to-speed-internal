import sqlite3

def upgrade():
    try:
        conn = sqlite3.connect('tts_batch.db')
        cursor = conn.cursor()
        cursor.execute("ALTER TABLE saved_voices ADD COLUMN reference_audio_path VARCHAR")
        conn.commit()
        print("Successfully added reference_audio_path column to saved_voices table.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("Column reference_audio_path already exists.")
        else:
            print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == '__main__':
    upgrade()
