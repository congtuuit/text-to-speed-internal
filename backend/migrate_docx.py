import sqlite3

def upgrade():
    try:
        conn = sqlite3.connect('tts_batch.db')
        cursor = conn.cursor()
        cursor.execute("ALTER TABLE batch_jobs ADD COLUMN is_docx_job BOOLEAN DEFAULT 0")
        cursor.execute("ALTER TABLE batch_jobs ADD COLUMN final_output_path VARCHAR")
        conn.commit()
        print("Successfully added docx columns to batch_jobs table.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == '__main__':
    upgrade()
