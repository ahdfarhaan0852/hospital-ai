import sys
import os

# Ensure both root and backend directories are in path
ROOT_DIR = os.path.abspath(os.path.dirname(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, 'backend')

# Backend dir must be first so 'from database import ...' works inside backend/app.py
sys.path.insert(0, BACKEND_DIR)

# Set working directory to root so relative paths (e.g., 'data/') resolve correctly
os.chdir(ROOT_DIR)

try:
    # Import using importlib to load backend/app.py explicitly (not root app.py)
    import importlib.util
    spec = importlib.util.spec_from_file_location("backend_app", os.path.join(BACKEND_DIR, "app.py"))
    backend_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(backend_module)
    app = backend_module.app
    print("WSGI: Backend app imported successfully from backend/app.py")
except Exception as e:
    print(f"WSGI IMPORT ERROR: {e}")
    import traceback
    traceback.print_exc()
    # Create a fallback app that shows the error
    from flask import Flask, jsonify
    app = Flask(__name__)
    error_msg = str(e)
    
    @app.route('/')
    def error_index():
        return jsonify({"error": "App failed to start", "details": error_msg}), 500
    
    @app.route('/api/health')
    def error_health():
        return jsonify({"status": "error", "details": error_msg}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
