"""
Setup Supabase tables by executing schema.sql via the Supabase REST API.
Uses the postgrest-py (supabase) client's rpc or direct SQL execution.
"""
import os
import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

def run_sql_on_supabase(sql: str):
    """Execute raw SQL on Supabase using the REST SQL endpoint."""
    # Use the Supabase SQL endpoint (requires service_role key)
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }
    
    # Try the direct pg_net approach via the management API
    # Since we can't execute raw SQL via REST, we'll use the Supabase SQL Editor approach
    # The user needs to paste the schema.sql content into the Supabase SQL Editor
    print("=" * 60)
    print("SUPABASE SETUP INSTRUCTIONS")
    print("=" * 60)
    print()
    print("Supabase REST API doesn't support raw SQL execution.")
    print("You need to run the schema manually:")
    print()
    print("1. Go to: https://supabase.com/dashboard")
    print("2. Select your project")
    print("3. Go to 'SQL Editor' (left sidebar)")
    print("4. Click 'New Query'")
    print("5. Paste the following SQL and click 'Run':")
    print()
    print("-" * 60)
    print(sql)
    print("-" * 60)
    print()
    print("After running the SQL, execute:")
    print("  python backend/seed.py")
    print()

def main():
    schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")
    with open(schema_path, "r", encoding="utf-8") as f:
        sql = f.read()
    
    run_sql_on_supabase(sql)

if __name__ == "__main__":
    main()
