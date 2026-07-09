import numpy as np
import joblib

class MenuRecommender:
    def __init__(self):
        self.model      = None
        self.scaler     = None
        self.menu_data  = None

    def load(self, path='models/'):
        self.model      = joblib.load(f'{path}knn_menu.pkl')
        self.scaler     = joblib.load(f'{path}scaler.pkl')
        self.menu_data  = joblib.load(f'{path}menu_data.pkl')
        print("Model rekomendasi menu berhasil dimuat.")

    def recommend(self, jenis_diet: str, kalori_target: float,
                  waktu_makan: str, pantangan: str = '',
                  n: int = 3) -> list:
        """
        Rekomendasikan menu terbaik berdasarkan diet, target kalori,
        waktu makan, dan pantangan.
        """
        # Filter berdasarkan jenis diet dan waktu makan
        df = self.menu_data.copy()
        df_filtered = df[
            (df['jenis_diet'].str.lower() == jenis_diet.lower()) &
            (df['waktu_makan'].str.lower() == waktu_makan.lower())
        ]

        # Fallback: kalau tidak ada menu untuk diet ini, pakai semua waktu makan
        if df_filtered.empty:
            df_filtered = df[df['waktu_makan'].str.lower() == waktu_makan.lower()]

        # Filter pantangan makanan
        if pantangan:
            pantangan_list = [p.strip().lower() for p in pantangan.split(',')]
            for p in pantangan_list:
                df_filtered = df_filtered[
                    ~df_filtered['nama_menu'].str.lower().str.contains(p, na=False)
                ]

        # Jika setelah filter masih kosong, kembalikan kosong
        if df_filtered.empty:
            return []

        # Hitung proporsi kalori per waktu makan
        rasio = {'sarapan': 0.30, 'makan siang': 0.40,
                 'makan malam': 0.30, 'snack': 0.10}
        target_kalori = kalori_target * rasio.get(waktu_makan.lower(), 0.30)

        # Buat query point ideal
        query = np.array([[
            target_kalori,
            target_kalori * 0.15 / 4,   # estimasi protein
            target_kalori * 0.25 / 9,   # estimasi lemak
            target_kalori * 0.60 / 4,   # estimasi karbohidrat
        ]])
        query_scaled = self.scaler.transform(query)

        # Hitung jarak ke semua menu yang sudah difilter
        kolom = ['kalori_kcal', 'protein_g', 'lemak_g', 'karbohidrat_g']
        X_filtered = self.scaler.transform(df_filtered[kolom].values)
        distances   = np.sqrt(((X_filtered - query_scaled) ** 2).sum(axis=1))

        # Ambil n menu terdekat
        top_idx = distances.argsort()[:n]
        hasil   = df_filtered.iloc[top_idx].copy()
        hasil['skor_kesesuaian'] = (1 / (1 + distances[top_idx])).round(3)

        return hasil[['nama_menu', 'jenis_diet', 'waktu_makan',
                       'kalori_kcal', 'protein_g', 'lemak_g',
                       'karbohidrat_g', 'vendor_id',
                       'skor_kesesuaian']].to_dict('records')