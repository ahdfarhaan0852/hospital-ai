import os
import pandas as pd
from database import DatabaseManager
from recommendation import MenuRecommender
from clinical_rules import ClinicalRuleEngine

def seed_all():
    print("=== SEEDING DATABASE ===")
    db = DatabaseManager()
    
    # 1. Clean and Seed Menus
    recommender = MenuRecommender()
    print("Pre-cleaning menu dataset...")
    recommender.train_and_save()  # This will clean and save models/data
    
    df_clean = recommender.menu_data
    menu_records = df_clean.to_dict(orient="records")
    print(f"Seeding {len(menu_records)} menu items into database...")
    db.seed_menus(menu_records)
    
    # 2. Seed Users
    users_to_seed = [
        {
            "id": "usr-doc", 
            "nama": "dr. Budi Setiawan Sp.PD", 
            "email": "doctor@hospital.com", 
            "role": "doctor",
            "password": "scrypt:32768:8:1$RnWIrcqlkKSiVgUA$fe8de003d3e2a6326f4c80288b61b3b8e8b9b581f28bb43a7b777eb86bc8c3aaf8b8ebb142a75b804b9268dae8a84b29b848f71542a1875d6103f5666eb9033e",
            "status_konfirmasi": True
        },
        {
            "id": "usr-nutri", 
            "nama": "Rina Kartika S.Gz", 
            "email": "nutritionist@hospital.com", 
            "role": "nutritionist",
            "password": "scrypt:32768:8:1$RnWIrcqlkKSiVgUA$fe8de003d3e2a6326f4c80288b61b3b8e8b9b581f28bb43a7b777eb86bc8c3aaf8b8ebb142a75b804b9268dae8a84b29b848f71542a1875d6103f5666eb9033e",
            "status_konfirmasi": True
        },
        {
            "id": "usr-order", 
            "nama": "Ani Rahmawati", 
            "email": "order_taker@hospital.com", 
            "role": "order_taker",
            "password": "scrypt:32768:8:1$RnWIrcqlkKSiVgUA$fe8de003d3e2a6326f4c80288b61b3b8e8b9b581f28bb43a7b777eb86bc8c3aaf8b8ebb142a75b804b9268dae8a84b29b848f71542a1875d6103f5666eb9033e",
            "status_konfirmasi": True
        },
        {
            "id": "usr-vendor1", 
            "nama": "GDSK Catering - Dapur Utama RSPC", 
            "email": "vendor1@hospital.com", 
            "role": "vendor", 
            "vendor_id": "V001",
            "password": "scrypt:32768:8:1$RnWIrcqlkKSiVgUA$fe8de003d3e2a6326f4c80288b61b3b8e8b9b581f28bb43a7b777eb86bc8c3aaf8b8ebb142a75b804b9268dae8a84b29b848f71542a1875d6103f5666eb9033e",
            "status_konfirmasi": True
        },
        {
            "id": "usr-admin", 
            "nama": "System Admin", 
            "email": "admin@hospital.com", 
            "role": "admin",
            "password": "scrypt:32768:8:1$8JdkwEmhaJSHtkU1$bd12aecba511ca87a5bbfb7383fa7b84c3ff8c94ce390ffbff7622c30cdb7f658491d779bb15711904a83e950783ed23eaf9f187c351026821e4abd5d8cd2dbf",
            "status_konfirmasi": True
        }
    ]
    
    # Local fallback writes all at once, Supabase inserts individually or upserts
    if db.use_supabase:
        # Clear existing users
        try:
            db.supabase_client.table("users").delete().neq("id", "-1").execute()
            db.supabase_client.table("users").insert(users_to_seed).execute()
            print("Users seeded to Supabase.")
        except Exception as e:
            print(f"Failed to seed users to Supabase: {e}")
    else:
        db._write_local("users", users_to_seed)
        print("Local users seeded successfully.")
        
    # 3. Seed Patients (and map their initial diagnoses)
    rule_engine = ClinicalRuleEngine()
    patients_to_seed = [
        {
            "id": "pat-1", "mrn": "MRN-2026-0001", "nama": "Budi Santoso", "umur": 54,
            "room_id": "Kamar Melati 301", "diagnosa": "Hipertensi", "berat_badan": 70.0,
            "tingkat_aktivitas": "sedang", "jenis_kelamin": "Laki-laki"
        },
        {
            "id": "pat-2", "mrn": "MRN-2026-0002", "nama": "Siti Aminah", "umur": 62,
            "room_id": "Kamar Mawar 101", "diagnosa": "Diabetes Mellitus Tipe 2", "berat_badan": 60.0,
            "tingkat_aktivitas": "sedentary", "jenis_kelamin": "Perempuan"
        },
        {
            "id": "pat-3", "mrn": "MRN-2026-0003", "nama": "Rudi Wijaya", "umur": 45,
            "room_id": "Kamar Dahlia 201", "diagnosa": "Gastritis Kronis", "berat_badan": 75.0,
            "tingkat_aktivitas": "sedang", "jenis_kelamin": "Laki-laki"
        },
        {
            "id": "pat-4", "mrn": "MRN-2026-0004", "nama": "Hendro Wibowo", "umur": 58,
            "room_id": "Kamar Anggrek 401", "diagnosa": "Penyakit Jantung Koroner", "berat_badan": 80.0,
            "tingkat_aktivitas": "sedentary", "jenis_kelamin": "Laki-laki"
        },
        {
            "id": "pat-5", "mrn": "MRN-2026-0005", "nama": "Dewi Lestari", "umur": 35,
            "room_id": "Kamar Mawar 102", "diagnosa": "Dislipidemia", "berat_badan": 55.0,
            "tingkat_aktivitas": "sedang", "jenis_kelamin": "Perempuan"
        },
        {
            "id": "pat-6", "mrn": "MRN-2026-0006", "nama": "Ahmad Fauzi", "umur": 50,
            "room_id": "Kamar Melati 302", "diagnosa": "CKD Stadium 5", "berat_badan": 68.0,
            "tingkat_aktivitas": "sedentary", "jenis_kelamin": "Laki-laki"
        },
        {
            "id": "pat-7", "mrn": "MRN-2026-0007", "nama": "Larasati Putri", "umur": 28,
            "room_id": "Kamar Dahlia 202", "diagnosa": "Diare Akut", "berat_badan": 48.0,
            "tingkat_aktivitas": "sedang", "jenis_kelamin": "Perempuan"
        },
        {
            "id": "pat-8", "mrn": "MRN-2026-0008", "nama": "Bambang Pamungkas", "umur": 40,
            "room_id": "Kamar Anggrek 402", "diagnosa": "Pasca Operasi Minor", "berat_badan": 72.0,
            "tingkat_aktivitas": "sedang", "jenis_kelamin": "Laki-laki"
        },
        {
            "id": "pat-9", "mrn": "MRN-2026-0009", "nama": "Suhartono", "umur": 65,
            "room_id": "Kamar Melati 303", "diagnosa": "Hiperurisemia", "berat_badan": 78.0,
            "tingkat_aktivitas": "sedentary", "jenis_kelamin": "Laki-laki"
        },
        {
            "id": "pat-10", "mrn": "MRN-2026-0010", "nama": "Kartini", "umur": 48,
            "room_id": "Kamar Flamboyan 501", "diagnosa": "Obesitas", "berat_badan": 95.0,
            "tingkat_aktivitas": "sedentary", "jenis_kelamin": "Perempuan"
        },
        {
            "id": "pat-11", "mrn": "MRN-2026-0011", "nama": "Joko Widodo", "umur": 60,
            "room_id": "Kamar Flamboyan 502", "diagnosa": "Sirosis Hepatis", "berat_badan": 65.0,
            "tingkat_aktivitas": "sedentary", "jenis_kelamin": "Laki-laki"
        },
        {
            "id": "pat-12", "mrn": "MRN-2026-0012", "nama": "Megawati", "umur": 70,
            "room_id": "Kamar Mawar 103", "diagnosa": "Gagal Jantung Kongestif", "berat_badan": 62.0,
            "tingkat_aktivitas": "sedentary", "jenis_kelamin": "Perempuan"
        },
        {
            "id": "pat-13", "mrn": "MRN-2026-0013", "nama": "Susilo", "umur": 55,
            "room_id": "Kamar Dahlia 203", "diagnosa": "Pneumonia", "berat_badan": 70.0,
            "tingkat_aktivitas": "sedang", "jenis_kelamin": "Laki-laki"
        },
        {
            "id": "pat-14", "mrn": "MRN-2026-0014", "nama": "Anies Baswedan", "umur": 52,
            "room_id": "Kamar Melati 304", "diagnosa": "Stroke dengan Disfagia", "berat_badan": 74.0,
            "tingkat_aktivitas": "sedentary", "jenis_kelamin": "Laki-laki"
        },
        {
            "id": "pat-15", "mrn": "MRN-2026-0015", "nama": "Ganjar Pranowo", "umur": 53,
            "room_id": "Kamar Anggrek 403", "diagnosa": "Hiperkolesterolemia", "berat_badan": 76.0,
            "tingkat_aktivitas": "sedang", "jenis_kelamin": "Laki-laki"
        },
        {
            "id": "pat-16", "mrn": "MRN-2026-0016", "nama": "Prabowo Subianto", "umur": 72,
            "room_id": "Kamar VIP 601", "diagnosa": "Intoleransi Laktosa", "berat_badan": 85.0,
            "tingkat_aktivitas": "sedentary", "jenis_kelamin": "Laki-laki"
        },
        {
            "id": "pat-17", "mrn": "MRN-2026-0017", "nama": "Puan Maharani", "umur": 49,
            "room_id": "Kamar Mawar 104", "diagnosa": "GERD", "berat_badan": 58.0,
            "tingkat_aktivitas": "sedang", "jenis_kelamin": "Perempuan"
        },
        {
            "id": "pat-18", "mrn": "MRN-2026-0018", "nama": "Muhaimin Iskandar", "umur": 47,
            "room_id": "Kamar Dahlia 204", "diagnosa": "Anemia Defisiensi Besi", "berat_badan": 69.0,
            "tingkat_aktivitas": "sedang", "jenis_kelamin": "Laki-laki"
        },
        {
            "id": "pat-19", "mrn": "MRN-2026-0019", "nama": "Erick Thohir", "umur": 51,
            "room_id": "Kamar Anggrek 404", "diagnosa": "Hepatitis Akut", "berat_badan": 78.0,
            "tingkat_aktivitas": "sedentary", "jenis_kelamin": "Laki-laki"
        },
        {
            "id": "pat-20", "mrn": "MRN-2026-0020", "nama": "Sri Mulyani", "umur": 59,
            "room_id": "Kamar VIP 602", "diagnosa": "Malnutrisi Ringan", "berat_badan": 52.0,
            "tingkat_aktivitas": "sedang", "jenis_kelamin": "Perempuan"
        }
    ]
    
    final_patients = []
    for p in patients_to_seed:
        # Run Clinical Rule Engine mapping with full demographics
        mapped_diet = rule_engine.map_diagnosis(
            p["diagnosa"],
            umur=p["umur"],
            berat_badan=p["berat_badan"],
            tingkat_aktivitas=p["tingkat_aktivitas"],
            jenis_kelamin=p["jenis_kelamin"]
        )
        p["diet"] = mapped_diet["jenis_diet"]
        p["kalori_target"] = mapped_diet["kalori_target_kcal_per_hari"]
        p["protein_target"] = mapped_diet["protein_target_g"]
        p["lemak_target"] = mapped_diet["lemak_target_g"]
        p["karbohidrat_target"] = mapped_diet["karbohidrat_target_g"]
        p["pantangan"] = mapped_diet["pantangan_makanan"]
        p["catatan_klinis"] = mapped_diet["catatan_klinis"]
        p["created_at"] = "2026-06-08T09:00:00Z"
        final_patients.append(p)
        
    if db.use_supabase:
        try:
            db.supabase_client.table("patients").delete().neq("id", "-1").execute()
            db.supabase_client.table("patients").insert(final_patients).execute()
            print("Patients seeded to Supabase.")
        except Exception as e:
            print(f"Failed to seed patients to Supabase: {e}")
    else:
        db._write_local("patients", final_patients)
        print("Local patients seeded successfully.")
        
    # 4. Seed Orders
    # Clear orders to have a fresh state
    if db.use_supabase:
        try:
            db.supabase_client.table("orders").delete().neq("id", "-1").execute()
            print("Supabase orders cleared.")
        except Exception as e:
            print(f"Failed to clear orders on Supabase: {e}")
    else:
        db._write_local("orders", [])
        print("Local orders table initialized to empty.")
        
    print("=== SEEDING COMPLETED SUCCESSFULLY ===")

if __name__ == "__main__":
    seed_all()
