import os
import random
from recommendation import MenuRecommender

class MealBuilder:
    def __init__(self, recommender: MenuRecommender = None):
        if recommender is None:
            self.recommender = MenuRecommender()
            self.recommender.load()
        else:
            self.recommender = recommender

    def build_daily_meals(self, jenis_diet: str, daily_targets: dict, pantangan: str = "") -> dict:
        """
        Builds a full day meal package (Breakfast, Lunch, Dinner)
        daily_targets: {"kalori_target_kcal_per_hari": 1800, "protein_target_g": 70, "lemak_target_g": 55, "karbohidrat_target_g": 250}
        """
        # Split daily target based on standard dietetic distribution: 
        # Sarapan (25%), Makan Siang (40%), Makan Malam (35%)
        cal_total = daily_targets.get("kalori_target_kcal_per_hari", 1800)
        prot_total = daily_targets.get("protein_target_g", 70)
        fat_total = daily_targets.get("lemak_target_g", 55)
        carb_total = daily_targets.get("karbohidrat_target_g", 250)

        meal_splits = {
            "sarapan": {
                "kalori_kcal": cal_total * 0.25,
                "protein_g": prot_total * 0.25,
                "lemak_g": fat_total * 0.25,
                "karbohidrat_g": carb_total * 0.25
            },
            "makan_siang": {
                "kalori_kcal": cal_total * 0.40,
                "protein_g": prot_total * 0.40,
                "lemak_g": fat_total * 0.40,
                "karbohidrat_g": carb_total * 0.40
            },
            "makan_malam": {
                "kalori_kcal": cal_total * 0.35,
                "protein_g": prot_total * 0.35,
                "lemak_g": fat_total * 0.35,
                "karbohidrat_g": carb_total * 0.35
            }
        }

        result = {}
        for meal_name, targets in meal_splits.items():
            result[meal_name] = self.build_single_meal(jenis_diet, targets, pantangan, meal_name)

        return result

    def build_single_meal(self, jenis_diet: str, targets: dict, pantangan: str, meal_name: str) -> dict:
        """
        Builds a single cohesive meal plan comprising:
        - pokok (carbs)
        - lauk_utama (protein)
        - lauk_nabati (secondary protein)
        - sayur (vegetables/soup)
        - dessert (fruits/dessert)
        """
        # Category target splits mapping for realistic meal planning
        category_splits = {
            "pokok": {"kalori": 0.35, "protein": 0.15, "lemak": 0.10, "karbohidrat": 0.55},
            "lauk_utama": {"kalori": 0.30, "protein": 0.55, "lemak": 0.45, "karbohidrat": 0.05},
            "lauk_nabati": {"kalori": 0.15, "protein": 0.20, "lemak": 0.20, "karbohidrat": 0.10},
            "sayur": {"kalori": 0.10, "protein": 0.05, "lemak": 0.10, "karbohidrat": 0.15},
            "dessert": {"kalori": 0.10, "protein": 0.05, "lemak": 0.15, "karbohidrat": 0.15}
        }
        
        # Helper to query recommendation for a specific category with its target split
        def fetch_component(cat_name):
            split = category_splits[cat_name]
            cat_target = {
                "kalori_kcal": targets["kalori_kcal"] * split["kalori"],
                "protein_g": targets["protein_g"] * split["protein"],
                "lemak_g": targets["lemak_g"] * split["lemak"],
                "karbohidrat_g": targets["karbohidrat_g"] * split["karbohidrat"]
            }
            # Fetch top 5 items for diversity and pick one randomly
            recs = self.recommender.recommend(
                jenis_diet=jenis_diet,
                target_nutrisi=cat_target,
                pantangan=pantangan,
                kategori=cat_name,
                n=5,
                max_cal=cat_target["kalori_kcal"] * 1.05
            )
            if recs:
                # Randomly pick from top 3 for variation
                return random.choice(recs[:min(3, len(recs))])
            return None

        # Build meal components based on real hospital food cycle structures
        pokok = fetch_component("pokok")
        lauk_utama = fetch_component("lauk_utama")
        lauk_nabati = fetch_component("lauk_nabati")
        
        # In breakfast, we skip heavy cooked vegetables (sayur) but include a light fruit/dessert.
        # Lunch and Dinner are complete 5-component meals.
        sayur = None
        dessert = None
        
        if meal_name.lower() != "sarapan":
            sayur = fetch_component("sayur")
            dessert = fetch_component("dessert")
        else:
            dessert = fetch_component("dessert")
            
        items = []
        for it in [pokok, lauk_utama, lauk_nabati, sayur, dessert]:
            if it:
                items.append(it)

        # Sum nutrition for the built package
        total_kalori = sum(item["kalori_kcal"] for item in items)
        total_protein = sum(item["protein_g"] for item in items)
        total_lemak = sum(item["lemak_g"] for item in items)
        total_karbo = sum(item["karbohidrat_g"] for item in items)

        return {
            "items": {
                "pokok": pokok,
                "lauk_utama": lauk_utama,
                "lauk_nabati": lauk_nabati,
                "sayur": sayur,
                "dessert": dessert
            },
            "nutrition_totals": {
                "kalori_kcal": round(total_kalori, 1),
                "protein_g": round(total_protein, 1),
                "lemak_g": round(total_lemak, 1),
                "karbohidrat_g": round(total_karbo, 1)
            },
            "targets": {
                "kalori_kcal": round(targets["kalori_kcal"], 1),
                "protein_g": round(targets["protein_g"], 1),
                "lemak_g": round(targets["lemak_g"], 1),
                "karbohidrat_g": round(targets["karbohidrat_g"], 1)
            }
        }

if __name__ == "__main__":
    builder = MealBuilder()
    targets = {
        "kalori_target_kcal_per_hari": 1800,
        "protein_target_g": 70,
        "lemak_target_g": 55,
        "karbohidrat_target_g": 250
    }
    daily_meals = builder.build_daily_meals("Diet Rendah Natrium", targets, "makanan olahan")
    
    print("\nDaily Meal Package Built:")
    for meal, data in daily_meals.items():
        print(f"\n[{meal.upper()}] Totals: {data['nutrition_totals']['kalori_kcal']} kcal (Target: {data['targets']['kalori_kcal']})")
        for key, item in data["items"].items():
            if item:
                print(f"  - {key.capitalize()}: {item['nama_menu']} ({item['kalori_kcal']} kcal)")
