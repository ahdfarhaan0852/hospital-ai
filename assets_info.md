# Daftar Aset - POS Web FE (posrspc-frontend-mobile)

File ini berisi daftar seluruh aset gambar dan grafis yang terletak pada folder `assets` di proyek **POS Web FE**, beserta ukuran file, status penggunaan, dan lokasinya di dalam kode sumber untuk membantu Anda melakukan konfigurasi pada **hospital-ai**.

## Ringkasan Aset

Semua aset disimpan dalam folder: `assets/`

| Nama File | Ukuran File | Format | Status Penggunaan | Lokasi Penggunaan di Kode Sumber | Keterangan/Fungsi |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`cardiogram.png`** | 18.9 KB | PNG | **Digunakan** | `screens/LoginScreen.js` (sebagai `HealthLogo`) | Ikon grafik detak jantung / kesehatan pada halaman Login. |
| **`gdsk_logo.png`** | 37.8 KB | PNG | **Digunakan** | `components/composite/Navbar.js`<br>`screens/LoginScreen.js` | Logo GDSK (instansi/perusahaan) yang tampil di Navbar dan halaman Login. |
| **`health_metrics.svg`** | 430 B | SVG | *Tidak Digunakan* | - | File gambar vektor SVG untuk metrik kesehatan. |
| **`order-confirmed.png`** | 194.0 KB | PNG | **Digunakan** | `screens/SuccessNotification.js` | Ilustrasi yang ditampilkan setelah pesanan pasien berhasil dikonfirmasi. |
| **`switchoff.png`** | 20.5 KB | PNG | *Tidak Digunakan* | - | Ikon tombol keluar (log out) / mematikan aplikasi. |

---

## Detail Impor Aset di Kode Sumber

### 1. `gdsk_logo.png` & `cardiogram.png` di Login Screen
Digunakan pada file: [LoginScreen.js](file:///d:/pos-web-fe/screens/LoginScreen.js)
```javascript
import HealthLogo from '../assets/cardiogram.png'
import GdskLogo from '../assets/gdsk_logo.png'
```

### 2. `gdsk_logo.png` di Navbar
Digunakan pada file: [Navbar.js](file:///d:/pos-web-fe/components/composite/Navbar.js)
```javascript
import GdskLogo from '../../assets/gdsk_logo.png'
```

### 3. `order-confirmed.png` di Success Notification Screen
Digunakan pada file: [SuccessNotification.js](file:///d:/pos-web-fe/screens/SuccessNotification.js)
```javascript
<Image
  source={require('../assets/order-confirmed.png')}
  style={styles.image}
  resizeMode="contain"
/>
```
