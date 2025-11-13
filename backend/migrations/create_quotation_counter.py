"""
Migration script to create quotation_counter table
"""
import sqlite3
from pathlib import Path

def migrate():
    """Create quotation_counter table"""
    # Database is in the project root
    base_dir = Path(__file__).resolve().parent.parent.parent
    db_path = base_dir / "ancestra.db"
    
    if not db_path.exists():
        print(f"❌ Database not found at {db_path}")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if table already exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='quotation_counter'")
    table_exists = cursor.fetchone()
    
    if not table_exists:
        print("Creating quotation_counter table...")
        cursor.execute("""
            CREATE TABLE quotation_counter (
                id INTEGER PRIMARY KEY,
                counter INTEGER NOT NULL DEFAULT 0
            )
        """)
        # Insert initial record
        cursor.execute("INSERT INTO quotation_counter (id, counter) VALUES (1, 0)")
        conn.commit()
        print("✓ Migration completed successfully!")
    else:
        print("✓ Table quotation_counter already exists, skipping migration.")
    
    conn.close()

if __name__ == "__main__":
    migrate()
