"""
Build helper for Render deployment.
Run with: python build_render.py
"""
import subprocess
import sys
import os

def main():
    print("=== RENDER BUILD STARTED ===")
    
    # 1. Install production dependencies
    print("Installing production dependencies...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements-prod.txt"])
    
    # 2. Train and save ML models
    print("Training ML models...")
    # Add backend to path
    backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
    sys.path.insert(0, backend_dir)
    os.chdir(backend_dir)
    
    from recommendation import MenuRecommender
    from clinical_rules import ClinicalRuleEngine
    
    recommender = MenuRecommender()
    recommender.train_and_save()
    print("Models trained and saved successfully.")
    
    engine = ClinicalRuleEngine()
    print(f"Clinical rules loaded: {len(engine.rules)} rules")
    
    os.chdir(os.path.join(backend_dir, ".."))
    
    print("=== RENDER BUILD COMPLETED SUCCESSFULLY ===")

if __name__ == "__main__":
    main()
