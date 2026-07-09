import pandas as pd
import os

class ClinicalRuleEngine:
    def __init__(self, excel_path="data/diet_mapping.xlsx"):
        self.excel_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", excel_path))
        self.rules = []
        self.load_rules()

    def load_rules(self):
        # Look for CSV first
        csv_path = os.path.abspath(os.path.join(os.path.dirname(self.excel_path), "clinical_rules.csv"))
        try:
            if os.path.exists(csv_path):
                df = pd.read_csv(csv_path)
                records = df.to_dict(orient="records")
                mapped_rules = []
                for r in records:
                    mapped_rules.append({
                        "diagnosa": r.get("diagnosis_name", r.get("diagnosa", "")),
                        "jenis_diet": r.get("diet_type", r.get("jenis_diet", "Diet Makanan Biasa (Biasa)")),
                        "kalori_target_kcal_per_hari": int(r.get("max_calorie", r.get("kalori_target_kcal_per_hari", 2000))),
                        "protein_target_g": int(r.get("max_protein", r.get("protein_target_g", 75))),
                        "lemak_target_g": int(r.get("max_fat", r.get("lemak_target_g", 60))),
                        "karbohidrat_target_g": int(r.get("max_carbohydrate", r.get("karbohidrat_target_g", 290))),
                        "pantangan_makanan": r.get("pantangan_makanan", "Tidak ada"),
                        "catatan_klinis": r.get("catatan_klinis", "")
                    })
                self.rules = mapped_rules
                print(f"ClinicalRuleEngine: Successfully loaded {len(self.rules)} rules from {csv_path}")
            elif os.path.exists(self.excel_path):
                df = pd.read_excel(self.excel_path)
                self.rules = df.to_dict(orient="records")
                print(f"ClinicalRuleEngine: Successfully loaded {len(self.rules)} rules from {self.excel_path}")
            else:
                print(f"ClinicalRuleEngine: Warning - rule files not found. Using default rules.")
                self.rules = self.get_default_rules()
        except Exception as e:
            print(f"ClinicalRuleEngine: Error loading rules ({e}). Using default rules.")
            self.rules = self.get_default_rules()

    def get_default_rules(self):
        return [
            {
                "diagnosa": "Hipertensi",
                "jenis_diet": "Diet Rendah Natrium",
                "kalori_target_kcal_per_hari": 1800,
                "protein_target_g": 70,
                "lemak_target_g": 55,
                "karbohidrat_target_g": 250,
                "pantangan_makanan": "Makanan tinggi garam, makanan olahan, penyedap rasa",
                "catatan_klinis": "Batasi natrium < 1500 mg per hari"
            },
            {
                "diagnosa": "Diabetes Mellitus Tipe 2",
                "jenis_diet": "Diet DM",
                "kalori_target_kcal_per_hari": 1700,
                "protein_target_g": 65,
                "lemak_target_g": 50,
                "karbohidrat_target_g": 230,
                "pantangan_makanan": "Gula sederhana, minuman manis, madu, sirup",
                "catatan_klinis": "Gunakan indeks glikemik rendah dan porsi makan terbagi"
            },
            {
                "diagnosa": "Gastritis",
                "jenis_diet": "Diet Lunak",
                "kalori_target_kcal_per_hari": 1900,
                "protein_target_g": 60,
                "lemak_target_g": 50,
                "karbohidrat_target_g": 280,
                "pantangan_makanan": "Makanan pedas, asam, kopi, soda, makanan bergas",
                "catatan_klinis": "Tekstur lunak mudah dicerna, makan porsi kecil tapi sering"
            }
        ]

    def map_diagnosis(self, diagnosa: str, umur: int = 30, berat_badan: float = None, tingkat_aktivitas: str = "sedentary", jenis_kelamin: str = "Laki-laki") -> dict:
        """
        Maps a diagnosis string to its dietary rules and calculates personalized
        calorie, protein, fat, and carbohydrate targets based on age, weight,
        gender, and physical stress/activity level.
        """
        result = self._map_diagnosis_raw(diagnosa)
        
        # 1. Determine baseline reference weight if not provided
        try:
            umur_val = int(umur)
        except:
            umur_val = 30
            
        try:
            weight = float(berat_badan) if berat_badan and float(berat_badan) > 0 else None
        except:
            weight = None
            
        if not weight:
            if umur_val <= 3:
                weight = 12.0
            elif umur_val <= 6:
                weight = 20.0
            elif umur_val <= 12:
                weight = 35.0
            elif umur_val <= 18:
                weight = 55.0
            else:
                if str(jenis_kelamin).lower() in ["perempuan", "female", "p", "f"]:
                    weight = 55.0
                else:
                    weight = 65.0

        # 2. Determine Kcal/kg factor based on age & activity
        if umur_val <= 3:
            base_kcal_per_kg = 90
        elif umur_val <= 6:
            base_kcal_per_kg = 80
        elif umur_val <= 12:
            base_kcal_per_kg = 60
        elif umur_val <= 18:
            base_kcal_per_kg = 45
        else:
            # Adult sedentary vs active
            act_clean = str(tingkat_aktivitas).lower()
            if "gym" in act_clean or "sangat aktif" in act_clean or "berat" in act_clean or "otot" in act_clean or "active" in act_clean or "aktif" in act_clean:
                base_kcal_per_kg = 35
            elif "moderate" in act_clean or "sedang" in act_clean:
                base_kcal_per_kg = 30
            else:
                base_kcal_per_kg = 25

        # 3. Determine Protein g/kg factor based on age & activity
        if umur_val <= 3:
            base_prot_per_kg = 1.35
        elif umur_val <= 6:
            base_prot_per_kg = 1.25
        elif umur_val <= 12:
            base_prot_per_kg = 1.0
        elif umur_val <= 18:
            base_prot_per_kg = 0.9
        else:
            # Adult protein factor based on activity
            act_clean = str(tingkat_aktivitas).lower()
            if "gym" in act_clean or "sangat aktif" in act_clean or "berat" in act_clean or "otot" in act_clean:
                base_prot_per_kg = 1.9
            elif "active" in act_clean or "aktif" in act_clean or "olahraga" in act_clean or "sedang" in act_clean or "moderate" in act_clean:
                base_prot_per_kg = 1.4
            else:
                base_prot_per_kg = 0.8

        # 4. Modify factors based on matched diet types
        diet_clean = result["jenis_diet"].lower()
        
        # High Protein Diet multiplier
        if "tinggi protein" in diet_clean or "tetp" in diet_clean:
            if umur_val > 18:
                act_clean = str(tingkat_aktivitas).lower()
                if "gym" in act_clean or "sangat aktif" in act_clean or "berat" in act_clean or "otot" in act_clean:
                    prot_factor = 2.2
                elif "active" in act_clean or "aktif" in act_clean or "olahraga" in act_clean or "sedang" in act_clean or "moderate" in act_clean:
                    prot_factor = 1.8
                else:
                    prot_factor = 1.5
            else:
                prot_factor = base_prot_per_kg * 1.5  # Elevated factor for growing children
        # Restricted Kidney Diet
        elif "diet ginjal" in diet_clean and "dialisis" not in diet_clean:
            if umur_val > 18:
                prot_factor = 0.6  # restricted protein (0.6 g/kg)
            else:
                prot_factor = base_prot_per_kg * 0.7
        # Dialysis Kidney Diet
        elif "dialisis" in diet_clean:
            if umur_val > 18:
                prot_factor = 1.2
            else:
                prot_factor = base_prot_per_kg * 1.3
        else:
            prot_factor = base_prot_per_kg

        # Calorie modifiers
        if "rendah kalori" in diet_clean:
            kcal_modifier = 0.75  # 25% caloric deficit
        elif "tinggi kalori" in diet_clean:
            kcal_modifier = 1.35  # 35% calorie surplus
        else:
            kcal_modifier = 1.0

        # 5. Compute absolute personalized target values
        cal = int(weight * base_kcal_per_kg * kcal_modifier)
        prot = int(weight * prot_factor)
        
        # Fat is 25% of calories
        fat = int((cal * 0.25) / 9)
        # Carbohydrates are the remaining calories
        carb = int((cal - (prot * 4) - (fat * 9)) / 4)

        # Update matching result dictionary with calculated values
        result["kalori_target_kcal_per_hari"] = max(cal, 800) # enforce safe minimums
        
        # Enforce safety minimum boundaries based on age
        is_restricted = "diet ginjal" in diet_clean and "dialisis" not in diet_clean
        if is_restricted:
            result["protein_target_g"] = max(prot, 12)
        else:
            if umur_val <= 3:
                result["protein_target_g"] = max(prot, 13)
            elif umur_val <= 6:
                result["protein_target_g"] = max(prot, 19)
            elif umur_val <= 12:
                result["protein_target_g"] = max(prot, 30)
            else:
                result["protein_target_g"] = max(prot, 45)
                
        result["lemak_target_g"] = max(fat, 15)
        result["karbohidrat_target_g"] = max(carb, 50)
        
        # Append details of calculation to clinical notes for visibility
        calc_note = f"Personalized nutrition calculation: based on age {umur_val} yrs, weight {weight} kg, gender {jenis_kelamin}, factor {prot_factor:.2f} g/kg protein."
        if result["catatan_klinis"]:
            result["catatan_klinis"] = f"{result['catatan_klinis']} | {calc_note}"
        else:
            result["catatan_klinis"] = calc_note

        # Check for extreme target thresholds and append warnings if necessary
        warnings = []
        if cal >= 3000:
            warnings.append("Target kalori sangat tinggi (>=3000 kcal). Porsi makanan harus disesuaikan/ditambah manual oleh ahli gizi.")
        elif cal <= 1300:
            warnings.append("Target kalori sangat rendah (<=1300 kcal). Porsi makanan harus disesuaikan/dikurangi manual oleh ahli gizi.")
            
        if result["protein_target_g"] <= 45 and umur_val > 12: # only warn for teenagers/adults
            warnings.append("Batasan protein sangat rendah (<=45g). Mohon awasi dan sesuaikan porsi protein manual oleh ahli gizi.")
            
        if warnings:
            joined_warnings = " • ".join(warnings)
            current_note = result.get("catatan_klinis", "")
            if current_note:
                result["catatan_klinis"] = f"[PERINGATAN KLINIS: {joined_warnings}] | {current_note}"
            else:
                result["catatan_klinis"] = f"[PERINGATAN KLINIS: {joined_warnings}]"
                
        return result

    def _map_diagnosis_raw(self, diagnosa: str) -> dict:
        if not diagnosa:
            return self.get_fallback_rule("Umum")

        import re
        import difflib

        # Normalize spaces and split by common separators: +, comma, semicolon, "dan", "and"
        terms = re.split(r'\+|\bda[mn]\b|;|,', diagnosa, flags=re.IGNORECASE)
        terms = [t.strip() for t in terms if t.strip()]

        matched_rules = []
        matched_ids = set()

        rule_names_lower = {r["diagnosa"].lower(): r for r in self.rules}
        rule_names_list = [r["diagnosa"] for r in self.rules]

        for term in terms:
            term_clean = term.lower()
            term_matched = False

            # 1. Exact Match (case-insensitive)
            if term_clean in rule_names_lower:
                rule = rule_names_lower[term_clean]
                if rule["diagnosa"] not in matched_ids:
                    matched_rules.append(rule)
                    matched_ids.add(rule["diagnosa"])
                continue

            # 2. Substring Match (is rule name in input term, or is input term in rule name?)
            for rule in self.rules:
                r_name = rule["diagnosa"].lower()
                if r_name in term_clean or term_clean in r_name:
                    if rule["diagnosa"] not in matched_ids:
                        matched_rules.append(rule)
                        matched_ids.add(rule["diagnosa"])
                    term_matched = True
                    break
            
            if term_matched:
                continue

            # 3. Fuzzy Match via difflib (cutoff 0.55 for handling typos like "diabtes" -> "Diabetes Mellitus Tipe 2")
            closest = difflib.get_close_matches(term, rule_names_list, n=1, cutoff=0.55)
            if closest:
                matched_name = closest[0]
                rule = rule_names_lower[matched_name.lower()]
                if rule["diagnosa"] not in matched_ids:
                    # Append fuzzy warning note
                    rule_copy = rule.copy()
                    rule_copy["catatan_klinis"] = f"[Pencocokan Otomatis: Dideteksi sebagai {matched_name}] | {rule.get('catatan_klinis', '')}"
                    matched_rules.append(rule_copy)
                    matched_ids.add(rule["diagnosa"])
                continue

        # Process matched rules
        if len(matched_rules) > 1:
            # Combine the rules!
            combined_diet = " + ".join([r["jenis_diet"] for r in matched_rules])
            
            # Nutrition targets: conservative min/average
            combined_cal = min([r["kalori_target_kcal_per_hari"] for r in matched_rules])
            
            has_ckd = any("ckd" in r["diagnosa"].lower() or "ginjal" in r["diagnosa"].lower() for r in matched_rules)
            if has_ckd:
                combined_prot = min([r["protein_target_g"] for r in matched_rules])
            else:
                combined_prot = int(sum([r["protein_target_g"] for r in matched_rules]) / len(matched_rules))

            combined_fat = int(sum([r["lemak_target_g"] for r in matched_rules]) / len(matched_rules))
            combined_carb = int(sum([r["karbohidrat_target_g"] for r in matched_rules]) / len(matched_rules))
            
            # Combine pantangan
            pantangan_set = set()
            for r in matched_rules:
                if r["pantangan_makanan"] and r["pantangan_makanan"].lower() != "tidak ada":
                    for p in r["pantangan_makanan"].split(","):
                        pantangan_set.add(p.strip())
            combined_pantangan = ", ".join(sorted(list(pantangan_set))) if pantangan_set else "Tidak ada"
            
            # Combine notes
            combined_notes = " | ".join([r["catatan_klinis"] for r in matched_rules if r["catatan_klinis"]])
            
            return {
                "diagnosa": diagnosa,
                "jenis_diet": combined_diet,
                "kalori_target_kcal_per_hari": combined_cal,
                "protein_target_g": combined_prot,
                "lemak_target_g": combined_fat,
                "karbohidrat_target_g": combined_carb,
                "pantangan_makanan": combined_pantangan,
                "catatan_klinis": f"Diagnosis Kombinasi. {combined_notes}"
            }

        elif len(matched_rules) == 1:
            return self.format_rule(matched_rules[0])

        return self.get_fallback_rule(diagnosa)

    def get_fallback_rule(self, diagnosa: str) -> dict:
        return {
            "diagnosa": diagnosa,
            "jenis_diet": "Diet Makanan Biasa (Biasa)",
            "kalori_target_kcal_per_hari": 2000,
            "protein_target_g": 75,
            "lemak_target_g": 60,
            "karbohidrat_target_g": 290,
            "pantangan_makanan": "Tidak ada",
            "catatan_klinis": "Diet normal seimbang untuk pasien tanpa diet khusus"
        }

    def format_rule(self, rule: dict) -> dict:
        return {
            "diagnosa": str(rule.get("diagnosa", "")),
            "jenis_diet": str(rule.get("jenis_diet", "Diet Makanan Biasa (Biasa)")),
            "kalori_target_kcal_per_hari": int(rule.get("kalori_target_kcal_per_hari", 2000)),
            "protein_target_g": int(rule.get("protein_target_g", 75)),
            "lemak_target_g": int(rule.get("lemak_target_g", 60)),
            "karbohidrat_target_g": int(rule.get("karbohidrat_target_g", 290)),
            "pantangan_makanan": str(rule.get("pantangan_makanan", "Tidak ada")),
            "catatan_klinis": str(rule.get("catatan_klinis", ""))
        }

if __name__ == "__main__":
    engine = ClinicalRuleEngine("data/diet_mapping.xlsx")
    test_diagnoses = ["Hipertensi", "Diabetes Mellitus", "gastritis parah", "Flu Biasa"]
    for diag in test_diagnoses:
        print(f"\nDiag: {diag} -> Mapped Diet:")
        print(engine.map_diagnosis(diag))
