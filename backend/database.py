import os
import json
import uuid
from datetime import datetime
import pandas as pd
from dotenv import load_dotenv

# Load environmental variables from .env
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

class DatabaseManager:
    def __init__(self):
        self.supabase_client = None
        self.use_supabase = False
        self.init_error = None
        
        # Check if Supabase variables are set
        if SUPABASE_URL and SUPABASE_KEY and SUPABASE_URL != "YOUR_SUPABASE_URL":
            try:
                from supabase import create_client
                client = create_client(SUPABASE_URL, SUPABASE_KEY)
                # Verify if tables exist by querying the 'users' table
                client.table("users").select("id").limit(1).execute()
                self.supabase_client = client
                self.use_supabase = True
                print("DatabaseManager: Connected to Supabase cloud database successfully.")
            except Exception as e:
                err_msg = str(e)
                self.init_error = err_msg
                if "Could not find the table" in err_msg or "PGRST205" in err_msg:
                    print("DatabaseManager: Connected to Supabase, but required tables are missing. Running in Local JSON fallback mode.")
                    print("--> Action Required: Please run the SQL queries in 'backend/schema.sql' in your Supabase SQL Editor.")
                else:
                    print(f"DatabaseManager: Failed to connect to Supabase ({e}). Running in Local JSON fallback mode.")
                self.use_supabase = False
        else:
            self.init_error = "Supabase credentials not configured (SUPABASE_URL / SUPABASE_KEY are empty or default)"
            print("DatabaseManager: Supabase credentials not configured. Operating in Local JSON fallback mode.")

            
        # Define local db paths
        self.local_db_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "local_db"))
        os.makedirs(self.local_db_dir, exist_ok=True)
        
        self.paths = {
            "users": os.path.join(self.local_db_dir, "users.json"),
            "patients": os.path.join(self.local_db_dir, "patients.json"),
            "orders": os.path.join(self.local_db_dir, "orders.json"),
            "menus": os.path.join(self.local_db_dir, "menus.json"),
            "clinical_rules": os.path.join(self.local_db_dir, "clinical_rules.json")
        }
        
        # Auto-initialize local JSON files if empty
        self.init_local_files()

    def init_local_files(self):
        for table, path in self.paths.items():
            if not os.path.exists(path) or os.path.getsize(path) == 0:
                with open(path, "w", encoding="utf-8") as f:
                    json.dump([], f, indent=4)

    def _read_local(self, table: str) -> list:
        path = self.paths.get(table)
        if not path or not os.path.exists(path):
            return []
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"DatabaseManager: Error reading local JSON table {table} ({e})")
            return []

    def _write_local(self, table: str, data: list):
        path = self.paths.get(table)
        if not path:
            return
        try:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=4)
        except Exception as e:
            print(f"DatabaseManager: Error writing local JSON table {table} ({e})")

    # --- USER ACTIONS ---
    def get_users(self):
        if self.use_supabase:
            try:
                res = self.supabase_client.table("users").select("*").execute()
                data = res.data
                # Verify if 'password' column exists in returned records
                if data and all("password" not in u for u in data):
                    print("DatabaseManager: 'password' column missing in Supabase schema. Falling back to local users.")
                    return self._read_local("users")
                return data
            except Exception as e:
                print(f"DatabaseManager: Failed to get users from Supabase ({e}). Falling back to local.")
        return self._read_local("users")

    def create_user(self, user_data: dict):
        if "id" not in user_data:
            user_data["id"] = str(uuid.uuid4())
            
        # Default status_konfirmasi to False if not specified
        if "status_konfirmasi" not in user_data:
            user_data["status_konfirmasi"] = False
            
        # Hash password if provided
        if "password" in user_data and user_data["password"]:
            pwd = user_data["password"]
            if not (pwd.startswith("scrypt:") or pwd.startswith("pbkdf2:")):
                from werkzeug.security import generate_password_hash
                user_data["password"] = generate_password_hash(pwd)
                
        # Write locally first
        users = self._read_local("users")
        users.append(user_data)
        self._write_local("users", users)
        
        # Sync with Supabase (try/except block)
        if self.use_supabase:
            try:
                self.supabase_client.table("users").insert(user_data).execute()
            except Exception as e:
                print(f"DatabaseManager: Failed to insert user in Supabase ({e}). Local data is saved.")
                
        return user_data

    def confirm_user(self, user_id: str):
        # Local update first
        users = self._read_local("users")
        updated_user = None
        for u in users:
            if u["id"] == user_id:
                u["status_konfirmasi"] = True
                updated_user = u
                self._write_local("users", users)
                break
                
        # Sync with Supabase
        if updated_user and self.use_supabase:
            try:
                self.supabase_client.table("users").update({"status_konfirmasi": True}).eq("id", user_id).execute()
            except Exception as e:
                print(f"DatabaseManager: Failed to confirm user in Supabase ({e}). Local data is updated.")
                
        return updated_user

    def update_user(self, user_id: str, user_data: dict):
        # Hash password if provided in user_data and not already hashed
        if "password" in user_data and user_data["password"]:
            pwd = user_data["password"]
            if not (pwd.startswith("scrypt:") or pwd.startswith("pbkdf2:")):
                from werkzeug.security import generate_password_hash
                user_data["password"] = generate_password_hash(pwd)
                
        # Local update first
        users = self._read_local("users")
        updated_user = None
        for i, u in enumerate(users):
            if u["id"] == user_id:
                users[i] = {**u, **user_data}
                updated_user = users[i]
                self._write_local("users", users)
                break
                
        # Sync with Supabase
        if updated_user and self.use_supabase:
            try:
                self.supabase_client.table("users").update(user_data).eq("id", user_id).execute()
            except Exception as e:
                print(f"DatabaseManager: Failed to update user in Supabase ({e}). Local data is updated.")
                
        return updated_user

    def delete_user(self, user_id: str):
        # Local delete first
        users = self._read_local("users")
        updated_users = [u for u in users if u["id"] != user_id]
        deleted = len(updated_users) < len(users)
        if deleted:
            self._write_local("users", updated_users)
            
        # Sync with Supabase
        if deleted and self.use_supabase:
            try:
                self.supabase_client.table("users").delete().eq("id", user_id).execute()
            except Exception as e:
                print(f"DatabaseManager: Failed to delete user in Supabase ({e}). Local data is deleted.")
                
        return deleted

    # --- PATIENT ACTIONS ---
    def get_patients(self):
        local_patients = self._read_local("patients")
        local_lookup = {p["id"]: p for p in local_patients}
        
        if self.use_supabase:
            try:
                res = self.supabase_client.table("patients").select("*").order("created_at", desc=True).execute()
                data = res.data
                for p in data:
                    if "alergi" not in p:
                        p["alergi"] = ""
                    # Merge local parameters if present
                    if p["id"] in local_lookup:
                        loc = local_lookup[p["id"]]
                        for field in ["berat_badan", "tingkat_aktivitas", "jenis_kelamin"]:
                            if field in loc:
                                p[field] = loc[field]
                return data
            except Exception as e:
                print(f"DatabaseManager: Error getting patients from Supabase ({e}). Falling back to local.")
                
        for p in local_patients:
            if "alergi" not in p:
                p["alergi"] = ""
        return local_patients

    def get_patient_by_id(self, patient_id: str):
        local_patients = self._read_local("patients")
        local_lookup = {p["id"]: p for p in local_patients}
        
        if self.use_supabase:
            try:
                res = self.supabase_client.table("patients").select("*").eq("id", patient_id).execute()
                p = res.data[0] if res.data else None
                if p:
                    if "alergi" not in p:
                        p["alergi"] = ""
                    if p["id"] in local_lookup:
                        loc = local_lookup[p["id"]]
                        for field in ["berat_badan", "tingkat_aktivitas", "jenis_kelamin"]:
                            if field in loc:
                                p[field] = loc[field]
                    return p
            except Exception as e:
                print(f"DatabaseManager: Error getting patient by id from Supabase ({e}).")
        
        for p in local_patients:
            if p["id"] == patient_id:
                if "alergi" not in p:
                    p["alergi"] = ""
                return p
        return None

    def save_patient(self, patient_data: dict):
        """Creates or updates a patient record."""
        original_had_id = "id" in patient_data and patient_data.get("id") is not None
        p_id = patient_data.get("id")
        
        # Determine if insert or update
        is_insert = not (original_had_id and p_id)
        
        if is_insert:
            if "id" not in patient_data or not patient_data["id"]:
                patient_data["id"] = str(uuid.uuid4())
            patient_data["created_at"] = datetime.now().isoformat()
            
        # Write locally first
        patients = self._read_local("patients")
        if not is_insert:
            # Update existing
            for i, p in enumerate(patients):
                if p["id"] == p_id:
                    patients[i] = {**p, **patient_data}
                    patient_data = patients[i]
                    break
            self._write_local("patients", patients)
        else:
            # Insert new
            patients.append(patient_data)
            self._write_local("patients", patients)
            
        # Try to sync with Supabase
        if self.use_supabase:
            p_id_to_sync = patient_data.get("id")
            try:
                # Omit new parameters to prevent Postgres error if columns don't exist
                supabase_payload = patient_data.copy()
                supabase_payload.pop("berat_badan", None)
                supabase_payload.pop("tingkat_aktivitas", None)
                supabase_payload.pop("jenis_kelamin", None)
                
                if not is_insert:
                    self.supabase_client.table("patients").update(supabase_payload).eq("id", p_id_to_sync).execute()
                else:
                    self.supabase_client.table("patients").insert(supabase_payload).execute()
            except Exception as e:
                # If Supabase has not registered the 'alergi' column yet, strip it and retry
                if "alergi" in str(e) or "PGRST204" in str(e):
                    print("DatabaseManager: 'alergi' column missing in Supabase schema. Retrying without it...")
                    patient_data_copy = patient_data.copy()
                    patient_data_copy.pop("alergi", None)
                    patient_data_copy.pop("berat_badan", None)
                    patient_data_copy.pop("tingkat_aktivitas", None)
                    patient_data_copy.pop("jenis_kelamin", None)
                    try:
                        if not is_insert:
                            self.supabase_client.table("patients").update(patient_data_copy).eq("id", p_id_to_sync).execute()
                        else:
                            self.supabase_client.table("patients").insert(patient_data_copy).execute()
                    except Exception as retry_e:
                        print(f"DatabaseManager: Retry also failed ({retry_e}). Local data remains updated.")
                else:
                    print(f"DatabaseManager: Supabase save_patient failed ({e}). Local data is saved.")
                    
        return patient_data

    # --- MENU ACTIONS ---
    def get_menus(self):
        if self.use_supabase:
            res = self.supabase_client.table("menus").select("*").execute()
            return res.data
        return self._read_local("menus")

    def seed_menus(self, menu_list: list):
        if self.use_supabase:
            # Clean records to only keep standard columns to avoid schema mismatch crashes on remote database
            standard_keys = ["id", "nama_menu", "jenis_diet", "kalori_kcal", "protein_g", "lemak_g", "karbohidrat_g", "kategori", "vendor_id"]
            cleaned_list = []
            for item in menu_list:
                cleaned_item = {k: item[k] for k in standard_keys if k in item}
                cleaned_list.append(cleaned_item)
            try:
                # Bulk upsert/insert menus
                self.supabase_client.table("menus").delete().neq("id", "-1").execute() # Clear table
                res = self.supabase_client.table("menus").insert(cleaned_list).execute()
                return res.data
            except Exception as e:
                print(f"DatabaseManager: Failed to seed menus to Supabase ({e}). Seeding locally only.")
        
        self._write_local("menus", menu_list)
        return menu_list

    # --- ORDER ACTIONS ---
    def get_orders(self):
        if self.use_supabase:
            res = self.supabase_client.table("orders").select("*, patients(nama, mrn, room_id)").order("tanggal", desc=True).execute()
            return res.data
            
        orders = self._read_local("orders")
        patients = self._read_local("patients")
        p_dict = {p["id"]: p for p in patients}
        
        # Inject patient details
        for o in orders:
            p_info = p_dict.get(o["patient_id"], {})
            o["patient_name"] = p_info.get("nama", "Unknown")
            o["patient_mrn"] = p_info.get("mrn", "-")
            o["patient_room"] = p_info.get("room_id", "-")
            
        return orders

    def create_order(self, order_data: dict):
        """
        Creates a patient order:
        order_data format:
        {
          "patient_id": "...",
          "items": {
             "sarapan": {"pokok": {...}, "lauk_utama": {...}},
             "makan_siang": {...},
             "makan_malam": {...}
          },
          "status": "Pending",  # Pending -> Approved (Ahli Gizi) -> Diproses (Vendor) -> Dikirim -> Diterima
          "tanggal": "2026-06-08"
        }
        """
        if "id" not in order_data or not order_data["id"]:
            order_data["id"] = str(uuid.uuid4())
        if "created_at" not in order_data:
            order_data["created_at"] = datetime.now().isoformat()
            
        # Write locally first
        orders = self._read_local("orders")
        orders.append(order_data)
        self._write_local("orders", orders)
        
        # Sync with Supabase
        if self.use_supabase:
            try:
                self.supabase_client.table("orders").insert(order_data).execute()
            except Exception as e:
                print(f"DatabaseManager: Failed to insert order in Supabase ({e}). Local data is saved.")
        
        # Return with patient details injected
        patients = self._read_local("patients")
        for p in patients:
            if p["id"] == order_data["patient_id"]:
                order_data["patient_name"] = p.get("nama")
                order_data["patient_mrn"] = p.get("mrn")
                order_data["patient_room"] = p.get("room_id")
                break
        return order_data

    def update_order_items(self, order_id: str, items: dict):
        # Local update first
        orders = self._read_local("orders")
        updated_order = None
        for o in orders:
            if o["id"] == order_id:
                o["items"] = items
                o["status"] = "Pending"
                o["updated_at"] = datetime.now().isoformat()
                updated_order = o
                self._write_local("orders", orders)
                break
                
        # Sync with Supabase
        if updated_order and self.use_supabase:
            try:
                self.supabase_client.table("orders").update({"items": items, "status": "Pending"}).eq("id", order_id).execute()
            except Exception as e:
                print(f"DatabaseManager: Failed to update order items in Supabase ({e}). Local data is updated.")
                
        return updated_order

    def update_order_status(self, order_id: str, status: str):
        # Local update first
        orders = self._read_local("orders")
        updated_order = None
        for o in orders:
            if o["id"] == order_id:
                o["status"] = status
                o["updated_at"] = datetime.now().isoformat()
                updated_order = o
                self._write_local("orders", orders)
                break
                
        # Sync with Supabase
        if updated_order and self.use_supabase:
            try:
                self.supabase_client.table("orders").update({"status": status}).eq("id", order_id).execute()
            except Exception as e:
                print(f"DatabaseManager: Failed to update order status in Supabase ({e}). Local data is updated.")
                
        return updated_order

if __name__ == "__main__":
    db = DatabaseManager()
    print("DB initialized. Use Supabase:", db.use_supabase)
