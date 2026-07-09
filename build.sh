#!/usr/bin/env bash
# Build script for Render deployment

# Install Python dependencies
pip install -r requirements-prod.txt

# Run seed to prepare models (train and save ML models)
cd backend
python -c "
from recommendation import MenuRecommender
from clinical_rules import ClinicalRuleEngine
print('Training models...')
recommender = MenuRecommender()
recommender.train_and_save()
print('Models trained and saved successfully.')
print('Loading clinical rules...')
engine = ClinicalRuleEngine()
print(f'Clinical rules loaded: {len(engine.rules)} rules')
"
cd ..

echo "Build completed successfully!"
