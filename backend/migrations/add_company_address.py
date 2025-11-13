"""
Migration script to add company_address field to receipt_settings table
"""
import sqlite3
from pathlib import Path

def migrate():
    """Add company_address column to receipt_settings table"""
    # Database is in the project root
    base_dir = Path(__file__).resolve().parent.parent.parent
    db_path = base_dir / "ancestra.db"
    
    if not db_path.exists():
        print(f"❌ Database not found at {db_path}")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if column already exists
    cursor.execute("PRAGMA table_info(receipt_settings)")
    columns = [row[1] for row in cursor.fetchall()]
    
    if 'company_address' not in columns:
        print("Adding company_address column to receipt_settings table...")
        cursor.execute("""
            ALTER TABLE receipt_settings 
            ADD COLUMN company_address TEXT
        """)
        conn.commit()
        print("✓ Migration completed successfully!")
    else:
        print("✓ Column company_address already exists, skipping migration.")
    
    conn.close()

if __name__ == "__main__":
    migrate()
