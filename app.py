from flask import Flask, request, jsonify
from diet_rules import map_diagnosis # Mengambil fungsi dari file sebelah

app = Flask(__name__)

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "online"}), 200

@app.route('/api/recommend', methods=['POST'])
def recommend():
    data = request.json
    diagnosa = data.get('diagnosa', 'umum')
    
    # Panggil fungsi dari diet_rules.py
    hasil_diet = map_diagnosis(diagnosa)
    
    return jsonify({
        "success": True,
        "diet_info": hasil_diet,
        "rekomendasi_menu": ["Menu A", "Menu B", "Menu C"] # Contoh dummy
    })

if __name__ == '__main__':
    app.run(port=5000, debug=True)