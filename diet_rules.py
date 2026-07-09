def map_diagnosis(diagnosa):
    diagnosa = diagnosa.lower()
    

    if "diabetes" in diagnosa:
        return {
            "jenis_diet": "Diet Lambung / Rendah Gula",
            "kalori_target": 1800,
            "protein_target": 60,
            "lemak_target": 50,
            "karbohidrat_target": 250,
            "pantangan": "Gula pasir, minuman manis, madu"
        }
    elif "hipertensi" in diagnosa:
        return {
            "jenis_diet": "Diet Rendah Garam",
            "kalori_target": 2000,
            "protein_target": 75,
            "lemak_target": 60,
            "karbohidrat_target": 300,
            "pantangan": "Garam berlebih, makanan kaleng, penyedap rasa"
        }
    else:
        return {
            "jenis_diet": "Diet Umum (Normal)",
            "kalori_target": 2100,
            "protein_target": 80,
            "lemak_target": 70,
            "karbohidrat_target": 320,
            "pantangan": "Tidak ada"
        }