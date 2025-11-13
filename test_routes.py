"""Test script to verify employee delete endpoint is registered"""
import sys
sys.path.insert(0, 'h:/python Projects/Smart Business_SME')

from backend.main import app

# List all routes
print("All Employee Routes:")
print("-" * 50)
for route in app.routes:
    if hasattr(route, 'path') and '/employee' in route.path:
        methods = getattr(route, 'methods', set())
        print(f"{route.path:40} {methods}")

print("\nLooking specifically for DELETE route...")
delete_found = False
for route in app.routes:
    if hasattr(route, 'path') and '/employee' in route.path:
        methods = getattr(route, 'methods', set())
        if 'DELETE' in methods:
            print(f"✓ Found: {route.path} - {methods}")
            delete_found = True

if not delete_found:
    print("✗ DELETE endpoint not found!")
else:
    print("\n✓ DELETE endpoint is properly registered!")
