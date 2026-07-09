from flask import Flask, request, jsonify
# Flask server reload trigger for CDSS models
from flask_cors import CORS
from database import DatabaseManager
from clinical_rules import ClinicalRuleEngine
from recommendation import MenuRecommender
from meal_builder import MealBuilder
import os
from datetime import datetime

app = Flask(__name__)
# Enable CORS for frontend development server (Vite uses 5173 by default)
CORS(app, resources={r"/api/*": {"origins": "*"}})

db = DatabaseManager()
rule_engine = ClinicalRuleEngine("data/diet_mapping.xlsx")
recommender = MenuRecommender()
recommender.load()
meal_builder = MealBuilder(recommender)

@app.route('/', methods=['GET'])
def index():
    return jsonify({
        "message": "AuraBite AI API Server is online!",
        "database": "supabase" if db.use_supabase else "local_json",
        "frontend_url": "http://localhost:5173/",
        "status": "online"
    }), 200

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "online", "database": "supabase" if db.use_supabase else "local_json"}), 200

# --- AUTH ENDPOINTS ---
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json or {}
    nama = data.get("nama", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()
    role = data.get("role", "").strip().lower()
    vendor_id = data.get("vendor_id", None)
    
    if not (nama and email and password and role):
        return jsonify({"success": False, "message": "Semua kolom wajib diisi"}), 400
        
    if role not in ['doctor', 'nutritionist', 'order_taker', 'vendor', 'admin']:
        return jsonify({"success": False, "message": "Role tidak valid"}), 400
        
    # If registering as admin, verify ADMINPOS access code
    if role == 'admin':
        access_code = data.get("access_code", "").strip()
        if access_code != "ADMINPOS":
            return jsonify({"success": False, "message": "Kode akses administrator tidak valid"}), 400

    # Check if user already exists
    users = db.get_users()
    for u in users:
        if u.get("email", "").strip().lower() == email:
            return jsonify({"success": False, "message": "Email sudah terdaftar"}), 400
            
    # Hash password using werkzeug.security
    from werkzeug.security import generate_password_hash
    hashed_password = generate_password_hash(password)
    
    new_user = {
        "nama": nama,
        "email": email,
        "password": hashed_password,
        "role": role,
        "vendor_id": vendor_id,
        "status_konfirmasi": False  # Needs admin confirmation
    }
    
    user = db.create_user(new_user)
    return jsonify({
        "success": True, 
        "message": "Registrasi berhasil! Akun Anda sedang menunggu konfirmasi dari Administrator.",
        "user": {
            "id": user.get("id"),
            "nama": user.get("nama"),
            "email": user.get("email"),
            "role": user.get("role")
        }
    }), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()
    
    if not email or not password:
        return jsonify({"success": False, "message": "Email dan password wajib diisi"}), 400
        
    users = db.get_users()
    matched_user = None
    for u in users:
        if u.get("email", "").strip().lower() == email:
            matched_user = u
            break
            
    if not matched_user:
        return jsonify({"success": False, "message": "Email atau password salah"}), 401
        
    # Verify password
    from werkzeug.security import check_password_hash, generate_password_hash
    stored_password = matched_user.get("password", "")
    
    password_ok = False
    if stored_password.startswith("scrypt:") or stored_password.startswith("pbkdf2:"):
        password_ok = check_password_hash(stored_password, password)
    else:
        # Fallback to plain text comparison (for initial migration or manual database entries)
        password_ok = (stored_password == password)
        if password_ok:
            # Upgrade password to hash automatically
            matched_user["password"] = generate_password_hash(password)
            db.update_user(matched_user["id"], {"password": matched_user["password"]})
            
    if not password_ok:
        return jsonify({"success": False, "message": "Email atau password salah"}), 401
        
    # If the user is admin, we also verify the password/access code is ADMINPOS
    if matched_user.get("role") == "admin":
        access_code = data.get("access_code", "").strip()
        if access_code and access_code != "ADMINPOS":
            return jsonify({"success": False, "message": "Kode akses administrator tidak valid"}), 403
            
    # Check confirmation status
    if not matched_user.get("status_konfirmasi", False):
        return jsonify({
            "success": False, 
            "message": "Akun Anda belum dikonfirmasi oleh Administrator. Silakan hubungi Admin."
        }), 403
        
    return jsonify({
        "success": True, 
        "user": {
            "id": matched_user.get("id"),
            "nama": matched_user.get("nama"),
            "email": matched_user.get("email"),
            "role": matched_user.get("role"),
            "vendor_id": matched_user.get("vendor_id"),
            "status_konfirmasi": matched_user.get("status_konfirmasi")
        }
    }), 200

# --- ADMIN USER MANAGEMENT ROUTES ---
@app.route('/api/admin/users', methods=['GET'])
def admin_get_users():
    users_data = db.get_users()
    clean_users = []
    for u in users_data:
        uc = u.copy()
        uc.pop("password", None)
        clean_users.append(uc)
    return jsonify(clean_users), 200

@app.route('/api/admin/users', methods=['POST'])
def admin_create_user():
    data = request.json or {}
    nama = data.get("nama", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()
    role = data.get("role", "").strip().lower()
    vendor_id = data.get("vendor_id", None)
    
    if not (nama and email and password and role):
        return jsonify({"success": False, "message": "Semua kolom wajib diisi"}), 400
        
    if role == 'admin':
        access_code = data.get("access_code", "").strip()
        if access_code != "ADMINPOS":
            return jsonify({"success": False, "message": "Kode akses administrator tidak valid"}), 400
            
    users = db.get_users()
    for u in users:
        if u.get("email", "").strip().lower() == email:
            return jsonify({"success": False, "message": "Email sudah terdaftar"}), 400
            
    new_user = {
        "nama": nama,
        "email": email,
        "password": password,
        "role": role,
        "vendor_id": vendor_id,
        "status_konfirmasi": True # Admin created users are confirmed immediately
    }
    
    user = db.create_user(new_user)
    return jsonify({
        "success": True,
        "message": "User berhasil dibuat oleh Administrator",
        "user": {
            "id": user.get("id"),
            "nama": user.get("nama"),
            "email": user.get("email"),
            "role": user.get("role")
        }
    }), 201

@app.route('/api/admin/users/<id>/confirm', methods=['POST'])
def admin_confirm_user(id):
    user = db.confirm_user(id)
    if user:
        return jsonify({"success": True, "message": f"User {user.get('nama')} berhasil dikonfirmasi"}), 200
    return jsonify({"success": False, "message": "User tidak ditemukan"}), 404

@app.route('/api/admin/users/<id>', methods=['PUT'])
def admin_update_user(id):
    data = request.json or {}
    update_data = {}
    if "nama" in data: update_data["nama"] = data["nama"].strip()
    if "email" in data: update_data["email"] = data["email"].strip().lower()
    if "role" in data: update_data["role"] = data["role"].strip().lower()
    if "vendor_id" in data: update_data["vendor_id"] = data["vendor_id"]
    if "password" in data and data["password"]: 
        update_data["password"] = data["password"].strip()
    if "status_konfirmasi" in data:
        update_data["status_konfirmasi"] = bool(data["status_konfirmasi"])
        
    user = db.update_user(id, update_data)
    if user:
        return jsonify({"success": True, "message": "User berhasil diperbarui", "user": user}), 200
    return jsonify({"success": False, "message": "User tidak ditemukan"}), 404

@app.route('/api/admin/users/<id>', methods=['DELETE'])
def admin_delete_user(id):
    users = db.get_users()
    target_user = None
    for u in users:
        if u["id"] == id:
            target_user = u
            break
            
    if target_user and target_user.get("email") == "admin@hospital.com":
        return jsonify({"success": False, "message": "Akun administrator utama tidak dapat dihapus!"}), 400
        
    success = db.delete_user(id)
    if success:
        return jsonify({"success": True, "message": "User berhasil dihapus"}), 200
    return jsonify({"success": False, "message": "User tidak ditemukan"}), 404

# --- PATIENTS ENDPOINTS ---
@app.route('/api/patients', methods=['GET'])
def get_patients():
    patients = db.get_patients()
    return jsonify(patients), 200

@app.route('/api/patients', methods=['POST'])
def create_patient():
    data = request.json
    nama = data.get("nama")
    mrn = data.get("mrn")
    umur = data.get("umur")
    room_id = data.get("room_id")
    diagnosa = data.get("diagnosa", "Umum")
    alergi = data.get("alergi", "").strip()
    
    # New personalization parameters
    berat_badan = data.get("berat_badan", None)
    tingkat_aktivitas = data.get("tingkat_aktivitas", "sedentary")
    jenis_kelamin = data.get("jenis_kelamin", "Laki-laki")
    
    if not (nama and mrn and umur and room_id):
        return jsonify({"success": False, "message": "Missing required fields"}), 400
        
    # Process with Clinical Rule Engine
    mapped = rule_engine.map_diagnosis(
        diagnosa, 
        umur=umur, 
        berat_badan=berat_badan, 
        tingkat_aktivitas=tingkat_aktivitas, 
        jenis_kelamin=jenis_kelamin
    )
    
    # Combine allergy and mapped clinical restrictions
    rule_pantangan = mapped["pantangan_makanan"]
    if alergi and alergi.lower() != "tidak ada":
        combined_pantangan = f"{rule_pantangan}, {alergi}" if rule_pantangan and rule_pantangan.lower() != "tidak ada" else alergi
    else:
        combined_pantangan = rule_pantangan
    
    patient_record = {
        "nama": nama,
        "mrn": mrn,
        "umur": int(umur),
        "room_id": room_id,
        "diagnosa": diagnosa,
        "alergi": alergi,
        "berat_badan": berat_badan,
        "tingkat_aktivitas": tingkat_aktivitas,
        "jenis_kelamin": jenis_kelamin,
        "diet": mapped["jenis_diet"],
        "kalori_target": mapped["kalori_target_kcal_per_hari"],
        "protein_target": mapped["protein_target_g"],
        "lemak_target": mapped["lemak_target_g"],
        "karbohidrat_target": mapped["karbohidrat_target_g"],
        "pantangan": combined_pantangan,
        "catatan_klinis": mapped["catatan_klinis"]
    }
    
    result = db.save_patient(patient_record)
    return jsonify({"success": True, "patient": result}), 201

@app.route('/api/patients/<id>', methods=['PUT'])
def update_patient(id):
    data = request.json
    patient = db.get_patient_by_id(id)
    if not patient:
        return jsonify({"success": False, "message": "Patient not found"}), 404
        
    # Recalculate rules if diagnosa, alergi, or other personal parameters are updated
    diagnosa = data.get("diagnosa", patient.get("diagnosa"))
    alergi = data.get("alergi", patient.get("alergi", ""))
    umur = data.get("umur", patient.get("umur", 30))
    berat_badan = data.get("berat_badan", patient.get("berat_badan", None))
    tingkat_aktivitas = data.get("tingkat_aktivitas", patient.get("tingkat_aktivitas", "sedentary"))
    jenis_kelamin = data.get("jenis_kelamin", patient.get("jenis_kelamin", "Laki-laki"))
    
    if "diagnosa" in data or "alergi" in data or "umur" in data or "berat_badan" in data or "tingkat_aktivitas" in data or "jenis_kelamin" in data:
        mapped = rule_engine.map_diagnosis(
            diagnosa, 
            umur=umur, 
            berat_badan=berat_badan, 
            tingkat_aktivitas=tingkat_aktivitas, 
            jenis_kelamin=jenis_kelamin
        )
        patient["diagnosa"] = diagnosa
        patient["alergi"] = alergi
        patient["berat_badan"] = berat_badan
        patient["tingkat_aktivitas"] = tingkat_aktivitas
        patient["jenis_kelamin"] = jenis_kelamin
        patient["diet"] = mapped["jenis_diet"]
        patient["kalori_target"] = mapped["kalori_target_kcal_per_hari"]
        patient["protein_target"] = mapped["protein_target_g"]
        patient["lemak_target"] = mapped["lemak_target_g"]
        patient["karbohidrat_target"] = mapped["karbohidrat_target_g"]
        patient["catatan_klinis"] = mapped["catatan_klinis"]
        
        # Combine allergy and mapped clinical restrictions
        rule_pantangan = mapped["pantangan_makanan"]
        if alergi and alergi.lower() != "tidak ada":
            combined_pantangan = f"{rule_pantangan}, {alergi}" if rule_pantangan and rule_pantangan.lower() != "tidak ada" else alergi
        else:
            combined_pantangan = rule_pantangan
        patient["pantangan"] = combined_pantangan
        
    # Update other fields
    for field in ["nama", "mrn", "umur", "room_id", "berat_badan", "tingkat_aktivitas", "jenis_kelamin"]:
        if field in data:
            if field == "umur":
                patient[field] = int(data[field])
            elif field == "berat_badan":
                patient[field] = float(data[field]) if data[field] else None
            else:
                patient[field] = data[field]
                
    result = db.save_patient(patient)
    return jsonify({"success": True, "patient": result}), 200

# --- MENUS ENDPOINTS ---
@app.route('/api/menus', methods=['GET'])
def get_menus():
    patient_id = request.args.get("patient_id")
    if patient_id:
        patient = db.get_patient_by_id(patient_id)
        if patient:
            mapped = rule_engine.map_diagnosis(
                patient.get("diagnosa", "Umum"),
                umur=patient.get("umur", 30),
                berat_badan=patient.get("berat_badan"),
                tingkat_aktivitas=patient.get("tingkat_aktivitas", "sedentary"),
                jenis_kelamin=patient.get("jenis_kelamin", "Laki-laki")
            )
            diet_type = mapped["jenis_diet"]
            adjusted_df = recommender.get_adjusted_menu(diet_type)
            menus = adjusted_df.to_dict(orient="records")
            return jsonify(menus), 200
            
    menus = db.get_menus()
    return jsonify(menus), 200

# --- RECOMMENDATION ENDPOINTS ---
@app.route('/api/patients/<id>/recommend', methods=['GET'])
def recommend_for_patient(id):
    patient = db.get_patient_by_id(id)
    if not patient:
        return jsonify({"success": False, "message": "Patient not found"}), 404
        
    # Get parameters
    category = request.args.get("kategori", None)
    n = int(request.args.get("n", 10))
    max_cal = request.args.get("max_cal", None, type=float)
    waktu_makan = request.args.get("waktu_makan", "").strip().lower()
    
    # New remaining budgets parameters
    remaining_prot = request.args.get("remaining_prot", None, type=float)
    remaining_fat = request.args.get("remaining_fat", None, type=float)
    remaining_carb = request.args.get("remaining_carb", None, type=float)
    
    # Category target splits mapping for realistic meal planning
    category_splits = {
        "pokok": {"kalori": 0.35, "protein": 0.15, "lemak": 0.10, "karbohidrat": 0.55},
        "lauk_utama": {"kalori": 0.30, "protein": 0.55, "lemak": 0.45, "karbohidrat": 0.05},
        "lauk_nabati": {"kalori": 0.15, "protein": 0.20, "lemak": 0.20, "karbohidrat": 0.10},
        "sayur": {"kalori": 0.10, "protein": 0.05, "lemak": 0.10, "karbohidrat": 0.15},
        "dessert": {"kalori": 0.10, "protein": 0.05, "lemak": 0.15, "karbohidrat": 0.15}
    }
    
    # Calculate target per single meal (Sarapan: 25%, Makan Siang: 40%, Makan Malam: 35%)
    meal_ratio = 0.35
    if waktu_makan == "sarapan":
        meal_ratio = 0.25
    elif waktu_makan == "makan_siang":
        meal_ratio = 0.40
    elif waktu_makan == "makan_malam":
        meal_ratio = 0.35
        
    meal_cal = patient["kalori_target"] * meal_ratio
    meal_prot = patient["protein_target"] * meal_ratio
    meal_fat = patient["lemak_target"] * meal_ratio
    meal_carb = patient["karbohidrat_target"] * meal_ratio
    
    # Determine diet type for dynamic adjustments
    diet_lower = (patient["diet"] or "").lower()
    is_high_protein_diet = "tinggi protein" in diet_lower or "tetp" in diet_lower or "dialisis" in diet_lower
    
    # If client passed remaining calorie budget, query for it
    query_cal = max_cal if (max_cal is not None and max_cal > 0) else meal_cal
    
    if category and category.lower() in category_splits:
        split = category_splits[category.lower()]
        
        target_cal = min(query_cal, meal_cal * split["kalori"]) if (max_cal is not None and max_cal > 0) else (meal_cal * split["kalori"])
        
        target_prot = meal_prot * split["protein"]
        if remaining_prot is not None and remaining_prot >= 0 and not is_high_protein_diet:
            target_prot = min(target_prot, remaining_prot)
            
        target_fat = meal_fat * split["lemak"]
        if remaining_fat is not None and remaining_fat >= 0:
            target_fat = min(target_fat, remaining_fat)
            
        target_carb = meal_carb * split["karbohidrat"]
        if remaining_carb is not None and remaining_carb >= 0:
            target_carb = min(target_carb, remaining_carb)
            
        target = {
            "kalori_kcal": target_cal,
            "protein_g": target_prot,
            "lemak_g": target_fat,
            "karbohidrat_g": target_carb
        }
    else:
        target = {
            "kalori_kcal": query_cal,
            "protein_g": remaining_prot if (remaining_prot is not None and remaining_prot >= 0) else meal_prot,
            "lemak_g": remaining_fat if (remaining_fat is not None and remaining_fat >= 0) else meal_fat,
            "karbohidrat_g": remaining_carb if (remaining_carb is not None and remaining_carb >= 0) else meal_carb
        }
    
    # Combine allergy and mapped clinical restrictions
    rule_pantangan = patient.get("pantangan", "")
    alergi = patient.get("alergi", "")
    if alergi and alergi.lower() != "tidak ada":
        combined_pantangan = f"{rule_pantangan}, {alergi}" if rule_pantangan and rule_pantangan.lower() != "tidak ada" else alergi
    else:
        combined_pantangan = rule_pantangan
        
    recs = recommender.recommend(
        jenis_diet=patient["diet"],
        target_nutrisi=target,
        pantangan=combined_pantangan,
        kategori=category,
        n=n,
        max_cal=max_cal,
        remaining_prot=remaining_prot,
        remaining_fat=remaining_fat,
        remaining_carb=remaining_carb
    )
    
    return jsonify(recs), 200

# --- INSTANT SERVICE ENDPOINT FOR OTHER SYSTEMS (HIS/EMR Integration) ---
@app.route('/api/ai/recommend-instant', methods=['POST'])
def recommend_instant():
    data = request.json or {}
    nama = data.get("nama", "Pasien Uji Coba").strip()
    mrn = data.get("mrn", "MRN-TEST").strip()
    umur = data.get("umur", 30)
    room_id = data.get("room_id", "Kamar-Test").strip()
    diagnosa = data.get("diagnosa", "Umum").strip()
    alergi = data.get("alergi", "").strip()
    
    # Process clinical rules via ClinicalRuleEngine with personalization
    mapped = rule_engine.map_diagnosis(
        diagnosa, 
        umur=umur, 
        berat_badan=data.get("berat_badan"), 
        tingkat_aktivitas=data.get("tingkat_aktivitas", "sedentary"), 
        jenis_kelamin=data.get("jenis_kelamin", "Laki-laki")
    )
    
    # Combine allergy and mapped clinical restrictions
    rule_pantangan = mapped["pantangan_makanan"]
    if alergi and alergi.lower() != "tidak ada":
        combined_pantangan = f"{rule_pantangan}, {alergi}" if rule_pantangan and rule_pantangan.lower() != "tidak ada" else alergi
    else:
        combined_pantangan = rule_pantangan
        
    daily_targets = {
        "kalori_target_kcal_per_hari": mapped["kalori_target_kcal_per_hari"],
        "protein_target_g": mapped["protein_target_g"],
        "lemak_target_g": mapped["lemak_target_g"],
        "karbohidrat_target_g": mapped["karbohidrat_target_g"]
    }
    
    # 1. Generate full daily meal plan package (Breakfast, Lunch, Dinner) via MealBuilder
    daily_meals = meal_builder.build_daily_meals(
        jenis_diet=mapped["jenis_diet"],
        daily_targets=daily_targets,
        pantangan=combined_pantangan
    )
    
    # 2. Query general recommendations per category for custom selection
    katalog = {}
    categories = ["pokok", "lauk_utama", "lauk_nabati", "sayur", "dessert"]
    category_splits = {
        "pokok": {"kalori": 0.35, "protein": 0.15, "lemak": 0.10, "karbohidrat": 0.55},
        "lauk_utama": {"kalori": 0.30, "protein": 0.55, "lemak": 0.45, "karbohidrat": 0.05},
        "lauk_nabati": {"kalori": 0.15, "protein": 0.20, "lemak": 0.20, "karbohidrat": 0.10},
        "sayur": {"kalori": 0.10, "protein": 0.05, "lemak": 0.10, "karbohidrat": 0.15},
        "dessert": {"kalori": 0.10, "protein": 0.05, "lemak": 0.15, "karbohidrat": 0.15}
    }
    
    # Single meal baseline is 35% of daily target
    meal_cal = daily_targets["kalori_target_kcal_per_hari"] * 0.35
    meal_prot = daily_targets["protein_target_g"] * 0.35
    meal_fat = daily_targets["lemak_target_g"] * 0.35
    meal_carb = daily_targets["karbohidrat_target_g"] * 0.35
    
    for cat in categories:
        split = category_splits[cat]
        cat_target = {
            "kalori_kcal": meal_cal * split["kalori"],
            "protein_g": meal_prot * split["protein"],
            "lemak_g": meal_fat * split["lemak"],
            "karbohidrat_g": meal_carb * split["karbohidrat"]
        }
        recs = recommender.recommend(
            jenis_diet=mapped["jenis_diet"],
            target_nutrisi=cat_target,
            pantangan=combined_pantangan,
            kategori=cat,
            n=5
        )
        katalog[cat] = recs
        
    response_payload = {
        "status": "success",
        "patient_profile": {
            "nama": nama,
            "mrn": mrn,
            "umur": int(umur),
            "room_id": room_id,
            "diagnosa": diagnosa,
            "alergi": alergi,
            "jenis_diet_ditentukan": mapped["jenis_diet"],
            "pantangan_ditemukan": combined_pantangan,
            "catatan_klinis": mapped["catatan_klinis"],
            "target_gizi_harian": daily_targets
        },
        "paket_makan_harian_ai": daily_meals,
        "katalog_rekomendasi_per_kategori": katalog
    }
    
    return jsonify(response_payload), 200

@app.route('/api/patients/<id>/meal-builder', methods=['GET'])
def build_meals_for_patient(id):
    patient = db.get_patient_by_id(id)
    if not patient:
        return jsonify({"success": False, "message": "Patient not found"}), 404
        
    targets = {
        "kalori_target_kcal_per_hari": patient["kalori_target"],
        "protein_target_g": patient["protein_target"],
        "lemak_target_g": patient["lemak_target"],
        "karbohidrat_target_g": patient["karbohidrat_target"]
    }
    
    meals = meal_builder.build_daily_meals(
        jenis_diet=patient["diet"],
        daily_targets=targets,
        pantangan=patient["pantangan"]
    )
    
    return jsonify(meals), 200

# --- ORDERS ENDPOINTS ---
@app.route('/api/orders', methods=['GET'])
def get_orders():
    orders = db.get_orders()
    return jsonify(orders), 200

@app.route('/api/orders', methods=['POST'])
def create_order():
    data = request.json
    patient_id = data.get("patient_id")
    items = data.get("items")
    tanggal = data.get("tanggal", datetime.now().strftime("%Y-%m-%d"))
    
    if not (patient_id and items):
        return jsonify({"success": False, "message": "Patient ID and items are required"}), 400
        
    # Overwrite if order for this patient on this date already exists
    existing_orders = db.get_orders()
    existing_order = None
    for o in existing_orders:
        if o.get("patient_id") == patient_id and o.get("tanggal") == tanggal:
            existing_order = o
            break
            
    if existing_order:
        result = db.update_order_items(existing_order["id"], items)
        return jsonify({"success": True, "order": result}), 200

    order_record = {
        "patient_id": patient_id,
        "items": items,
        "status": "Pending", # Initial status: Pending nutritionist approval
        "tanggal": tanggal
    }
    
    result = db.create_order(order_record)
    return jsonify({"success": True, "order": result}), 201

@app.route('/api/orders/<id>/status', methods=['PUT'])
def update_order_status(id):
    data = request.json
    status = data.get("status")
    
    if not status:
        return jsonify({"success": False, "message": "Status is required"}), 400
        
    valid_statuses = ["Pending", "Approved", "Diproduksi", "Dikirim", "Diterima"]
    if status not in valid_statuses:
        return jsonify({"success": False, "message": f"Invalid status. Choose from: {valid_statuses}"}), 400
        
    result = db.update_order_status(id, status)
    if not result:
        return jsonify({"success": False, "message": "Order not found"}), 404
        
    return jsonify({"success": True, "order": result}), 200

# --- SYSTEM STATS ---
@app.route('/api/stats', methods=['GET'])
def get_stats():
    patients = db.get_patients()
    orders = db.get_orders()
    
    # Calculate stats
    pending_count = sum(1 for o in orders if o["status"] == "Pending")
    approved_count = sum(1 for o in orders if o["status"] == "Approved")
    active_vendor = sum(1 for o in orders if o["status"] in ["Diproduksi", "Dikirim"])
    completed_count = sum(1 for o in orders if o["status"] == "Diterima")
    
    # Diet distribution
    diets = {}
    for p in patients:
        diet = p.get("diet", "Diet Makanan Biasa (Biasa)")
        diets[diet] = diets.get(diet, 0) + 1
        
    # Order statuses
    statuses = {
        "Pending": pending_count,
        "Approved": approved_count,
        "Diproduksi": sum(1 for o in orders if o["status"] == "Diproduksi"),
        "Dikirim": sum(1 for o in orders if o["status"] == "Dikirim"),
        "Diterima": completed_count
    }
    
    patients_with_diagnosis = [p for p in patients if p.get("diagnosa") and p.get("diagnosa").strip() and p.get("diagnosa") != "Umum"]
    
    return jsonify({
        "total_patients": len(patients_with_diagnosis),
        "total_orders": len(orders),
        "pending_orders": pending_count,
        "approved_orders": approved_count,
        "active_vendor_orders": active_vendor,
        "completed_orders": completed_count,
        "diet_distribution": diets,
        "status_distribution": statuses
    }), 200

# --- RETRAIN ENGINE ---
@app.route('/api/ai/retrain', methods=['POST'])
def retrain():
    try:
        recommender.train_and_save()
        recommender.load()
        return jsonify({"success": True, "message": "AI recommendation model retrained and reloaded successfully."}), 200
    except Exception as e:
        return jsonify({"success": False, "message": f"Error retraining model: {e}"}), 500

# --- CLINICAL RECOMMENDATION FOR EXTERNAL SYSTEMS ---
@app.route('/api/ai/recommend-clinical', methods=['POST'])
def recommend_clinical():
    data = request.json or {}
    diagnosa = data.get("diagnosa", "Umum").strip()
    alergi = data.get("alergi", "").strip()
    # Get parameters
    category = data.get("kategori", None)
    waktu_makan = data.get("waktu_makan", "").strip().lower()
    max_cal = data.get("max_cal", None)
    n = data.get("n", 10)
    
    # New remaining budgets parameters
    remaining_prot = data.get("remaining_prot", None)
    remaining_fat = data.get("remaining_fat", None)
    remaining_carb = data.get("remaining_carb", None)
    
    try:
        n = int(n)
    except:
        n = 10
        
    try:
        if max_cal is not None:
            max_cal = float(max_cal)
    except:
        max_cal = None
        
    try:
        if remaining_prot is not None:
            remaining_prot = float(remaining_prot)
    except:
        remaining_prot = None
        
    try:
        if remaining_fat is not None:
            remaining_fat = float(remaining_fat)
    except:
        remaining_fat = None
        
    try:
        if remaining_carb is not None:
            remaining_carb = float(remaining_carb)
    except:
        remaining_carb = None

    # Map clinical rules via ClinicalRuleEngine with personalization
    mapped = rule_engine.map_diagnosis(
        diagnosa,
        umur=data.get("umur", 30),
        berat_badan=data.get("berat_badan"),
        tingkat_aktivitas=data.get("tingkat_aktivitas", "sedentary"),
        jenis_kelamin=data.get("jenis_kelamin", "Laki-laki")
    )
    
    # Combine allergy and mapped clinical restrictions
    rule_pantangan = mapped["pantangan_makanan"]
    if alergi and alergi.lower() != "tidak ada":
        combined_pantangan = f"{rule_pantangan}, {alergi}" if rule_pantangan and rule_pantangan.lower() != "tidak ada" else alergi
    else:
        combined_pantangan = rule_pantangan
        
    daily_targets = {
        "kalori_target_kcal_per_hari": mapped["kalori_target_kcal_per_hari"],
        "protein_target_g": mapped["protein_target_g"],
        "lemak_target_g": mapped["lemak_target_g"],
        "karbohidrat_target_g": mapped["karbohidrat_target_g"]
    }
    
    # Category splits mapping
    category_splits = {
        "pokok": {"kalori": 0.35, "protein": 0.15, "lemak": 0.10, "karbohidrat": 0.55},
        "lauk_utama": {"kalori": 0.30, "protein": 0.55, "lemak": 0.45, "karbohidrat": 0.05},
        "lauk_nabati": {"kalori": 0.15, "protein": 0.20, "lemak": 0.20, "karbohidrat": 0.10},
        "sayur": {"kalori": 0.10, "protein": 0.05, "lemak": 0.10, "karbohidrat": 0.15},
        "dessert": {"kalori": 0.10, "protein": 0.05, "lemak": 0.15, "karbohidrat": 0.15}
    }
    
    meal_ratio = 0.35
    if waktu_makan == "sarapan":
        meal_ratio = 0.25
    elif waktu_makan == "makan_siang":
        meal_ratio = 0.40
    elif waktu_makan == "makan_malam":
        meal_ratio = 0.35
        
    meal_cal = daily_targets["kalori_target_kcal_per_hari"] * meal_ratio
    meal_prot = daily_targets["protein_target_g"] * meal_ratio
    meal_fat = daily_targets["lemak_target_g"] * meal_ratio
    meal_carb = daily_targets["karbohidrat_target_g"] * meal_ratio
    
    # Determine diet type for dynamic adjustments
    diet_lower = (mapped["jenis_diet"] or "").lower()
    is_high_protein_diet = "tinggi protein" in diet_lower or "tetp" in diet_lower or "dialisis" in diet_lower

    query_cal = max_cal if (max_cal is not None and max_cal > 0) else meal_cal
    
    if category and category.lower() in category_splits:
        split = category_splits[category.lower()]
        
        target_cal = min(query_cal, meal_cal * split["kalori"]) if (max_cal is not None and max_cal > 0) else (meal_cal * split["kalori"])
        
        target_prot = meal_prot * split["protein"]
        if remaining_prot is not None and remaining_prot >= 0 and not is_high_protein_diet:
            target_prot = min(target_prot, remaining_prot)
            
        target_fat = meal_fat * split["lemak"]
        if remaining_fat is not None and remaining_fat >= 0:
            target_fat = min(target_fat, remaining_fat)
            
        target_carb = meal_carb * split["karbohidrat"]
        if remaining_carb is not None and remaining_carb >= 0:
            target_carb = min(target_carb, remaining_carb)
            
        target = {
            "kalori_kcal": target_cal,
            "protein_g": target_prot,
            "lemak_g": target_fat,
            "karbohidrat_g": target_carb
        }
    else:
        target = {
            "kalori_kcal": query_cal,
            "protein_g": remaining_prot if (remaining_prot is not None and remaining_prot >= 0) else meal_prot,
            "lemak_g": remaining_fat if (remaining_fat is not None and remaining_fat >= 0) else meal_fat,
            "karbohidrat_g": remaining_carb if (remaining_carb is not None and remaining_carb >= 0) else meal_carb
        }
        
    recs = recommender.recommend(
        jenis_diet=mapped["jenis_diet"],
        target_nutrisi=target,
        pantangan=combined_pantangan,
        kategori=category,
        n=n,
        max_cal=max_cal,
        remaining_prot=remaining_prot,
        remaining_fat=remaining_fat,
        remaining_carb=remaining_carb
    )
    
    return jsonify(recs), 200

# --- CLINICAL MEAL PLANNER FOR EXTERNAL SYSTEMS ---
@app.route('/api/ai/meal-builder-clinical', methods=['POST'])
def meal_builder_clinical():
    data = request.json or {}
    diagnosa = data.get("diagnosa", "Umum").strip()
    alergi = data.get("alergi", "").strip()
    
    # Process clinical rules with personalization
    mapped = rule_engine.map_diagnosis(
        diagnosa,
        umur=data.get("umur", 30),
        berat_badan=data.get("berat_badan"),
        tingkat_aktivitas=data.get("tingkat_aktivitas", "sedentary"),
        jenis_kelamin=data.get("jenis_kelamin", "Laki-laki")
    )
    
    # Combine allergy and mapped clinical restrictions
    rule_pantangan = mapped["pantangan_makanan"]
    if alergi and alergi.lower() != "tidak ada":
        combined_pantangan = f"{rule_pantangan}, {alergi}" if rule_pantangan and rule_pantangan.lower() != "tidak ada" else alergi
    else:
        combined_pantangan = rule_pantangan
        
    targets = {
        "kalori_target_kcal_per_hari": mapped["kalori_target_kcal_per_hari"],
        "protein_target_g": mapped["protein_target_g"],
        "lemak_target_g": mapped["lemak_target_g"],
        "karbohidrat_target_g": mapped["karbohidrat_target_g"]
    }
    
    meals = meal_builder.build_daily_meals(
        jenis_diet=mapped["jenis_diet"],
        daily_targets=targets,
        pantangan=combined_pantangan
    )
    
    return jsonify(meals), 200

if __name__ == '__main__':
    # Bind to PORT environment variable for production deployment (Render/Railway/etc)
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
