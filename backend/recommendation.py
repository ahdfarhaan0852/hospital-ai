import os
import pandas as pd
import numpy as np
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler
import joblib

class MenuRecommender:
    def __init__(self, csv_path="data/menu_fix.csv", models_dir="backend/models"):
        self.csv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", csv_path))
        self.models_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", models_dir))
        
        self.model = None
        self.scaler = None
        self.menu_data = None
        
    def clean_dataset(self) -> pd.DataFrame:
        """
        Cleans the menu dataset by mapping categories, extracting ingredients, 
        and approximating clinical nutrition facts based on default recipe rules.
        """
        return self.get_adjusted_menu(None)

    def get_adjusted_menu(self, target_diet: str = None) -> pd.DataFrame:
        """
        Cleans the raw menu_fix.csv file and returns a DataFrame of the menu items 
        with nutrition facts dynamically adjusted for a target therapeutic diet type.
        """
        if not os.path.exists(self.csv_path):
            raise FileNotFoundError(f"Menu CSV file not found at {self.csv_path}")
            
        df = pd.read_csv(self.csv_path, sep=";")
        
        # Clean numeric columns
        for col in ["Kalori", "Protein_g", "Lemak_g", "Karbohidrat_g"]:
            df[col] = df[col].astype(str).str.replace(",", ".").str.replace(" ", "")
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)
            
        df = df.rename(columns={
            "Nama Menu": "nama_menu",
            "Kalori": "kalori_kcal",
            "Protein_g": "protein_g",
            "Lemak_g": "lemak_g",
            "Karbohidrat_g": "karbohidrat_g"
        })
        
        # Standardize jenis_diet mapping
        def map_diet(val):
            val = str(val).lower()
            if "lunak" in val:
                return "Diet Lunak"
            elif "dm" in val or "diabetes" in val:
                return "Diet DM"
            elif "cair" in val:
                return "Diet Cair"
            elif "rendah natrium" in val or "rendah garam" in val:
                return "Diet Rendah Natrium"
            elif "rendah protein" in val:
                return "Diet Rendah Protein"
            elif "tinggi protein" in val:
                return "Diet Tinggi Protein"
            elif "rendah lemak" in val:
                return "Diet Rendah Lemak"
            elif "rendah kalori" in val:
                return "Diet Rendah Kalori"
            elif "tinggi zat besi" in val:
                return "Diet Tinggi Zat Besi"
            elif "makanan biasa" in val or "biasa" in val:
                return "Diet Makanan Biasa"
            elif "cal" in val:
                return "Diet Lunak"  # Fallback for caloric soft diets like Bubur Ayam
            else:
                return "Diet Makanan Biasa"
                
        df["jenis_diet"] = df["Tipe Diet/Deskripsi"].apply(map_diet)
        
        # Map categories to DB roles: pokok, lauk_utama, lauk_nabati, sayur, dessert
        def map_category(row):
            cat = str(row["Kategori"]).lower()
            name = str(row["nama_menu"]).lower()
            
            # 1. Name-based keyword extraction FIRST (highest priority)
            # Sweets, Cakes, Snacks, and Fruits -> dessert
            dessert_kws = [
                "cantik manis", "ongol-ongol", "hunkwe", "getuk", "sawut", "kelepon", "klepon", 
                "lapis", "biji salak", "putu ayu", "cenil", "bolu", "brownies", "donat", "cake", 
                "puding", "pudding", "mousse", "panna cotta", "pisang", "pepaya", "melon", 
                "semangka", "pir", "apel", "anggur", "cocktail", "salad buah", "fruit salad", 
                "muffin", "pie", "pastry", "lapis singkong", "minuman", "teh", "kopi", "jus", 
                "susu", "milk", "sirup", "water", "air", "degan", "juice", "bubur mutiara",
                "bubur sumsum", "bubur kacang hijau", "crackers", "biskuit", "cookies", "kue",
                "selai", "vanilla cream", "srikaya", "chocolate", "blueberry", "strawberry",
                "bola-bola ubi", "bitter ballen", "bitterballen", "pizza", "singkong thailand",
                "ketimus", "pisak", "mataroda", "mata roda", "talam"
            ]
            if any(kw in name for kw in dessert_kws):
                return "dessert"
                
            # Vegetables and Soups -> sayur
            sayur_kws = [
                "sayur", "cah", "tumis", "salad", "vegetable", "soup", "capcay", "bayam", 
                "kangkung", "buncis", "labu", "wortel", "brokoli", "kembang kol", "gratin", 
                "green beans", "oyong", "tomato mosaic", "daun"
            ]
            if any(kw in name for kw in sayur_kws):
                # But check if it has main protein keywords to classify as lauk_utama (e.g. Rawon, Soto, Tom Yum, Sup Ayam)
                meat_kws = ["ayam", "daging", "sapi", "ikan", "udang", "cumi", "seafood", "bakso", "baso", "rawon", "soto", "goong", "tom yum", "tomyum", "tetelan", "iga"]
                if any(kw in name for kw in meat_kws):
                    return "lauk_utama"
                return "sayur"
                
            # Staple Carbs -> pokok
            pokok_kws = [
                "nasi", "bubur", "kentang", "singkong", "ubi", "mie", "noodle", "pasta", 
                "spaghetti", "macaroni", "bihun", "kwetiaw", "lontong", "bread", "garlic bread", 
                "potatoes", "pure potatoes", "mashed potatoes", "soun"
            ]
            if any(kw in name for kw in pokok_kws):
                return "pokok"
                
            # Main Protein (Animal-based) -> lauk_utama
            lauk_utama_kws = [
                "ayam", "daging", "sapi", "bistik", "rendang", "empal", "bakso", "baso", 
                "beef", "steak", "chicken", "ikan", "gurame", "nila", "kakap", "tenggiri", 
                "patin", "salmon", "tuna", "udang", "cumi", "seafood", "fuyung hai", "fuyunghai", 
                "yakitori", "tongdak", "sosis", "burger", "meatball", "rawon", "soto", "gulai",
                "semur daging", "tom yum", "goong"
            ]
            if any(kw in name for kw in lauk_utama_kws):
                return "lauk_utama"
                
            # Secondary Protein (Plant-based) -> lauk_nabati
            lauk_nabati_kws = ["tahu", "tempe", "kedelai", "soy", "tofu", "bacem", "orekan"]
            if any(kw in name for kw in lauk_nabati_kws):
                return "lauk_nabati"
                
            # 2. Explicit raw category checks (fallback for items not caught by name keywords)
            if "nasi/bubur" in cat:
                return "pokok"
            elif "lauk protein sekunder" in cat:
                return "lauk_nabati"
            elif "lauk protein" in cat:
                return "lauk_utama"
            elif "sayuran" in cat or "sup" in cat:
                return "sayur"
            elif "camilan/dessert" in cat or "buah" in cat or "minuman" in cat:
                return "dessert"
            
            return "pokok"
            
        df["kategori"] = df.apply(map_category, axis=1)
        
        # Assign mock vendor ids cyclically
        vendors = ["V001", "V002", "V003"]
        df["vendor_id"] = [vendors[i % 3] for i in range(len(df))]
        
        # Structured food ingredient/allergen mapping helper
        def extract_ingredients(name):
            name_lower = name.lower()
            ingredients = []
            
            # Protein Hewani / Daging
            if any(kw in name_lower for kw in ["ayam", "chicken", "bebek", "duck"]):
                ingredients.append("ayam")
            if any(kw in name_lower for kw in ["sapi", "daging", "bistik", "rendang", "empal", "baso", "bakso", "beef", "steak", "burger", "bacon", "ham", "pork", "babi", "kambing", "mutton", "lamb"]):
                ingredients.append("daging_sapi")
                ingredients.append("daging")
            if any(kw in name_lower for kw in ["ikan", "fish", "gurame", "nila", "kakap", "tenggiri", "patin", "salmon", "tuna"]):
                ingredients.append("ikan")
            if any(kw in name_lower for kw in ["telur", "egg", "ceplok", "dadar", "puyuh", "omelette", "scrambled"]):
                ingredients.append("telur")
            if any(kw in name_lower for kw in ["udang", "shrimp", "prawn", "lobster"]):
                ingredients.append("udang")
                ingredients.append("seafood")
            if any(kw in name_lower for kw in ["cumi", "squid", "calamari"]):
                ingredients.append("cumi")
                ingredients.append("seafood")
            if any(kw in name_lower for kw in ["kepiting", "crab", "kerang", "shellfish", "seafood"]):
                ingredients.append("seafood")
                
            # Protein Nabati & Allergen Bawaan
            if any(kw in name_lower for kw in ["tahu", "tempe", "kedelai", "soy", "tofu", "bacem", "kecap", "orekan"]):
                ingredients.append("kedelai")
            if any(kw in name_lower for kw in ["kacang", "peanut", "nut", "almond", "cashew", "kemiri"]):
                ingredients.append("kacang")
            if any(kw in name_lower for kw in ["susu", "milk", "keju", "cheese", "cream", "creamy", "panna cotta", "mousse", "butter", "mentega", "yoghurt"]):
                ingredients.append("susu")
            if any(kw in name_lower for kw in ["tepung", "terigu", "flour", "wheat", "gluten", "roti", "bread", "donat", "donut", "brownies", "cake", "mie", "noodle", "bihun", "pasta", "spaghetti", "macaroni", "schotel", "pastry", "pie"]):
                ingredients.append("terigu")
                
            # Sayuran & Buah
            if "bayam" in name_lower:
                ingredients.append("bayam")
            if "wortel" in name_lower:
                ingredients.append("wortel")
            if "kentang" in name_lower:
                ingredients.append("kentang")
            if "pisang" in name_lower:
                ingredients.append("pisang")
            if "pepaya" in name_lower:
                ingredients.append("pepaya")
            if "melon" in name_lower:
                ingredients.append("melon")
            if "semangka" in name_lower:
                ingredients.append("semangka")
            if "jeruk" in name_lower:
                ingredients.append("jeruk")
            if "apel" in name_lower:
                ingredients.append("apel")
            if "pir" in name_lower:
                ingredients.append("pir")
                
            if not ingredients:
                ingredients.append("sayur" if any(kw in name_lower for kw in ["sayur", "cah", "tumis", "salad", "vegetable", "soup"]) else "umum")
                
            return ",".join(ingredients)

        df["bahan_makanan"] = df["nama_menu"].apply(extract_ingredients)
        
        # Final formatting
        df = df.reset_index().rename(columns={"index": "id"})
        df = df[["id", "nama_menu", "jenis_diet", "kalori_kcal", "protein_g", "lemak_g", "karbohidrat_g", "kategori", "vendor_id", "bahan_makanan"]]
        
        # Approximate clinical nutrition facts based on recipe simulation
        def approximate_nutrition(row):
            name = str(row["nama_menu"]).lower()
            cat = str(row["kategori"]).lower()
            # Use the target patient diet if provided, otherwise fall back to the menu item's default diet
            diet = target_diet if target_diet else str(row["jenis_diet"])
            diet_lower = diet.lower()
            
            # 1. Base Macronutrients based on Category
            if cat == "pokok":
                # Staple carbs
                if "nasi" in name:
                    base_prot = 4.5
                    base_fat = 0.5
                    base_carb = 55.0
                    if "goreng" in name:
                        base_prot = 7.0
                        base_fat = 12.0
                        base_carb = 60.0
                    elif "uduk" in name or "kuning" in name:
                        base_prot = 5.0
                        base_fat = 4.0
                        base_carb = 55.0
                elif "bubur" in name or "tim" in name:
                    base_prot = 2.5
                    base_fat = 0.3
                    base_carb = 28.0
                    if "ayam" in name:
                        base_prot = 15.0
                        base_fat = 6.0
                        base_carb = 45.0
                elif "roti" in name:
                    base_prot = 6.0
                    base_fat = 4.0
                    base_carb = 28.0
                elif "kentang" in name:
                    base_prot = 2.0
                    base_fat = 0.2
                    base_carb = 28.0
                    if any(kw in name for kw in ["pure", "mashed", "creamy"]):
                        base_fat = 4.0
                    elif any(kw in name for kw in ["wedges", "croquette", "lyonnaise"]):
                        base_fat = 8.0
                elif "mie" in name or "bihun" in name or "kwetiaw" in name or "spaghetti" in name or "pasta" in name:
                    base_prot = 8.0
                    base_fat = 8.0
                    base_carb = 55.0
                else:
                    base_prot = 3.0
                    base_fat = 1.0
                    base_carb = 30.0
            
            elif cat == "lauk_utama":
                # Animal proteins
                if "ayam" in name or "chicken" in name:
                    base_prot = 20.0
                    base_fat = 9.0
                    base_carb = 0.5
                elif "daging" in name or "sapi" in name or "bistik" in name or "rendang" in name or "rawon" in name:
                    base_prot = 22.0
                    base_fat = 12.0
                    base_carb = 0.5
                elif "ikan" in name or "gurame" in name or "nila" in name or "kakap" in name or "patin" in name or "tenggiri" in name:
                    base_prot = 18.0
                    base_fat = 5.0
                    base_carb = 0.5
                elif "telur" in name:
                    base_prot = 7.0
                    base_fat = 5.0
                    base_carb = 0.5
                elif "udang" in name or "cumi" in name or "seafood" in name or "tom yum" in name:
                    base_prot = 17.0
                    base_fat = 3.0
                    base_carb = 0.5
                else:
                    base_prot = 18.0
                    base_fat = 8.0
                    base_carb = 1.0
                
                # Cooking method fat addition
                if any(kw in name for kw in ["goreng", "bakar", "balado", "rendang", "gulai", "semur", "lapis", "teriyaki"]):
                    base_fat += 6.0
                    if any(kw in name for kw in ["semur", "teriyaki", "manis"]):
                        base_carb += 5.0
                elif any(kw in name for kw in ["kukus", "tim", "rebus", "pepes", "sup", "soto"]):
                    base_fat += 1.0
                    
            elif cat == "lauk_nabati":
                # Plant proteins
                if "tahu" in name:
                    base_prot = 7.0
                    base_fat = 4.0
                    base_carb = 2.5
                elif "tempe" in name:
                    base_prot = 10.0
                    base_fat = 6.0
                    base_carb = 8.0
                else:
                    base_prot = 8.0
                    base_fat = 5.0
                    base_carb = 5.0
                    
                # Cooking fat addition
                if any(kw in name for kw in ["goreng", "bacem", "semur", "balado", "tumis"]):
                    base_fat += 4.0
                    if "bacem" in name or "semur" in name:
                        base_carb += 4.0
                elif any(kw in name for kw in ["kukus", "rebus", "sup"]):
                    base_fat += 0.5
            
            elif cat == "sayur":
                # Vegetables
                base_prot = 1.5
                base_fat = 0.2
                base_carb = 5.0
                if "bayam" in name:
                    base_prot = 2.5
                    base_carb = 4.0
                elif "tomat" in name:
                    base_prot = 1.0
                    base_carb = 4.0
                elif "wortel" in name:
                    base_prot = 1.0
                    base_carb = 7.0
                elif "daun singkong" in name:
                    base_prot = 3.5
                    base_carb = 8.0
                    
                # Sauce/fat addition
                if "gulai" in name:
                    base_fat += 7.0  # Gulai uses coconut milk
                elif any(kw in name for kw in ["cah", "tumis", "goreng"]):
                    base_fat += 3.0
                    base_carb += 1.5
                elif "sup" in name or "soto" in name:
                    base_fat += 1.0
                    
            elif cat == "dessert":
                # Desserts/Fruits/Drinks
                if "buah" in name or any(kw in name for kw in ["pisang", "pepaya", "semangka", "melon", "pir", "apel", "jeruk", "anggur"]):
                    base_prot = 0.8
                    base_fat = 0.1
                    base_carb = 15.0
                    if "pisang" in name:
                        base_prot = 1.2
                        base_carb = 28.0
                    elif "semangka" in name:
                        base_carb = 8.0
                    elif "melon" in name:
                        base_carb = 10.0
                else:
                    # Puddings, Cakes, Drinks
                    base_prot = 3.0
                    base_fat = 6.0
                    base_carb = 25.0
                    if "puding" in name or "mousse" in name or "panna cotta" in name:
                        base_prot = 3.0
                        base_fat = 5.0
                        base_carb = 28.0
                    elif "brownies" in name or "donat" in name:
                        base_prot = 4.0
                        base_fat = 10.0
                        base_carb = 32.0
            else:
                base_prot = 2.0
                base_fat = 2.0
                base_carb = 15.0

            # 2. Base Micronutrients
            sodium = 15.0
            sugar = 0.0
            potassium = 100.0
            fiber = 0.5
            
            # Micronutrient assignment by category
            if cat == "pokok":
                if "nasi" in name:
                    sodium = 2.0
                    sugar = 0.1
                    potassium = 29.0
                    fiber = 0.4
                    if "goreng" in name:
                        sodium = 450.0
                        sugar = 3.5
                    elif "uduk" in name or "kuning" in name:
                        sodium = 120.0
                elif "bubur" in name or "tim" in name:
                    sodium = 1.5
                    potassium = 20.0
                    fiber = 0.3
                    if "ayam" in name:
                        sodium = 350.0
                elif "roti" in name:
                    sodium = 280.0
                    sugar = 6.0
                    potassium = 95.0
                    fiber = 1.5
                elif "kentang" in name:
                    sodium = 6.0
                    sugar = 0.8
                    potassium = 396.0
                    fiber = 2.0
                elif "mie" in name or "bihun" in name:
                    sodium = 380.0
                    sugar = 2.0
                    potassium = 60.0
                    fiber = 1.0
            
            elif cat == "lauk_utama":
                if "ayam" in name:
                    sodium = 75.0
                    potassium = 220.0
                elif "daging" in name or "sapi" in name or "bistik" in name or "rendang" in name:
                    sodium = 65.0
                    potassium = 330.0
                elif "ikan" in name or "gurame" in name or "nila" in name or "kakap" in name:
                    sodium = 60.0
                    potassium = 280.0
                elif "telur" in name:
                    sodium = 140.0
                    potassium = 130.0
                elif "udang" in name or "cumi" in name or "seafood" in name:
                    sodium = 180.0
                    potassium = 250.0
                
                # Add cooking salt standard
                if any(kw in name for kw in ["gulai", "soto", "rawon", "rendang", "semur", "bistik"]):
                    sodium += 400.0  # Standard hospital recipe salt content
                elif any(kw in name for kw in ["goreng", "bakar", "balado"]):
                    sodium += 250.0
                elif any(kw in name for kw in ["kukus", "tim", "rebus", "pepes", "sup"]):
                    sodium += 80.0
                if "asin" in name:
                    sodium += 600.0

            elif cat == "lauk_nabati":
                if "tahu" in name:
                    sodium = 7.0
                    potassium = 120.0
                    fiber = 0.8
                elif "tempe" in name:
                    sodium = 9.0
                    potassium = 230.0
                    fiber = 1.4
                if any(kw in name for kw in ["goreng", "bacem", "semur", "balado", "tumis"]):
                    sodium += 180.0
                    if "bacem" in name or "semur" in name:
                        sugar += 5.0
                elif "kukus" in name or "rebus" in name:
                    sodium += 30.0

            elif cat == "sayur":
                sodium = 15.0
                potassium = 180.0
                fiber = 1.8
                if "bayam" in name:
                    potassium = 460.0
                    fiber = 2.2
                elif "kentang" in name:
                    potassium = 400.0
                    fiber = 1.6
                elif "tomat" in name:
                    potassium = 230.0
                    fiber = 1.2
                elif "wortel" in name:
                    potassium = 320.0
                    fiber = 2.8
                elif "daun singkong" in name:
                    potassium = 350.0
                    fiber = 2.5
                
                if "gulai" in name:
                    sodium += 400.0  # Gulai vegetable is high sodium
                elif "sup" in name or "soto" in name:
                    sodium += 150.0
                elif any(kw in name for kw in ["cah", "tumis", "goreng"]):
                    sodium += 200.0
                    sugar += 1.5
                else:
                    sodium += 40.0

            elif cat == "dessert":
                if "buah" in name or any(kw in name for kw in ["pisang", "pepaya", "semangka", "melon", "pir", "apel", "jeruk", "anggur"]):
                    sodium = 1.0
                    fiber = 1.6
                    if "pisang" in name:
                        potassium = 358.0
                        sugar = 12.0
                        fiber = 2.6
                    elif "pepaya" in name:
                        potassium = 182.0
                        sugar = 8.0
                        fiber = 1.8
                    elif "semangka" in name:
                        potassium = 112.0
                        sugar = 6.0
                        fiber = 0.4
                    elif "melon" in name:
                        potassium = 228.0
                        sugar = 8.0
                        fiber = 0.9
                    elif "pir" in name or "apel" in name:
                        potassium = 116.0
                        sugar = 10.0
                        fiber = 2.4
                    elif "jeruk" in name:
                        potassium = 181.0
                        sugar = 9.0
                        fiber = 1.8
                    elif "anggur" in name:
                        potassium = 191.0
                        sugar = 15.0
                        fiber = 0.9
                else:
                    sodium = 60.0
                    potassium = 90.0
                    sugar = 15.0
                    fiber = 0.5
                    if "puding" in name or "mousse" in name or "panna cotta" in name:
                        sugar = 14.0
                        sodium = 45.0
                    if "brownies" in name or "donat" in name:
                        sugar = 22.0
                        sodium = 180.0
                        fiber = 1.2

            # 3. Therapeutic Diet Capping and Adjustments
            diet_lower = diet.lower()
            
            # A. Low Sodium Adjustment (Rendah Garam / Rendah Natrium)
            if "rendah natrium" in diet_lower or "hipertensi" in diet_lower or "rendah garam" in diet_lower:
                # Standard hospital salt-free recipe sodium ranges 30-60mg
                sodium = min(sodium, 60.0)
                if sodium > 30.0:
                    sodium = 30.0 + (sodium % 30.0) * 0.1 # scaled down
                    
            # B. Diabetic Sugar/Carb Adjustment (Diabetes / DM)
            if "diabetes" in diet_lower or "dm" in diet_lower:
                if cat != "dessert":
                    sugar = 0.0
                    base_carb *= 0.85 # reduce carbs by 15%
                else:
                    # Sugar-free agar puding/sweeteners
                    sugar = min(sugar, 1.5)
                    base_carb *= 0.70
                    
            # C. Low Protein / Kidney Adjustment (Ginjal / Rendah Protein)
            if "rendah protein" in diet_lower or "ginjal" in diet_lower:
                # Cap proteins (reduced serving sizes)
                if cat == "lauk_utama":
                    base_prot = min(base_prot, 10.0)
                elif cat == "lauk_nabati":
                    base_prot = min(base_prot, 4.0)
                elif cat == "pokok":
                    base_prot = min(base_prot, 3.0)
                # Cap potassium (leached/soaked cooking)
                potassium = min(potassium, 150.0)
                
            # D. High Protein Adjustment (TETP / Dialisis)
            if "tinggi protein" in diet_lower or "tetp" in diet_lower or "dialisis" in diet_lower:
                if cat == "lauk_utama":
                    base_prot *= 1.30
                elif cat == "lauk_nabati":
                    base_prot *= 1.30
                    
            # E. Low Fat Adjustment (Rendah Lemak / Lambung)
            if "rendah lemak" in diet_lower or "lambung" in diet_lower or "lunak" in diet_lower:
                # Steamed/cooked fat limits
                base_fat = min(base_fat, 3.0)

            # 4. Align Calories mathematically: 4*Prot + 4*Carb + 9*Fat
            calculated_cal = round((base_prot * 4) + (base_carb * 4) + (base_fat * 9), 1)
            
            return pd.Series([
                calculated_cal, 
                round(base_prot, 1), 
                round(base_fat, 1), 
                round(base_carb, 1), 
                round(sodium, 1), 
                round(sugar, 1), 
                round(potassium, 1), 
                round(fiber, 1)
            ])

        df[["kalori_kcal", "protein_g", "lemak_g", "karbohidrat_g", "sodium_mg", "sugar_g", "potassium_mg", "fiber_g"]] = df.apply(approximate_nutrition, axis=1)
        return df

    def train_and_save(self):
        """
        Runs the full training pipeline: clean dataset, train MinMaxScaler and NearestNeighbors model,
        and saves serialized assets in models/ directory.
        """
        os.makedirs(self.models_dir, exist_ok=True)
        
        df_clean = self.clean_dataset()
        df_clean_path = os.path.join(os.path.dirname(self.csv_path), "menu_clean.csv")
        df_clean.to_csv(df_clean_path, index=False, sep=";")
        print(f"MenuRecommender: Cleaned dataset saved to {df_clean_path}")
        
        # Features for Cosine Similarity
        feature_cols = ["kalori_kcal", "protein_g", "lemak_g", "karbohidrat_g"]
        X = df_clean[feature_cols].values
        
        from sklearn.preprocessing import MinMaxScaler
        scaler = MinMaxScaler()
        X_scaled = scaler.fit_transform(X)
        
        # Save models
        joblib.dump(scaler, os.path.join(self.models_dir, "scaler.pkl"))
        joblib.dump(df_clean, os.path.join(self.models_dir, "menu_data.pkl"))
        print(f"MenuRecommender: Saved models successfully to {self.models_dir}")
        
        self.scaler = scaler
        self.menu_data = df_clean
        
    def load(self):
        """Loads serialized model files."""
        scaler_path = os.path.join(self.models_dir, "scaler.pkl")
        menu_path = os.path.join(self.models_dir, "menu_data.pkl")
        
        if not (os.path.exists(scaler_path) and os.path.exists(menu_path)):
            print("MenuRecommender: Serialized assets not found. Training now...")
            self.train_and_save()
        else:
            self.scaler = joblib.load(scaler_path)
            self.menu_data = joblib.load(menu_path)
            print("MenuRecommender: Models loaded successfully.")

    def recommend(self, jenis_diet: str, target_nutrisi: dict, pantangan: str = "", kategori: str = None, n: int = 5, max_cal: float = None,
                  remaining_prot: float = None, remaining_fat: float = None, remaining_carb: float = None) -> list:
        """
        Recommends menus matching dietary rules, blocking forbidden items,
        filtering by food category, and matching nutritional similarity via Cosine Similarity.
        
        target_nutrisi: dict with keys {"kalori_kcal", "protein_g", "lemak_g", "karbohidrat_g"}
        """
        if self.scaler is None or self.menu_data is None:
            self.load()
            
        df = self.get_adjusted_menu(jenis_diet)
        
        # Filter out items that exceed the maximum allowed calorie budget (if provided)
        if max_cal is not None and max_cal > 0:
            df_cal_filtered = df[df["kalori_kcal"] <= max_cal]
            if not df_cal_filtered.empty:
                df = df_cal_filtered
            else:
                # Fallback: get the lowest calorie items in the dataset
                df = df.sort_values(by="kalori_kcal")
        
        # 1. Clinical Blocking - Filter by diet type
        if jenis_diet and "makanan biasa" not in jenis_diet.lower():
            df_filtered = df[df["jenis_diet"].str.lower() == jenis_diet.lower()]
            if df_filtered.empty:
                df_filtered = df
        else:
            df_filtered = df
            
        # 2. Clinical Blocking - Filter out forbidden ingredients
        expanded_pantangan = set()
        if pantangan and pantangan.lower() != "tidak ada":
            pantangan_list = [p.strip().lower() for p in pantangan.split(",") if p.strip()]
            
            # Cross-language translation and synonym maps for robust blocking
            SYNONYM_MAPS = {
                "daging": ["daging", "daging_sapi", "sapi", "beef", "steak", "lamb", "kambing", "pork", "babi", "meat", "bistik", "rendang", "empal", "burger", "meatball", "bakso", "baso", "sausage", "sosis"],
                "sapi": ["daging_sapi", "sapi", "beef", "steak", "bistik", "rendang", "empal", "burger"],
                "beef": ["daging_sapi", "sapi", "beef", "steak", "bistik", "rendang", "empal", "burger"],
                "ayam": ["ayam", "chicken", "bebek", "duck", "poultry"],
                "chicken": ["ayam", "chicken", "poultry"],
                "seafood": ["seafood", "udang", "shrimp", "prawn", "cumi", "squid", "calamari", "kepiting", "crab", "lobster", "kerang", "fish", "ikan"],
                "udang": ["udang", "shrimp", "prawn", "lobster"],
                "cumi": ["cumi", "squid", "calamari"],
                "ikan": ["ikan", "fish", "gurame", "nila", "kakap", "tenggiri", "patin", "salmon", "tuna"],
                "susu": ["susu", "milk", "keju", "cheese", "cream", "creamy", "butter", "mentega", "dairy", "yoghurt"],
                "keju": ["keju", "cheese"],
                "telur": ["telur", "egg", "omelette", "scrambled"],
                "kacang": ["kacang", "peanut", "nut", "almond", "cashew"],
                "terigu": ["terigu", "flour", "wheat", "roti", "bread", "mie", "noodle", "pasta", "gluten", "spaghetti", "macaroni", "schotel", "pastry", "pie"]
            }
            
            for p in pantangan_list:
                expanded_pantangan.add(p)
                if p in SYNONYM_MAPS:
                    expanded_pantangan.update(SYNONYM_MAPS[p])
                for key, synonyms in SYNONYM_MAPS.items():
                    if p in synonyms:
                        expanded_pantangan.add(key)
                        expanded_pantangan.update(synonyms)
            
            for p in expanded_pantangan:
                def is_safe_item(row):
                    name_lower = str(row["nama_menu"]).lower()
                    ing_list = [i.strip().lower() for i in str(row.get("bahan_makanan", "")).split(",") if i.strip()]
                    if p in name_lower:
                        return False
                    for ing in ing_list:
                        if p in ing or ing in p:
                            return False
                    return True
                df_filtered = df_filtered[df_filtered.apply(is_safe_item, axis=1)]
                
        # 2b. Filter by category
        if kategori:
            df_cat = df_filtered[df_filtered["kategori"].str.lower() == kategori.lower()]
            if df_cat.empty:
                # Fallback: remove diet filter, search category in whole menu
                df_cat = df[df["kategori"].str.lower() == kategori.lower()]
                if expanded_pantangan:
                    for p in expanded_pantangan:
                        def is_safe_item_fallback(row):
                            name_lower = str(row["nama_menu"]).lower()
                            ing_list = [i.strip().lower() for i in str(row.get("bahan_makanan", "")).split(",") if i.strip()]
                            if p in name_lower:
                                return False
                            for ing in ing_list:
                                if p in ing or ing in p:
                                    return False
                            return True
                        df_cat = df_cat[df_cat.apply(is_safe_item_fallback, axis=1)]
            df_filtered = df_cat
            
        # 2c. Clinical Blocking - Strict Micronutrient Limits
        if df_filtered.empty:
            return []
            
        if jenis_diet:
            diet_lower = jenis_diet.lower()
            if "rendah natrium" in diet_lower or "hipertensi" in diet_lower:
                # Block items with sodium > 150mg
                df_filtered = df_filtered[df_filtered["sodium_mg"] <= 150.0]
            if "diabetes" in diet_lower or "dm" in diet_lower:
                # Allow natural fruits (e.g. banana, papaya, melon, apple, etc.) up to 15.0g sugar, keep strict 5.0g for others
                def is_allowed_diabetic_sugar(row):
                    name_lower = str(row["nama_menu"]).lower()
                    is_fruit = any(kw in name_lower for kw in ["buah", "pisang", "pepaya", "semangka", "melon", "pir", "apel", "jeruk", "anggur"])
                    max_sugar = 15.0 if is_fruit else 5.0
                    return row["sugar_g"] <= max_sugar
                df_filtered = df_filtered[df_filtered.apply(is_allowed_diabetic_sugar, axis=1)]
            if "rendah protein" in diet_lower or "gagal ginjal" in diet_lower:
                # Block items with potassium > 250mg
                df_filtered = df_filtered[df_filtered["potassium_mg"] <= 250.0]
                
        # 2d. Clinical Blocking - Dynamic Macronutrient Limits
        is_high_protein_diet = False
        is_restricted_protein_diet = False
        if jenis_diet:
            diet_lower = jenis_diet.lower()
            is_high_protein_diet = "tinggi protein" in diet_lower or "tetp" in diet_lower or "dialisis" in diet_lower
            is_restricted_protein_diet = "rendah protein" in diet_lower or "ginjal" in diet_lower or "sirosis" in diet_lower

        if remaining_prot is not None and remaining_prot >= 0 and not is_high_protein_diet:
            # For restricted diets, we use a tighter buffer of 1.0g. For standard diets, we use 2.0g.
            buffer = 1.0 if is_restricted_protein_diet else 2.0
            floor = 4.0 if is_restricted_protein_diet else 5.0
            limit_val = max(remaining_prot + buffer, floor)
            df_prot_filtered = df_filtered[df_filtered["protein_g"] <= limit_val]
            if not df_prot_filtered.empty:
                df_filtered = df_prot_filtered
                
        if remaining_fat is not None and remaining_fat >= 0:
            df_fat_filtered = df_filtered[df_filtered["lemak_g"] <= max(remaining_fat + 2.0, 5.0)]
            if not df_fat_filtered.empty:
                df_filtered = df_fat_filtered
                
        if remaining_carb is not None and remaining_carb >= 0:
            df_carb_filtered = df_filtered[df_filtered["karbohidrat_g"] <= max(remaining_carb + 10.0, 15.0)]
            if not df_carb_filtered.empty:
                df_filtered = df_carb_filtered

        if df_filtered.empty:
            return []
            
        # 3. Cosine Similarity Matching
        query = np.array([[
            target_nutrisi.get("kalori_kcal", 600),
            target_nutrisi.get("protein_g", 20),
            target_nutrisi.get("lemak_g", 15),
            target_nutrisi.get("karbohidrat_g", 80)
        ]])
        
        # Scale the query and the candidate set
        query_scaled = self.scaler.transform(query)
        
        feature_cols = ["kalori_kcal", "protein_g", "lemak_g", "karbohidrat_g"]
        X_filtered_scaled = self.scaler.transform(df_filtered[feature_cols].values)
        
        # Calculate Cosine Similarity
        # cosine_similarity = (A . B) / (||A|| * ||B||)
        from sklearn.metrics.pairwise import cosine_similarity
        similarities = cosine_similarity(X_filtered_scaled, query_scaled).flatten()
        
        # Sort candidates in descending order of similarity
        top_n = min(n, len(df_filtered))
        top_idx = similarities.argsort()[::-1][:top_n]
        
        hasil = df_filtered.iloc[top_idx].copy()
        raw_similarities = similarities[top_idx]
        
        # Clip similarity scores to be between 0 and 1, rounded
        hasil["similarity_score"] = np.clip(raw_similarities, 0.0, 1.0).round(3)
        
        return hasil.to_dict(orient="records")

if __name__ == "__main__":
    recommender = MenuRecommender()
    recommender.train_and_save()
    
    # Test recommendation
    test_diet = "Diet Rendah Natrium"
    test_target = {"kalori_kcal": 600, "protein_g": 25, "lemak_g": 15, "karbohidrat_g": 80}
    test_pantangan = "garam, bakso"
    
    print("\nTesting recommender:")
    recs = recommender.recommend(test_diet, test_target, test_pantangan, n=5)
    for r in recs:
        print(f"- {r['nama_menu']} ({r['kategori']}): Cal={r['kalori_kcal']}, Sim={r['similarity_score']}")
