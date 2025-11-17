import sqlite3

# Connect to database - try both locations
db_paths = ['ancestra.db', 'backend/ancestra.db']

for db_path in db_paths:
    try:
        print(f"\nTrying {db_path}...")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if receipt_settings table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='receipt_settings'")
        if not cursor.fetchone():
            print(f"  ✗ Table 'receipt_settings' does not exist in {db_path}")
            conn.close()
            continue
        
        print(f"  ✓ Found receipt_settings table")

        try:
            # Add qr_code_type column
            cursor.execute('ALTER TABLE receipt_settings ADD COLUMN qr_code_type VARCHAR(10) DEFAULT "text"')
            print("  ✓ Added qr_code_type column")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("  ✓ qr_code_type column already exists")
            else:
                print(f"  ✗ Error adding qr_code_type: {e}")

        try:
            # Add qr_code_content column
            cursor.execute('ALTER TABLE receipt_settings ADD COLUMN qr_code_content TEXT')
            print("  ✓ Added qr_code_content column")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("  ✓ qr_code_content column already exists")
            else:
                print(f"  ✗ Error adding qr_code_content: {e}")

        # Commit changes
        conn.commit()
        conn.close()
        print(f"  ✅ Successfully updated {db_path}")
        
    except Exception as e:
        print(f"  ✗ Error with {db_path}: {e}")

print("\n✅ Database update complete!")
