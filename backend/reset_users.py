import sys
import os
from werkzeug.security import generate_password_hash

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import DatabaseManager

def reset_users():
    print("=== RESETTING USERS DATABASE ===")
    db = DatabaseManager()
    
    # 1. Clear existing users in Supabase
    if db.use_supabase:
        print("Clearing users table in Supabase...")
        try:
            res = db.supabase_client.table("users").delete().neq("id", "-1").execute()
            print("Supabase users table cleared successfully.")
        except Exception as e:
            print(f"Error clearing users table in Supabase: {e}")
            sys.exit(1)
    else:
        print("Supabase not active, operating on local JSON only.")
        
    # 2. Clear local JSON users
    print("Clearing local users.json...")
    db._write_local("users", [])
    
    # 3. Create Super Admin user
    password_plain = "adminrspc01"
    hashed_password = generate_password_hash(password_plain)
    
    superadmin_user = {
        "id": "usr-superadmin",
        "nama": "Super Admin RSPC",
        "email": "superadmin@rspc.com",
        "role": "admin",
        "password": hashed_password,
        "status_konfirmasi": True
    }
    
    print(f"Creating super admin: {superadmin_user['email']}...")
    try:
        result = db.create_user(superadmin_user)
        print(f"User created: {result['email']}")
        print("=== DATABASE RESET COMPLETED SUCCESSFULLY ===")
    except Exception as e:
        print(f"Error creating admin user: {e}")
        sys.exit(1)

if __name__ == "__main__":
    reset_users()
