# Catatan Kebutuhan Aset Sistem Hospital-AI

Dokumen ini berisi daftar aset yang dibutuhkan untuk mengintegrasikan teknologi kecerdasan buatan (AI) ke dalam sistem POS (Point of Sales) Gizi dan Makanan Pasien Rumah Sakit (`posrcpc-backend`). Integrasi ini bertujuan untuk meningkatkan akurasi asuhan gizi, meminimalkan kesalahan diet, mengoptimalkan operasional dapur, serta memberikan pengalaman personalisasi bagi pasien.

---

## 1. Hubungan AI dengan Basis Data POS Saat Ini
Aset AI yang dirancang akan berinteraksi langsung dengan skema database yang sudah ada di `posrcpc-backend`:
* **Diagnosis & Diet**: Menghubungkan kolom `patients.diagnosis` dan `patients.remarks` dengan tabel `diet_types` melalui pemrosesan bahasa alami (NLP).
* **Komposisi Makanan**: Menganalisis kandungan gizi pada tabel `menu_compositions` untuk dicocokkan dengan kebutuhan nutrisi harian pasien.
* **Siklus Menu**: Memaksimalkan efisiensi tabel `food_cycle_menus` berdasarkan prediksi kebutuhan pasien.
* **Pelacakan Asupan**: Mencatat evaluasi sisa makanan pasien ke dalam tabel log (`patient_logs` / `order_patients`).

---

## 2. Rincian Kebutuhan Aset Sistem Hospital-AI

### A. Aset Model & Layanan Kecerdasan Buatan (AI/ML Models)
Untuk menghadirkan fitur cerdas, sistem membutuhkan model-model AI berikut:

| Nama Aset AI | Deskripsi Fungsi | Dataset Pelatihan / Input | Output / Benefit |
| :--- | :--- | :--- | :--- |
| **Clinical Diet Recommender** | Menganalisis teks diagnosis klinis pasien dan merekomendasikan jenis diet yang sesuai secara otomatis. | Rekam medis historis, ICD-10 mapping ke diet gizi medis. | Rekomendasi otomatis tipe diet (misal: *Rendah Garam*, *Diet DM*). |
| **Plate Waste Analyzer (Vision AI)** | Mengukur sisa makanan pasien melalui foto piring setelah makan (menggunakan kamera perangkat perawat). | Foto piring sebelum/sesudah makan, anotasi porsi makanan. | Persentase sisa makanan dan estimasi kalori riil yang dikonsumsi. |
| **Demand Forecasting Model** | Memprediksi jumlah porsi tiap menu makanan yang perlu dimasak per hari untuk meminimalkan *food waste*. | Histori pesanan (`order_patients`), tren okupansi kamar, siklus menu. | Prediksi jumlah porsi per menu untuk hari berikutnya. |
| **Patient Voice Ordering Agent** | Asisten suara interaktif yang memandu pasien memesan makanan sesuai batasan dietnya. | Rekaman suara/audio perintah pesan, kamus menu makanan rumah sakit. | Pesanan makanan terstruktur yang aman secara klinis. |

---

### B. Aset Data & Pengetahuan (Data & Knowledge Assets)
Model AI tidak dapat berfungsi tanpa data referensi yang valid secara medis dan nutrisi:

1. **Database Nilai Gizi Bahan Pangan (Nutrition Reference Database)**
   * **Deskripsi**: Database komprehensif yang memuat kalori, karbohidrat, protein, lemak, natrium, kalium, dan zat gizi lainnya per satuan berat bahan pangan.
   * **Sumber**: TKPI (Tabel Komposisi Pangan Indonesia) dari Kemenkes RI, serta USDA FoodData Central.
2. **Kamus Penyakit & Aturan Diet Gizi Medis (Clinical Nutrition Ruleset)**
   * **Deskripsi**: Korpus data medis yang memetakan kode diagnosis penyakit (ICD-10) ke batasan gizi (kontraindikasi bahan makanan tertentu).
3. **Dataset Preferensi Kuliner Pasien Ter-anonimisasi**
   * **Deskripsi**: Data historis pesanan untuk melatih model rekomendasi menu agar dapat menawarkan makanan yang sesuai dengan selera lokal dan rentang usia pasien.

---

### C. Aset Integrasi & API (Integration Assets)
Menghubungkan kecerdasan buatan dengan sistem rumah sakit yang sudah ada:

* **EHR/HIS Integration Gateway (HL7 / FHIR API)**
  * Menghubungkan backend POS gizi dengan Electronic Health Record (EHR) rumah sakit untuk sinkronisasi otomatis status pasien (`checkin`, `checkout`, nomor kamar, bed, dan diagnosis baru).
* **LLM API Gateway (Gemini API / OpenAI / Claude)**
  * Layanan pemrosesan bahasa alami untuk chatbot interaktif pasien dan ekstraksi informasi dari catatan dokter (`remarks`).
* **Real-time Event Broker (Socket.io / WebSockets / RabbitMQ)**
  * Mengirimkan perubahan status pasien secara instan ke sistem dapur (misalnya, jika pasien tiba-tiba masuk status puasa `status_puasa = 1`, pesanan aktif harus dibatalkan otomatis).

---

### D. Aset Infrastruktur & Keamanan (Infrastructure & Security)
Menjamin keandalan proses komputasi AI dan keamanan data pasien:

1. **GPU Server / Cloud AI Hosting**
   * Server dengan kemampuan pemrosesan paralel (GPU) untuk menjalankan model visi komputer (*Plate Waste*) dan inferensi bahasa alami dengan latensi rendah.
2. **Enkripsi Data PHI (Protected Health Information)**
   * Sistem perlindungan khusus untuk data sensitif pasien (NIK, Nomor Rekam Medis, Diagnosis) baik saat data disimpan (*at rest*) maupun dikirimkan (*in transit*), memenuhi standar regulasi kesehatan (seperti UU Perlindungan Data Pribadi).

---

### E. Aset Perangkat Keras (Hardware Assets)
Perangkat fisik yang dibutuhkan di lapangan untuk mendukung alur kerja AI:

* **Tablet Kamar Pasien (Bedside Smart Screen)**
  * Perangkat di tiap bed pasien (`beds`) yang menjalankan aplikasi pemesanan makanan mandiri berbasis rekomendasi AI.
* **Perangkat Pemindai Asupan (Nursing Mobile Device)**
  * Ponsel atau tablet berkamera yang digunakan oleh pramusaji/perawat untuk memotret piring pasien setelah makan.
* **Kitchen Display System (KDS)**
  * Monitor di area dapur untuk menampilkan pesanan gizi secara visual lengkap dengan label peringatan alergi/diet khusus dari AI.
* **Printer Barcode / QR Label Makanan**
  * Printer thermal untuk mencetak barcode pada kemasan makanan pasien guna memastikan makanan tidak tertukar saat distribusi.

---

### F. Aset Desain Antarmuka (UI/UX Modules)
Modul visual baru yang perlu dibangun untuk menampung fitur AI:

1. **Portal Ahli Gizi (Nutritionist AI Dashboard)**: Antarmuka bagi ahli gizi untuk memverifikasi rekomendasi diet AI, melihat grafik asupan kalori riil pasien, dan memantau tingkat limbah makanan dapur.
2. **Aplikasi Pemesanan Pasien (Smart Patient App)**: Antarmuka sederhana yang menampilkan menu ramah diet pasien dengan label penjelasan gizi interaktif.
3. **Monitor Produksi Dapur (Kitchen Smart Board)**: Dashboard dapur yang merangkum total bahan baku yang harus dipersiapkan berdasarkan prediksi kebutuhan dari AI.
