import React, { useState, useEffect } from 'react';
import {
  Activity, Users, CheckSquare, Truck, Settings, Plus, Search,
  ShieldAlert, Utensils, Check, Clock, Sparkles, ChevronRight,
  AlertCircle, ThumbsUp, CheckCircle, TrendingUp, MapPin,
  Calendar, Filter, RefreshCw, BookOpen, LogOut, Info, AlertTriangle,
  Home, ArrowLeft
} from 'lucide-react';

// API helper utility
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const fetchAPI = async (url, options = {}) => {
  const targetUrl = url.startsWith('/') ? `${API_BASE_URL}${url}` : url;
  try {
    const res = await fetch(targetUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Terjadi kesalahan server');
    }
    return await res.json();
  } catch (error) {
    console.error(`API Error on ${url}:`, error);
    throw error;
  }
};

// Official GDSK Sprout Logo SVG (High Fidelity to original image)
const GdskLogo = ({ className = "h-10 w-auto" }) => (
  <img
    src="/gdsk_logo.png"
    alt="GDSK Logo"
    className={`${className} object-contain`}
  />
);

function App() {
  // Global States
  const [authMode, setAuthMode] = useState('login'); // login or register
  const [loginForm, setLoginForm] = useState({ email: '', password: '', accessCode: '' });
  const [registerForm, setRegisterForm] = useState({ nama: '', email: '', password: '', role: 'doctor', vendor_id: 'V001', accessCode: '' });

  // User Management States
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [userForm, setUserForm] = useState({ id: '', nama: '', email: '', password: '', role: 'doctor', vendor_id: 'V001', status_konfirmasi: true, accessCode: '' });

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('currentUser');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }); // Simulated logged-in user
  const [selectedVendor, setSelectedVendor] = useState(() => {
    return localStorage.getItem('selectedVendor') || 'V001';
  }); // V001, V002, V003
  const [patients, setPatients] = useState([]);
  const [orders, setOrders] = useState([]);
  const [menus, setMenus] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const [liveTime, setLiveTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatLiveDate = (date) => {
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('id-ID', options) + ' • ' + date.toLocaleTimeString('id-ID');
  };

  const formatOrderTime = (order) => {
    if (!order.created_at) return order.tanggal || 'Baru';
    try {
      const date = new Date(order.created_at);
      const today = new Date();
      const isToday = date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();

      const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
      if (isToday) {
        return `Hari Ini, ${timeStr}`;
      } else {
        return `${date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} • ${timeStr}`;
      }
    } catch (e) {
      return order.tanggal || 'Baru';
    }
  };

  const getLockedMeals = () => {
    const now = new Date();
    const hours = now.getHours();
    const locked = [];
    if (hours >= 9) {
      locked.push('sarapan');
    }
    if (hours >= 14) {
      locked.push('makan_siang');
    }
    return locked;
  };

  // Form States
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({
    nama: '',
    mrn: '',
    umur: '',
    room_id: '',
    diagnosa: 'Hipertensi',
    alergi: '',
    berat_badan: '',
    tingkat_aktivitas: 'sedentary',
    jenis_kelamin: 'Laki-laki'
  });

  // Mapped diet rules in patient modal
  const [selectedPatientForEdit, setSelectedPatientForEdit] = useState(null);
  const [editDiagnosis, setEditDiagnosis] = useState('');
  const [editAllergy, setEditAllergy] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editActivity, setEditActivity] = useState('sedentary');
  const [editGender, setEditGender] = useState('Laki-laki');

  // Order Taker / Patient Selection States
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [activePatient, setActivePatient] = useState(() => {
    const saved = localStorage.getItem('activePatient');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [aiMeals, setAiMeals] = useState(null);
  const [buildingMeals, setBuildingMeals] = useState(false);
  const [customMeals, setCustomMeals] = useState({
    sarapan: { pokok: null, lauk_utama: null, lauk_nabati: null, sayur: null, dessert: null },
    makan_siang: { pokok: null, lauk_utama: null, lauk_nabati: null, sayur: null, dessert: null },
    makan_malam: { pokok: null, lauk_utama: null, lauk_nabati: null, sayur: null, dessert: null }
  });
  const [searchCategory, setSearchCategory] = useState('pokok');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchTargetMealTime, setSearchTargetMealTime] = useState('sarapan');

  // Trigger Toast Notification
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch all basic data
  const fetchData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const patientsData = await fetchAPI('/api/patients');
      const ordersData = await fetchAPI('/api/orders');
      
      let menusUrl = '/api/menus';
      if (activePatient) {
        menusUrl = `/api/menus?patient_id=${activePatient.id}`;
      }
      const menusData = await fetchAPI(menusUrl);
      const statsData = await fetchAPI('/api/stats');

      setPatients(patientsData);
      setOrders(ordersData);
      setMenus(menusData);
      setStats(statsData);
      setError(null);
    } catch (err) {
      if (!isSilent) {
        setError('Gagal memuat data dari server Flask. Pastikan server aktif.');
        showToast('Koneksi server gagal!', 'error');
      }
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Auto-polling every 4 seconds for real-time dashboard updates
    const interval = setInterval(() => {
      fetchData(true);
    }, 4000);

    return () => clearInterval(interval);
  }, [activePatient]);

  const fetchUsersList = async () => {
    setLoadingUsers(true);
    try {
      const data = await fetchAPI('/api/admin/users');
      setUsersList(data);
    } catch (err) {
      showToast('Gagal memuat daftar pengguna', 'error');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (currentUser && currentUser.role === 'admin') {
      fetchUsersList();
    }
  }, [currentUser]);

  // --- ACTIONS ---

  // Login Handler
  const handleLogin = async (emailAddress, password, accessCode = '') => {
    setLoading(true);
    try {
      const res = await fetchAPI('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: emailAddress,
          password: password,
          access_code: accessCode
        })
      });
      if (res.success) {
        setCurrentUser(res.user);
        localStorage.setItem('currentUser', JSON.stringify(res.user));
        if (res.user.role === 'vendor' && res.user.vendor_id) {
          setSelectedVendor(res.user.vendor_id);
          localStorage.setItem('selectedVendor', res.user.vendor_id);
        }
        showToast(`Selamat datang, ${res.user.nama}!`);
      }
    } catch (err) {
      showToast(err.message || 'Login gagal!', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Registration Handler
  const handleRegister = async (registrationData) => {
    setLoading(true);
    try {
      const res = await fetchAPI('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(registrationData)
      });
      if (res.success) {
        showToast(res.message || 'Registrasi berhasil! Menunggu konfirmasi dari Administrator.', 'success');
        return true;
      }
      return false;
    } catch (err) {
      showToast(err.message || 'Registrasi gagal!', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout Handler
  const handleLogout = () => {
    setCurrentUser(null);
    setActivePatient(null);
    setAiMeals(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('activePatient');
    localStorage.removeItem('selectedVendor');
    showToast('Berhasil keluar dari sesi.');
  };

  // Register Patient (Doctor)
  const handleAddPatient = async (e) => {
    e.preventDefault();
    if (!newPatient.nama || !newPatient.mrn || !newPatient.umur || !newPatient.room_id) {
      showToast('Harap isi semua kolom!', 'error');
      return;
    }
    try {
      const payload = {
        ...newPatient,
        umur: parseInt(newPatient.umur),
        berat_badan: newPatient.berat_badan ? parseFloat(newPatient.berat_badan) : null
      };
      await fetchAPI('/api/patients', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast('Pasien baru berhasil didaftarkan!');
      setShowAddPatient(false);
      setNewPatient({
        nama: '',
        mrn: '',
        umur: '',
        room_id: '',
        diagnosa: 'Hipertensi',
        alergi: '',
        berat_badan: '',
        tingkat_aktivitas: 'sedentary',
        jenis_kelamin: 'Laki-laki'
      });
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Update Diagnosis & Patient Profile (Doctor)
  const handleUpdateDiagnosis = async (patientId) => {
    if (!editDiagnosis) return;
    try {
      await fetchAPI(`/api/patients/${patientId}`, {
        method: 'PUT',
        body: JSON.stringify({
          diagnosa: editDiagnosis,
          alergi: editAllergy,
          umur: editAge ? parseInt(editAge) : undefined,
          berat_badan: editWeight ? parseFloat(editWeight) : null,
          tingkat_aktivitas: editActivity,
          jenis_kelamin: editGender
        })
      });
      showToast('Profil dan diagnosis pasien berhasil diperbarui!');
      setSelectedPatientForEdit(null);
      setEditDiagnosis('');
      setEditAllergy('');
      setEditAge('');
      setEditWeight('');
      setEditActivity('sedentary');
      setEditGender('Laki-laki');
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Generate AI Meal Proposal (Order Taker / Patient Selection)
  const generateAIMealProposal = async (patient) => {
    setBuildingMeals(true);
    try {
      const res = await fetchAPI(`/api/patients/${patient.id}/meal-builder`);
      setAiMeals(res);

      // Load into custom meals initially, skipping locked ones
      const lockedMeals = getLockedMeals();
      const newCustom = { ...customMeals };
      Object.keys(res).forEach(mealTime => {
        if (!lockedMeals.includes(mealTime)) {
          newCustom[mealTime] = {
            pokok: res[mealTime].items.pokok,
            lauk_utama: res[mealTime].items.lauk_utama,
            lauk_nabati: res[mealTime].items.lauk_nabati,
            sayur: res[mealTime].items.sayur,
            dessert: res[mealTime].items.dessert,
          };
        }
      });
      setCustomMeals(newCustom);
      showToast('Paket makan AI berhasil disusun!', 'success');
    } catch (err) {
      showToast('Gagal menyusun menu AI', 'error');
    } finally {
      setBuildingMeals(false);
    }
  };

  // Search items for customizing package (Order Taker)
  const searchMenuItems = async (category, mealTime) => {
    if (!activePatient) return;
    setSearching(true);
    setSearchCategory(category);
    setSearchTargetMealTime(mealTime);
    try {
      // Calculate calorie and macro targets and remaining budgets (with 10% clinical buffer)
      let mealRatio = 0.35;
      if (mealTime === 'sarapan') mealRatio = 0.25;
      else if (mealTime === 'makan_siang') mealRatio = 0.40;
      else if (mealTime === 'makan_malam') mealRatio = 0.35;

      const mealCalLimit = activePatient.kalori_target * mealRatio * 1.1;
      const dailyCalLimit = activePatient.kalori_target * 1.1;
      const dailyProtLimit = activePatient.protein_target * 1.1;
      const dailyFatLimit = activePatient.lemak_target * 1.1;
      const dailyCarbLimit = activePatient.karbohidrat_target * 1.1;

      let selectedMealCal = 0;
      let selectedDailyCal = 0;
      let selectedDailyProt = 0;
      let selectedDailyFat = 0;
      let selectedDailyCarb = 0;

      Object.keys(customMeals).forEach(mTime => {
        Object.keys(customMeals[mTime]).forEach(cat => {
          const item = customMeals[mTime][cat];
          if (item) {
            selectedDailyCal += item.kalori_kcal || 0;
            selectedDailyProt += item.protein_g || 0;
            selectedDailyFat += item.lemak_g || 0;
            selectedDailyCarb += item.karbohidrat_g || 0;
            if (mTime === mealTime) {
              selectedMealCal += item.kalori_kcal || 0;
            }
          }
        });
      });

      const currentItem = customMeals[mealTime]?.[category];
      const currentItemCal = currentItem ? (currentItem.kalori_kcal || 0) : 0;
      const currentItemProt = currentItem ? (currentItem.protein_g || 0) : 0;
      const currentItemFat = currentItem ? (currentItem.lemak_g || 0) : 0;
      const currentItemCarb = currentItem ? (currentItem.karbohidrat_g || 0) : 0;

      const remainingMealCal = mealCalLimit - (selectedMealCal - currentItemCal);
      const remainingDailyCal = dailyCalLimit - (selectedDailyCal - currentItemCal);
      const remainingDailyProt = dailyProtLimit - (selectedDailyProt - currentItemProt);
      const remainingDailyFat = dailyFatLimit - (selectedDailyFat - currentItemFat);
      const remainingDailyCarb = dailyCarbLimit - (selectedDailyCarb - currentItemCarb);

      // Candidate item must fit in both remaining meal budget and daily budget
      const maxCal = Math.max(0, Math.min(remainingMealCal, remainingDailyCal));

      const url = `/api/patients/${activePatient.id}/recommend?kategori=${category}&waktu_makan=${mealTime}&max_cal=${maxCal.toFixed(1)}&remaining_prot=${Math.max(0, remainingDailyProt).toFixed(1)}&remaining_fat=${Math.max(0, remainingDailyFat).toFixed(1)}&remaining_carb=${Math.max(0, remainingDailyCarb).toFixed(1)}&n=8`;
      const res = await fetchAPI(url);
      setSearchResults(res);
    } catch (err) {
      showToast('Gagal mencari menu', 'error');
    } finally {
      setSearching(false);
    }
  };

  const selectCustomItem = (mealTime, category, item) => {
    const newCustom = { ...customMeals };
    newCustom[mealTime][category] = item;
    setCustomMeals(newCustom);
    showToast(`Komponen ${category} diubah ke ${item.nama_menu}`);
  };

  const removeCustomItem = (mealTime, category) => {
    const newCustom = { ...customMeals };
    newCustom[mealTime][category] = null;
    setCustomMeals(newCustom);
    showToast(`Komponen ${category.replace('_', ' ')} dihapus`);
  };

  // Submit Patient Menu Order (Order Taker to Ahli Gizi/Vendor queue)
  const submitPatientOrder = async () => {
    if (!activePatient) return;

    // Validate that at least some items are selected
    const selectedItems = {};
    let hasItems = false;

    Object.keys(customMeals).forEach(mealTime => {
      selectedItems[mealTime] = {};
      Object.keys(customMeals[mealTime]).forEach(category => {
        const item = customMeals[mealTime][category];
        if (item) {
          selectedItems[mealTime][category] = {
            id: item.id,
            nama_menu: item.nama_menu,
            kalori_kcal: item.kalori_kcal,
            protein_g: item.protein_g,
            lemak_g: item.lemak_g,
            karbohidrat_g: item.karbohidrat_g,
            vendor_id: item.vendor_id
          };
          hasItems = true;
        }
      });
    });

    if (!hasItems) {
      showToast('Pilih setidaknya satu menu sebelum memesan!', 'error');
      return;
    }

    // Calculate total nutrition of the selected package
    let totalCal = 0;
    let totalProt = 0;
    let totalFat = 0;
    let totalCarb = 0;

    Object.keys(customMeals).forEach(mealTime => {
      Object.keys(customMeals[mealTime]).forEach(category => {
        const item = customMeals[mealTime][category];
        if (item) {
          totalCal += item.kalori_kcal || 0;
          totalProt += item.protein_g || 0;
          totalFat += item.lemak_g || 0;
          totalCarb += item.karbohidrat_g || 0;
        }
      });
    });

    // Hospital Standard: limit strictly to daily targets (with clinical buffer depending on diet type)
    let proteinMultiplier = 1.1; // Default 10% buffer
    const dietLower = (activePatient.diet || '').toLowerCase();
    if (dietLower.includes('tinggi protein') || dietLower.includes('tetp') || dietLower.includes('dialisis')) {
      proteinMultiplier = 1.5; // High protein diets get a generous 50% buffer
    } else if (dietLower.includes('rendah protein') || dietLower.includes('ginjal') || dietLower.includes('sirosis')) {
      proteinMultiplier = 1.05; // Strict 5% buffer for restricted renal/hepatic patients
    }

    const limitCal = activePatient.kalori_target * 1.1;
    const limitProt = activePatient.protein_target * proteinMultiplier;
    const limitFat = activePatient.lemak_target * 1.1;
    const limitCarb = activePatient.karbohidrat_target * 1.1;

    if (totalCal > limitCal) {
      showToast(`Batas Kalori Terlampaui! Terpilih: ${totalCal.toFixed(0)} Kcal (Maks: ${limitCal.toFixed(0)} Kcal). Harap sesuaikan menu.`, 'error');
      return;
    }
    if (totalProt > limitProt) {
      showToast(`Batas Protein Terlampaui! Terpilih: ${totalProt.toFixed(0)}g (Maks: ${limitProt.toFixed(0)}g). Harap sesuaikan menu.`, 'error');
      return;
    }
    if (totalFat > limitFat) {
      showToast(`Batas Lemak Terlampaui! Terpilih: ${totalFat.toFixed(0)}g (Maks: ${limitFat.toFixed(0)}g). Harap sesuaikan menu.`, 'error');
      return;
    }
    if (totalCarb > limitCarb) {
      showToast(`Batas Karbohidrat Terlampaui! Terpilih: ${totalCarb.toFixed(0)}g (Maks: ${limitCarb.toFixed(0)}g). Harap sesuaikan menu.`, 'error');
      return;
    }

    try {
      await fetchAPI('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: activePatient.id,
          items: selectedItems
        })
      });
      showToast('Pesanan menu berhasil disimpan! Diteruskan ke Ahli Gizi untuk validasi.');
      setActivePatient(null);
      localStorage.removeItem('activePatient');
      setAiMeals(null);
      setCustomMeals({
        sarapan: { pokok: null, lauk_utama: null, lauk_nabati: null, sayur: null, dessert: null },
        makan_siang: { pokok: null, lauk_utama: null, lauk_nabati: null, sayur: null, dessert: null },
        makan_malam: { pokok: null, lauk_utama: null, lauk_nabati: null, sayur: null, dessert: null }
      });
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Approve / Validate Order (Ahli Gizi)
  const handleApproveOrder = async (orderId) => {
    try {
      await fetchAPI(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'Approved' })
      });
      showToast('Pesanan divalidasi & Diteruskan ke GDSK Kitchen!');
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Update Vendor Progress (Vendor)
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await fetchAPI(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      showToast(`Status order diupdate ke: ${newStatus}`);
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Retrain AI Model (Admin)
  const handleRetrainAI = async () => {
    setLoading(true);
    try {
      const res = await fetchAPI('/api/ai/retrain', { method: 'POST' });
      showToast(res.message || 'AI Cosine Similarity Model retrained successfully!');
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Admin User CRUD actions
  const handleAdminAddUser = async (e) => {
    e.preventDefault();
    if (!userForm.nama || !userForm.email || !userForm.password || !userForm.role) {
      showToast('Harap isi semua kolom!', 'error');
      return;
    }

    if (userForm.role === 'admin' && userForm.accessCode !== 'ADMINPOS') {
      showToast('Kode akses admin tidak valid!', 'error');
      return;
    }

    try {
      await fetchAPI('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          nama: userForm.nama,
          email: userForm.email,
          password: userForm.password,
          role: userForm.role,
          vendor_id: userForm.role === 'vendor' ? userForm.vendor_id : null,
          access_code: userForm.accessCode
        })
      });
      showToast('Pengguna baru berhasil ditambahkan!');
      setShowAddUserModal(false);
      setUserForm({ id: '', nama: '', email: '', password: '', role: 'doctor', vendor_id: 'V001', status_konfirmasi: true, accessCode: '' });
      fetchUsersList();
      fetchData(true);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleAdminUpdateUser = async (e) => {
    e.preventDefault();
    try {
      await fetchAPI(`/api/admin/users/${userForm.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          nama: userForm.nama,
          email: userForm.email,
          role: userForm.role,
          vendor_id: userForm.role === 'vendor' ? userForm.vendor_id : null,
          password: userForm.password || undefined // Only update if filled
        })
      });
      showToast('Data pengguna berhasil diperbarui!');
      setShowEditUserModal(false);
      setUserForm({ id: '', nama: '', email: '', password: '', role: 'doctor', vendor_id: 'V001', status_konfirmasi: true, accessCode: '' });
      fetchUsersList();
      fetchData(true);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleAdminConfirmUser = async (userId) => {
    try {
      await fetchAPI(`/api/admin/users/${userId}/confirm`, {
        method: 'POST'
      });
      showToast('Akun pengguna berhasil dikonfirmasi!');
      fetchUsersList();
      fetchData(true);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleAdminDeleteUser = async (userId) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus pengguna ini? Tindakan ini tidak dapat dibatalkan.')) return;
    try {
      await fetchAPI(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });
      showToast('Pengguna berhasil dihapus!');
      fetchUsersList();
      fetchData(true);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Get vendor list statistics
  const getVendorStats = () => {
    let orderCount = 0;
    let prepCount = 0;
    let shipCount = 0;
    let completedCount = 0;

    orders.forEach(o => {
      if (o.status !== 'Pending') {
        orderCount++;
        if (o.status === 'Diproduksi') prepCount++;
        if (o.status === 'Dikirim') shipCount++;
        if (o.status === 'Diterima') completedCount++;
      }
    });

    return { orderCount, prepCount, shipCount, completedCount };
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-gradient-radial text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-glass-accent border ${toast.type === 'error' ? 'bg-rose-950/80 border-rose-500/30 text-rose-200' : 'bg-emerald-950/80 border-emerald-500/30 text-emerald-200'
          } transition-all duration-300 transform translate-y-0`}>
          {toast.type === 'error' ? <AlertCircle className="w-5 h-5 text-rose-400" /> : <CheckCircle className="w-5 h-5 text-emerald-400" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header / Navbar */}
      <header className="glass-panel-heavy sticky top-0 z-40 border-b border-slate-800/80 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">

          {/* White badge containing the official GDSK Sprout Logo */}
          <div className="flex items-center bg-white px-4 py-2 rounded-2xl shadow-sm border border-white">
            <GdskLogo className="h-14 w-auto" />
          </div>

          <div className="h-8 w-[1px] bg-slate-800"></div>

          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              POS SYSTEM RSPC
            </h1>
            <p className="text-xs text-slate-400">Rumah Sakit President Center Food Logistics</p>
          </div>
        </div>

        {/* Real-time system clock widget */}
        <div className="hidden lg:flex flex-col items-center justify-center bg-slate-900/10 border border-slate-800/40 px-4 py-2 rounded-2xl">
          <div className="text-[9px] text-slate-500 uppercase tracking-widest font-extrabold flex items-center gap-1.5 leading-none">
            <span className="w-1.5 h-1.5 rounded-full bg-gdsk-leaf animate-pulse"></span>
            Koneksi Server GDSK: Aktif
          </div>
          <div className="text-xs text-gdsk-soft font-bold mt-1.5">{formatLiveDate(liveTime)}</div>
        </div>

        {currentUser && (
          <div className="flex items-center gap-4">
            {/* User credentials */}
            <div className="text-right hidden sm:block">
              <div className="text-xs text-slate-400 font-medium">Pengguna Aktif:</div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gdsk-leaf animate-pulse"></span>
                {currentUser.nama} ({currentUser.role.replace('_', ' ').toUpperCase()})
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-xs font-semibold bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 px-3 py-2 rounded-xl"
            >
              <LogOut className="w-4 h-4 text-slate-400" />
              Ganti Akun
            </button>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-6">

        {error && (
          <div className="bg-rose-950/40 border border-rose-500/20 p-4 rounded-xl flex items-center gap-3 text-rose-300">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <div className="text-sm">
              <span className="font-bold">Koneksi Error:</span> {error}
              <button onClick={fetchData} className="ml-4 underline hover:text-white font-semibold">Coba Lagi</button>
            </div>
          </div>
        )}

        {/* Global KPIs bar */}
        {stats && currentUser && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div className="glass-card p-4 rounded-2xl flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-400 uppercase">Pasien RSPC</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold text-white">{stats.total_patients}</span>
                <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-400">Jiwa</span>
              </div>
            </div>
            <div className="glass-card p-4 rounded-2xl flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-400 uppercase">Menunggu Validasi</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold text-gdsk-soft">{stats.pending_orders}</span>
                <span className="text-xs bg-gdsk-soft/10 text-gdsk-soft px-2 py-0.5 rounded font-semibold border border-gdsk-soft/20">Pending</span>
              </div>
            </div>
            <div className="glass-card p-4 rounded-2xl flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-400 uppercase">Pesanan Disetujui</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold text-gdsk-leaf">{stats.approved_orders}</span>
                <span className="text-xs bg-gdsk-leaf/10 text-gdsk-leaf px-2 py-0.5 rounded font-semibold border border-gdsk-leaf/20">Approved</span>
              </div>
            </div>
            <div className="glass-card p-4 rounded-2xl flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-400 uppercase">Aktif di Katering</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold text-gdsk-soft">{stats.active_vendor_orders}</span>
                <span className="text-xs bg-gdsk-soft/10 text-gdsk-soft px-2 py-0.5 rounded font-semibold border border-gdsk-soft/20">Produksi</span>
              </div>
            </div>
            <div className="glass-card p-4 rounded-2xl col-span-2 md:col-span-1 flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-400 uppercase">GDSK AI Engine</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold text-gdsk-soft font-extrabold">Cosine</span>
                <span className="text-xs bg-gdsk-leaf/10 text-gdsk-leaf px-2 py-0.5 rounded font-semibold border border-gdsk-leaf/20">99% Match</span>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 gap-4">
            <RefreshCw className="w-10 h-10 text-gdsk-leaf animate-spin" />
            <p className="text-slate-400 text-sm">Menghubungi AI engine & memuat database cloud GDSK...</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">

            {/* LOGIN / REGISTRATION PORTAL */}
            {!currentUser && (
              <div className="flex-1 flex flex-col items-center justify-center py-12 px-4">
                <div className="glass-panel-heavy max-w-5xl w-full rounded-3xl overflow-hidden border border-slate-800/80 shadow-2xl bg-slate-900/40 p-8 flex flex-col gap-6">

                  {/* Top Branding Section */}
                  <div className="text-center flex flex-col items-center gap-2">
                    <div className="flex items-center bg-white px-6 py-3.5 rounded-2xl shadow-lg shadow-gdsk-leaf/15 border border-white mb-2">
                      <GdskLogo className="h-20 w-auto" />
                    </div>
                    <h2 className="text-2xl font-extrabold text-white tracking-tight">
                      {authMode === 'login' ? 'Login Portal - POS SYSTEM RSPC' : 'Registrasi Akun - POS SYSTEM RSPC'}
                    </h2>
                    <p className="text-sm text-slate-400 max-w-md">
                      Layanan katering rumah sakit terintegrasi berbasis AI oleh <strong>GDSK Catering Service</strong>.
                    </p>
                  </div>

                  {authMode === 'login' ? (
                    <div className="flex justify-center items-start mt-2">

                      {/* Login Form */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleLogin(loginForm.email, loginForm.password, loginForm.accessCode);
                        }}
                        className="max-w-md w-full flex flex-col gap-4 bg-slate-950/40 border border-slate-850 p-6 rounded-2xl"
                      >
                        <h3 className="font-bold text-white text-base border-b border-slate-800 pb-2">Masuk ke Akun</h3>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-slate-300">Email / Username</label>
                          <input
                            type="email"
                            required
                            placeholder="nama@hospital.com"
                            value={loginForm.email}
                            onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-gdsk-leaf transition"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-slate-300">Kata Sandi (Password)</label>
                          <input
                            type="password"
                            required
                            placeholder="Masukkan password Anda"
                            value={loginForm.password}
                            onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-gdsk-leaf transition"
                          />
                        </div>

                        {/* Admin Access Code Field (visible if email contains admin) */}
                        {(loginForm.email.includes('admin') || loginForm.email === 'admin@hospital.com') && (
                          <div className="flex flex-col gap-1.5 bg-amber-500/5 border border-amber-500/20 p-3.5 rounded-xl animate-pulse-once">
                            <label className="text-xs font-bold text-amber-400 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Kode Akses Admin RSPC
                            </label>
                            <input
                              type="password"
                              required
                              placeholder="Masukkan kode ADMINPOS"
                              value={loginForm.accessCode}
                              onChange={(e) => setLoginForm({ ...loginForm, accessCode: e.target.value })}
                              className="bg-slate-900 border border-amber-500/30 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500 transition"
                            />
                            <span className="text-[10px] text-slate-500">Otorisasi Admin RSPC diperlukan untuk melanjutkan.</span>
                          </div>
                        )}

                        <button
                          type="submit"
                          className="w-full mt-2 bg-gradient-to-r from-gdsk-forest to-gdsk-leaf hover:opacity-90 text-white font-bold py-3 rounded-xl shadow-lg shadow-gdsk-forest/25 active:scale-[0.98] transition flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Masuk Sekarang
                        </button>

                        <div className="text-center mt-2 border-t border-slate-850 pt-3">
                          <span className="text-xs text-slate-400">Belum memiliki akun? </span>
                          <button
                            type="button"
                            onClick={() => setAuthMode('register')}
                            className="text-xs text-gdsk-leaf hover:underline font-bold"
                          >
                            Daftar Baru di Sini
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    /* Register View */
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const success = await handleRegister(registerForm);
                        if (success) {
                          setAuthMode('login');
                          setLoginForm({ email: registerForm.email, password: registerForm.password, accessCode: registerForm.accessCode });
                        }
                      }}
                      className="max-w-2xl w-full mx-auto flex flex-col gap-4 bg-slate-950/40 border border-slate-850 p-6 rounded-2xl mt-2"
                    >
                      <h3 className="font-bold text-white text-base border-b border-slate-800 pb-2 flex items-center gap-2">
                        <Users className="w-5 h-5 text-gdsk-leaf" />
                        Registrasi Pengguna Baru
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-slate-350">Nama Lengkap</label>
                          <input
                            type="text"
                            required
                            placeholder="Ahmad Fauzi"
                            value={registerForm.nama}
                            onChange={(e) => setRegisterForm({ ...registerForm, nama: e.target.value })}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-gdsk-leaf transition"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-slate-350">Email / Username</label>
                          <input
                            type="email"
                            required
                            placeholder="nama@hospital.com"
                            value={registerForm.email}
                            onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-gdsk-leaf transition"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-slate-350">Kata Sandi (Password)</label>
                          <input
                            type="password"
                            required
                            placeholder="Minimal 6 karakter"
                            value={registerForm.password}
                            onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-gdsk-leaf transition"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-slate-350">Peran Sistem (Role)</label>
                          <select
                            value={registerForm.role}
                            onChange={(e) => setRegisterForm({ ...registerForm, role: e.target.value })}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-gdsk-leaf transition"
                          >
                            <option value="doctor">Pihak Rumah Sakit (Dokter)</option>
                            <option value="order_taker">Halaman Pasien (Order Taker)</option>
                            <option value="nutritionist">Ahli Gizi (Gizi RSPC)</option>
                            <option value="vendor">Dapur Katering (Vendor)</option>
                            <option value="admin">Administrator GDSK</option>
                          </select>
                        </div>
                      </div>

                      {/* Vendor ID Section */}
                      {registerForm.role === 'vendor' && (
                        <div className="flex flex-col gap-1.5 bg-slate-900/30 border border-slate-800 p-3 rounded-xl animate-pulse-once">
                          <label className="text-xs font-semibold text-slate-350">Pilih ID Vendor Katering</label>
                          <select
                            value={registerForm.vendor_id}
                            onChange={(e) => setRegisterForm({ ...registerForm, vendor_id: e.target.value })}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-gdsk-leaf transition"
                          >
                            <option value="V001">V001 - Catering Sehat Mandiri</option>
                            <option value="V002">V002 - NutriCatering Premium</option>
                            <option value="V003">V003 - DietCatering Sejahtera</option>
                          </select>
                        </div>
                      )}

                      {/* Admin Access Code Section */}
                      {registerForm.role === 'admin' && (
                        <div className="flex flex-col gap-1.5 bg-amber-500/5 border border-amber-500/20 p-3 rounded-xl animate-pulse-once">
                          <label className="text-xs font-bold text-amber-400 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Kode Akses Pendaftaran Admin
                          </label>
                          <input
                            type="password"
                            required
                            placeholder="Masukkan kode ADMINPOS"
                            value={registerForm.accessCode}
                            onChange={(e) => setRegisterForm({ ...registerForm, accessCode: e.target.value })}
                            className="bg-slate-900 border border-amber-500/30 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500 transition"
                          />
                        </div>
                      )}

                      <div className="flex flex-col gap-3 mt-2">
                        <button
                          type="submit"
                          className="w-full bg-gradient-to-r from-gdsk-forest to-gdsk-leaf hover:opacity-90 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-gdsk-forest/25 active:scale-[0.98] transition flex items-center justify-center gap-2"
                        >
                          <Plus className="w-4.5 h-4.5" />
                          Daftar Akun Baru
                        </button>

                        <div className="text-center mt-1 border-t border-slate-850 pt-3">
                          <span className="text-xs text-slate-400">Sudah memiliki akun? </span>
                          <button
                            type="button"
                            onClick={() => setAuthMode('login')}
                            className="text-xs text-gdsk-leaf hover:underline font-bold"
                          >
                            Masuk di Sini
                          </button>
                        </div>
                      </div>
                    </form>
                  )}

                </div>
              </div>
            )}

            {/* PORTAL DOKTER (RUMAH SAKIT) */}
            {currentUser && currentUser.role === 'doctor' && (
              <div className="flex flex-col gap-6 animate-pulse-once">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-extrabold text-white flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse"></span>
                      Pihak Rumah Sakit RSPC - Penginputan Diagnosis Pasien
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">Gunakan panel ini untuk mendaftarkan pasien baru RSPC dan menginput hasil diagnosis dokter agar diproses oleh AI GDSK.</p>
                  </div>
                  <button
                    onClick={() => setShowAddPatient(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-gdsk-forest to-gdsk-leaf hover:opacity-90 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-gdsk-forest/25 hover:scale-[1.02] transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    Input Diagnosa Pasien Baru
                  </button>
                </div>

                {/* Patient Register Table */}
                <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
                  <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
                    <h3 className="font-bold text-white text-sm">Daftar Pasien RSPC & Mapping Nutrisi AI</h3>
                    <span className="text-xs font-semibold text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">Total: {patients.length} Pasien</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/30 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          <th className="px-6 py-4">Nama Pasien & Kamar</th>
                          <th className="px-6 py-4">Diagnosa Dokter</th>
                          <th className="px-6 py-4">Pola Diet (AI Engine)</th>
                          <th className="px-6 py-4">Target Kalori / Makronutrisi</th>
                          <th className="px-6 py-4">Alergi & Pantangan</th>
                          <th className="px-6 py-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-sm">
                        {patients.map(p => (
                          <tr key={p.id} className="hover:bg-slate-900/30 transition-all duration-150">
                            <td className="px-6 py-4">
                              <div className="font-bold text-white">{p.nama}</div>
                              <div className="text-xs text-slate-400 mt-0.5">{p.mrn} • {p.umur} Thn • <span className="text-slate-300 font-semibold">{p.room_id}</span></div>
                              <div className="text-[10px] text-slate-500 mt-1 flex flex-wrap gap-1.5 items-center">
                                <span className="bg-slate-900 border border-slate-800 text-slate-300 px-1.5 py-0.5 rounded-md font-medium">
                                  {p.jenis_kelamin || 'Laki-laki'}
                                </span>
                                <span className="bg-slate-900 border border-slate-800 text-slate-300 px-1.5 py-0.5 rounded-md font-medium">
                                  {p.berat_badan ? `${p.berat_badan} kg` : 'Estimasi Bawaan'}
                                </span>
                                <span className="bg-slate-900 border border-slate-800 text-slate-300 px-1.5 py-0.5 rounded-md font-medium capitalize">
                                  {p.tingkat_aktivitas === 'gym' ? 'Gym / Angkat Beban' : p.tingkat_aktivitas === 'active' ? 'Aktif' : 'Sedentari'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="bg-gdsk-forest/20 text-gdsk-soft border border-gdsk-leaf/20 px-2.5 py-1 rounded-lg font-semibold inline-block">
                                {p.diagnosa}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-bold text-gdsk-leaf">{p.diet}</div>
                              {p.catatan_klinis && p.catatan_klinis.includes('PERINGATAN KLINIS') ? (
                                <div className="text-[10px] text-amber-400 font-semibold flex items-center gap-1.5 mt-1 bg-amber-500/5 border border-amber-500/10 p-1.5 rounded-md leading-normal">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                                  <span>{p.catatan_klinis}</span>
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-400 italic mt-0.5">{p.catatan_klinis || 'Tidak ada catatan khusus'}</div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-slate-200">{p.kalori_target} Kcal</div>
                              <div className="text-[10px] text-slate-400 mt-0.5 flex gap-1.5">
                                <span>P: {p.protein_target}g</span>
                                <span>L: {p.lemak_target}g</span>
                                <span>K: {p.karbohidrat_target}g</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1.5">
                                {p.alergi && (
                                  <span className="text-amber-600 font-bold text-xs bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5">
                                    <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                                    Alergi: {p.alergi}
                                  </span>
                                )}
                                {p.pantangan && p.pantangan.toLowerCase() !== 'tidak ada' ? (
                                  <span className="text-rose-400 font-bold text-xs bg-rose-500/5 border border-rose-500/20 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5">
                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                                    Pantangan: {p.pantangan}
                                  </span>
                                ) : (
                                  (!p.alergi) && <span className="text-slate-500 text-xs">Aman</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => {
                                  setSelectedPatientForEdit(p);
                                  setEditDiagnosis(p.diagnosa);
                                  setEditAllergy(p.alergi || '');
                                  setEditAge(p.umur || '');
                                  setEditWeight(p.berat_badan || '');
                                  setEditActivity(p.tingkat_aktivitas || 'sedentary');
                                  setEditGender(p.jenis_kelamin || 'Laki-laki');
                                }}
                                className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-lg font-medium transition"
                              >
                                Edit Profil & Diagnosa
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Edit Diagnosis Modal */}
                {selectedPatientForEdit && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
                    <div className="glass-panel-heavy max-w-md w-full rounded-2xl overflow-hidden border border-slate-700 shadow-2xl p-6 flex flex-col gap-4">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <h3 className="font-bold text-white text-lg">Update Diagnosis Klinis</h3>
                        <button onClick={() => setSelectedPatientForEdit(null)} className="text-slate-400 hover:text-white text-xl">&times;</button>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 uppercase font-semibold">Pasien</p>
                        <p className="font-bold text-white text-sm">{selectedPatientForEdit.nama} ({selectedPatientForEdit.mrn})</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-slate-300">Diagnosa Medis RSPC (Bisa Kombinasi):</label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: Hipertensi + Diabetes Mellitus Tipe 2"
                          value={editDiagnosis}
                          onChange={(e) => setEditDiagnosis(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-gdsk-leaf"
                        />
                        <div className="flex flex-wrap gap-1 mt-1">
                          {['Hipertensi', 'Diabetes Mellitus Tipe 2', 'Gastritis Kronis', 'CKD Stadium 3', 'Stroke', 'Pasca Operasi'].map(d => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => setEditDiagnosis(prev => prev ? `${prev} + ${d}` : d)}
                              className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-700"
                            >
                              + {d}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setEditDiagnosis('')}
                            className="text-[10px] bg-red-950/20 hover:bg-red-900/20 text-red-400 px-2 py-0.5 rounded border border-red-900/30 font-semibold"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-slate-300">Umur (Tahun)</label>
                          <input
                            type="number"
                            required
                            placeholder="45"
                            value={editAge}
                            onChange={(e) => setEditAge(e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-gdsk-leaf"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-slate-300">Berat Badan (kg, opsional)</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="Contoh: 65"
                            value={editWeight}
                            onChange={(e) => setEditWeight(e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-gdsk-leaf"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-slate-300">Jenis Kelamin</label>
                          <select
                            value={editGender}
                            onChange={(e) => setEditGender(e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-gdsk-leaf"
                          >
                            <option value="Laki-laki">Laki-laki</option>
                            <option value="Perempuan">Perempuan</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-slate-300">Aktivitas Fisik</label>
                          <select
                            value={editActivity}
                            onChange={(e) => setEditActivity(e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-gdsk-leaf"
                          >
                            <option value="sedentary">Kurang Aktif (Sedentari)</option>
                            <option value="active">Aktif / Berolahraga</option>
                            <option value="gym">Gym / Massa Otot</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 mt-2">
                        <label className="text-xs font-semibold text-slate-300">Alergi Pasien (opsional):</label>
                        <input
                          type="text"
                          placeholder="Contoh: telur, udang, susu (pisahkan dengan koma)"
                          value={editAllergy}
                          onChange={(e) => setEditAllergy(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-gdsk-leaf"
                        />
                      </div>
                      <div className="flex gap-3 mt-2 justify-end">
                        <button
                          onClick={() => setSelectedPatientForEdit(null)}
                          className="px-4 py-2 text-xs font-semibold text-slate-400 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl"
                        >
                          Batal
                        </button>
                        <button
                          onClick={() => handleUpdateDiagnosis(selectedPatientForEdit.id)}
                          className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-gdsk-forest to-gdsk-leaf rounded-xl"
                        >
                          Simpan & Analisis AI
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Add Patient Modal */}
                {showAddPatient && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
                    <form onSubmit={handleAddPatient} className="glass-panel-heavy max-w-lg w-full rounded-2xl overflow-hidden border border-slate-700 shadow-2xl p-6 flex flex-col gap-4">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <h3 className="font-bold text-white text-lg">Pendaftaran & Rekam Diagnosis Pasien RSPC</h3>
                        <button type="button" onClick={() => setShowAddPatient(false)} className="text-slate-400 hover:text-white">&times;</button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-slate-300">Nama Lengkap Pasien</label>
                          <input
                            type="text"
                            required
                            placeholder="Ahmad Fauzi"
                            value={newPatient.nama}
                            onChange={(e) => setNewPatient({ ...newPatient, nama: e.target.value })}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-gdsk-leaf"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-slate-300">Nomor Rekam Medis (MRN)</label>
                          <input
                            type="text"
                            required
                            placeholder="MRN-2026-9876"
                            value={newPatient.mrn}
                            onChange={(e) => setNewPatient({ ...newPatient, mrn: e.target.value })}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-gdsk-leaf"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-slate-300">Umur (Tahun)</label>
                          <input
                            type="number"
                            required
                            placeholder="45"
                            value={newPatient.umur}
                            onChange={(e) => setNewPatient({ ...newPatient, umur: e.target.value })}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-gdsk-leaf"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-slate-300">Nomor Kamar Rawat</label>
                          <input
                            type="text"
                            required
                            placeholder="Cempaka 304"
                            value={newPatient.room_id}
                            onChange={(e) => setNewPatient({ ...newPatient, room_id: e.target.value })}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-gdsk-leaf"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-slate-300">Berat Badan (kg)</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="Opsional"
                            value={newPatient.berat_badan}
                            onChange={(e) => setNewPatient({ ...newPatient, berat_badan: e.target.value })}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-gdsk-leaf"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-slate-300">Jenis Kelamin</label>
                          <select
                            value={newPatient.jenis_kelamin}
                            onChange={(e) => setNewPatient({ ...newPatient, jenis_kelamin: e.target.value })}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-gdsk-leaf"
                          >
                            <option value="Laki-laki">Laki-laki</option>
                            <option value="Perempuan">Perempuan</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-slate-300">Aktivitas Fisik</label>
                          <select
                            value={newPatient.tingkat_aktivitas}
                            onChange={(e) => setNewPatient({ ...newPatient, tingkat_aktivitas: e.target.value })}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-gdsk-leaf"
                          >
                            <option value="sedentary">Kurang Aktif (Sedentari)</option>
                            <option value="active">Aktif / Olahraga</option>
                            <option value="gym">Gym / Massa Otot</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-slate-300">Diagnosa Klinis Dokter (Bisa Kombinasi)</label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: Hipertensi + Diabetes Mellitus Tipe 2"
                          value={newPatient.diagnosa}
                          onChange={(e) => setNewPatient({ ...newPatient, diagnosa: e.target.value })}
                          className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-gdsk-leaf"
                        />
                        <div className="flex flex-wrap gap-1 mt-1">
                          {['Hipertensi', 'Diabetes Mellitus Tipe 2', 'Gastritis Kronis', 'CKD Stadium 3', 'Stroke', 'Pasca Operasi'].map(d => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => {
                                const current = newPatient.diagnosa;
                                setNewPatient({
                                  ...newPatient,
                                  diagnosa: current ? `${current} + ${d}` : d
                                });
                              }}
                              className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-700"
                            >
                              + {d}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setNewPatient({ ...newPatient, diagnosa: '' })}
                            className="text-[10px] bg-red-950/20 hover:bg-red-900/20 text-red-400 px-2 py-0.5 rounded border border-red-900/30 font-semibold"
                          >
                            Reset
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-slate-300">Alergi Pasien (opsional)</label>
                        <input
                          type="text"
                          placeholder="Contoh: udang, kacang, susu (pisahkan dengan koma)"
                          value={newPatient.alergi}
                          onChange={(e) => setNewPatient({ ...newPatient, alergi: e.target.value })}
                          className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-gdsk-leaf"
                        />
                      </div>

                      <div className="flex gap-3 mt-4 justify-end">
                        <button
                          type="button"
                          onClick={() => setShowAddPatient(false)}
                          className="px-4 py-2.5 text-xs font-semibold text-slate-400 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-gdsk-forest to-gdsk-leaf rounded-xl shadow-lg shadow-gdsk-forest/25"
                        >
                          Simpan & Analisis AI
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* PORTAL PASIEN (ORDER TAKER INTERFACE) */}
            {currentUser && currentUser.role === 'order_taker' && (
              <div className="flex flex-col gap-6">
                {!activePatient ? (
                  // Grid Kamar Pasien (Room Selection Grid)
                  <div className="flex flex-col gap-6">
                    <div className="flex justify-between items-center flex-wrap gap-4">
                      <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                          <Home className="w-5 h-5 text-gdsk-leaf" />
                          Pilih Kamar & Identitas Pasien RSPC
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">Silakan pilih kamar pasien untuk mulai merancang menu makanan harian.</p>
                      </div>
                      
                      {/* Search Bar for patients/rooms */}
                      <div className="relative w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          placeholder="Cari nama pasien, MRN, atau nomor kamar..."
                          value={patientSearchQuery}
                          onChange={(e) => setPatientSearchQuery(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-700 transition"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {[...patients]
                        .sort((a, b) => (a.room_id || '').localeCompare(b.room_id || '', undefined, { numeric: true, sensitivity: 'base' }))
                        .filter(p => {
                          const query = (patientSearchQuery || '').toLowerCase();
                          return p.nama.toLowerCase().includes(query) ||
                            p.mrn.toLowerCase().includes(query) ||
                            (p.room_id || '').toLowerCase().includes(query);
                        })
                        .map(p => {
                          const patientOrders = orders.filter(o => o.patient_id === p.id);
                          const hasOrdered = patientOrders.length > 0;

                          return (
                            <button
                              key={p.id}
                              onClick={() => {
                                setActivePatient(p);
                                localStorage.setItem('activePatient', JSON.stringify(p));
                                setAiMeals(null);

                                const patientOrders = orders.filter(o => o.patient_id === p.id);
                                if (patientOrders.length > 0) {
                                  const latestOrder = patientOrders[patientOrders.length - 1];
                                  const populatedMeals = {
                                    sarapan: { pokok: null, lauk_utama: null, lauk_nabati: null, sayur: null, dessert: null },
                                    makan_siang: { pokok: null, lauk_utama: null, lauk_nabati: null, sayur: null, dessert: null },
                                    makan_malam: { pokok: null, lauk_utama: null, lauk_nabati: null, sayur: null, dessert: null }
                                  };
                                  if (latestOrder.items) {
                                    Object.keys(latestOrder.items).forEach(mealTime => {
                                      if (populatedMeals[mealTime]) {
                                        Object.keys(latestOrder.items[mealTime]).forEach(category => {
                                          populatedMeals[mealTime][category] = latestOrder.items[mealTime][category];
                                        });
                                      }
                                    });
                                  }
                                  setCustomMeals(populatedMeals);
                                } else {
                                  setCustomMeals({
                                    sarapan: { pokok: null, lauk_utama: null, lauk_nabati: null, sayur: null, dessert: null },
                                    makan_siang: { pokok: null, lauk_utama: null, lauk_nabati: null, sayur: null, dessert: null },
                                    makan_malam: { pokok: null, lauk_utama: null, lauk_nabati: null, sayur: null, dessert: null }
                                  });
                                }
                              }}
                              className="text-left p-5 rounded-2xl border bg-slate-900/40 border-slate-800/80 hover:bg-slate-900 hover:border-gdsk-leaf/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex flex-col gap-3 group relative overflow-hidden shadow-lg hover:shadow-gdsk-forest/5"
                            >
                              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-gdsk-leaf/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-bl-full pointer-events-none"></div>

                              <div className="flex justify-between items-start gap-2">
                                <div className="text-[11px] font-extrabold uppercase text-slate-400 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg tracking-wider leading-none">
                                  {p.room_id}
                                </div>
                                {hasOrdered ? (
                                  <span className="text-[9px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                                    Sudah Order
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded">
                                    Belum Order
                                  </span>
                                )}
                              </div>

                              <div>
                                <h4 className="font-extrabold text-sm text-white group-hover:text-gdsk-soft transition-colors duration-200">{p.nama}</h4>
                                <p className="text-[10px] text-slate-400 mt-1 leading-none">MRN: {p.mrn}</p>
                              </div>

                              <div className="flex flex-col gap-1.5 pt-3.5 border-t border-slate-800/60 mt-1">
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="text-slate-500">Diagnosis:</span>
                                  <span className="font-bold text-slate-300">{p.diagnosa}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="text-slate-500">Diet:</span>
                                  <span className="font-semibold text-gdsk-soft">{p.diet}</span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                ) : (
                  // Catering Builder View (Column 1 EMR Card + Column 2 & 3 Catalog)
                  <div className="flex flex-col gap-6">
                    <div className="flex justify-between items-center flex-wrap gap-4 pb-4 border-b border-slate-800/60">
                      <button
                        onClick={() => {
                          setActivePatient(null);
                          localStorage.removeItem('activePatient');
                          setAiMeals(null);
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-slate-300 text-xs font-bold hover:border-slate-700 transition hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-slate-950/20"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Kembali ke Pilih Kamar
                      </button>
                      <div className="text-xs text-slate-400 font-medium">
                        Sedang merancang menu untuk: <span className="font-bold text-white">{activePatient.nama}</span> ({activePatient.room_id})
                      </div>
                    </div>
                    {orders.some(o => o.patient_id === activePatient.id) && (
                      <div className="bg-amber-950/40 border border-amber-500/20 p-4 rounded-2xl flex items-start gap-3 text-amber-200">
                        <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0 animate-pulse" />
                        <div className="text-xs flex flex-col gap-1.5 leading-relaxed">
                          <span className="font-extrabold text-sm text-white">⚠️ Penyesuaian Menu Makanan (Mid-Day Diagnosis Change)</span>
                          <span>Pasien memiliki order katering aktif hari ini. Jika terdapat perubahan diagnosis/diet dari dokter, Anda dapat memperbarui menu makanan untuk waktu makan mendatang (makan siang/malam).</span>
                          <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded w-max mt-0.5">
                            Pemberitahuan: Sarapan terkunci setelah 09:00 WIB • Makan Siang terkunci setelah 14:00 WIB.
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Column 1: EMR Profile Card & History */}
                      <div className="lg:col-span-1 flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-gdsk-leaf"></span>
                          <h3 className="text-lg font-bold text-white">1. Profil Klinis Pasien</h3>
                        </div>
                        
                        <div className="glass-panel rounded-2xl border border-slate-800 p-5 flex flex-col gap-4 bg-slate-950/20">
                          <div>
                            <div className="text-[10px] font-extrabold uppercase text-gdsk-soft bg-gdsk-forest/10 border border-gdsk-leaf/20 px-2.5 py-1 rounded-lg w-max tracking-wider">
                              {activePatient.room_id}
                            </div>
                            <h4 className="text-lg font-extrabold text-white mt-2.5">{activePatient.nama}</h4>
                            <p className="text-xs text-slate-400 mt-1">MRN: {activePatient.mrn} • Usia: {activePatient.umur} Thn</p>
                          </div>

                          <div className="flex flex-col gap-3 pt-4 border-t border-slate-800/80">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-500">Diagnosis:</span>
                              <span className="font-bold text-slate-200">{activePatient.diagnosa}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-500">Diet Terapi:</span>
                              <span className="font-extrabold text-gdsk-soft">{activePatient.diet}</span>
                            </div>
                            {activePatient.pantangan && (
                              <div className="flex flex-col gap-1 mt-1">
                                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Pantangan Makanan</span>
                                <div className="text-xs text-rose-300 bg-rose-500/5 border border-rose-500/10 p-2.5 rounded-lg leading-relaxed">
                                  {activePatient.pantangan}
                                </div>
                              </div>
                            )}
                            {activePatient.catatan_klinis && (
                              <div className="flex flex-col gap-1 mt-1">
                                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Catatan Klinis</span>
                                <div className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg leading-relaxed">
                                  {activePatient.catatan_klinis}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Active Patient Order Status Tracking Panel */}
                        <div className="glass-panel rounded-2xl border border-slate-800 p-4 flex flex-col gap-3">
                          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                            <Clock className="w-4 h-4 text-gdsk-leaf" />
                            <h4 className="text-xs font-extrabold uppercase text-slate-300 tracking-wider">Status Pengiriman Katering</h4>
                          </div>

                          {orders.filter(o => o.patient_id === activePatient.id).length === 0 ? (
                            <p className="text-xs text-slate-500 italic py-2">Belum ada riwayat pesanan.</p>
                          ) : (
                            <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto">
                              {orders.filter(o => o.patient_id === activePatient.id).map(o => (
                                <div key={o.id} className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl flex flex-col gap-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-slate-400 font-semibold">{o.tanggal}</span>
                                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${o.status === 'Pending' ? 'bg-slate-900 border-slate-800 text-slate-400' :
                                        o.status === 'Approved' ? 'bg-sky-500/10 border-sky-500/20 text-sky-400' :
                                          o.status === 'Diproduksi' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                            o.status === 'Dikirim' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 animate-pulse' :
                                              'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 font-bold'
                                      }`}>
                                      {o.status === 'Pending' ? 'Menunggu Ahli Gizi' :
                                        o.status === 'Approved' ? 'Disetujui Dapur' :
                                          o.status === 'Diproduksi' ? 'Sedang Dimasak' :
                                            o.status === 'Dikirim' ? 'Dalam Pengiriman' : 'Sudah Diterima'}
                                    </span>
                                  </div>

                                  <div className="text-[11px] text-slate-300 leading-normal">
                                    {Object.keys(o.items || {}).map(meal => {
                                      const itemsList = Object.values(o.items[meal]).map(it => it.nama_menu).join(', ');
                                      return `${meal.toUpperCase().replace('_', ' ')}: ${itemsList}`;
                                    }).join(' | ')}
                                  </div>

                                  {o.status === 'Dikirim' && (
                                    <button
                                      onClick={() => handleUpdateOrderStatus(o.id, 'Diterima')}
                                      className="w-full text-center bg-gradient-to-r from-gdsk-forest to-gdsk-leaf text-white font-bold text-xs py-2 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition shadow-lg shadow-gdsk-forest/20"
                                    >
                                      Konfirmasi Terima Makanan
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                {/* Column 2 & 3: Patient-Facing Menu Menu Selector */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-gdsk-soft animate-pulse-subtle" />
                      2. Katalog Menu Pasien RSPC (Disaring AI GDSK)
                    </h3>
                    {activePatient && (
                      <button
                        onClick={() => generateAIMealProposal(activePatient)}
                        disabled={buildingMeals}
                        className="flex items-center gap-2 text-xs font-bold text-white bg-gradient-to-r from-gdsk-forest to-gdsk-leaf px-4 py-2 rounded-xl shadow-lg shadow-gdsk-forest/25 hover:scale-[1.02] active:scale-[0.98] transition disabled:opacity-50"
                      >
                        <Sparkles className="w-4 h-4" />
                        {buildingMeals ? 'Menyusun...' : 'Rancang Menu AI'}
                      </button>
                    )}
                  </div>

                  {!activePatient ? (
                    <div className="glass-panel rounded-2xl border border-slate-800/80 p-16 text-center flex flex-col items-center justify-center gap-3 bg-slate-900/10">
                      <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                        <Users className="w-6 h-6" />
                      </div>
                      <p className="text-slate-400 text-sm font-medium">Silakan pilih pasien di samping kiri terlebih dahulu.</p>
                      <p className="text-slate-500 text-xs max-w-xs leading-relaxed">Pasien dapat memilih paket menu makanan harian yang diperbolehkan berdasarkan filter AI dari database menu GDSK.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-6">

                      {/* Active Patient Details Banner */}
                      <div className="glass-panel rounded-2xl p-5 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/30">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-gdsk-leaf uppercase tracking-wider font-bold">Pilihan Menu Mandiri Pasien</span>
                          <h4 className="text-lg font-bold text-white">{activePatient.nama} ({activePatient.mrn})</h4>
                          <p className="text-xs text-slate-400">Diagnosis RSPC: <span className="text-gdsk-leaf font-semibold">{activePatient.diagnosa}</span> | Diet: <span className="text-gdsk-soft font-semibold">{activePatient.diet}</span></p>
                        </div>
                        <div className="bg-slate-950 border border-slate-800/80 p-3.5 rounded-xl flex flex-col gap-1">
                          <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">Alergen & Pantangan Pasien</span>
                          <p className="text-xs text-rose-400 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Pantangan: <span className="font-bold">{activePatient.pantangan || 'Tidak ada'}</span>
                          </p>
                          <p className="text-[11px] text-slate-400 font-medium">Target Harian: {activePatient.kalori_target} Kcal | P: {activePatient.protein_target}g</p>
                        </div>
                      </div>

                      {/* Live Daily Nutrition Tracker */}
                      {(() => {
                        let totalCal = 0, totalProt = 0, totalFat = 0, totalCarb = 0;
                        Object.keys(customMeals).forEach(mealTime => {
                          Object.keys(customMeals[mealTime]).forEach(category => {
                            const item = customMeals[mealTime][category];
                            if (item) {
                              totalCal += item.kalori_kcal || 0;
                              totalProt += item.protein_g || 0;
                              totalFat += item.lemak_g || 0;
                              totalCarb += item.karbohidrat_g || 0;
                            }
                          });
                        });

                        const calPercent = Math.min((totalCal / activePatient.kalori_target) * 100, 100);
                        const protPercent = Math.min((totalProt / activePatient.protein_target) * 100, 100);
                        const fatPercent = Math.min((totalFat / activePatient.lemak_target) * 100, 100);
                        const carbPercent = Math.min((totalCarb / activePatient.karbohidrat_target) * 100, 100);

                        let proteinMultiplier = 1.1; // Default 10% buffer
                        const dietLower = (activePatient.diet || '').toLowerCase();
                        if (dietLower.includes('tinggi protein') || dietLower.includes('tetp') || dietLower.includes('dialisis')) {
                          proteinMultiplier = 1.5; // High protein diets get a generous 50% buffer
                        } else if (dietLower.includes('rendah protein') || dietLower.includes('ginjal') || dietLower.includes('sirosis')) {
                          proteinMultiplier = 1.05; // Strict 5% buffer for restricted renal/hepatic patients
                        }

                        const isCalExceeded = totalCal > activePatient.kalori_target * 1.1;
                        const isProtExceeded = totalProt > activePatient.protein_target * proteinMultiplier;
                        const isFatExceeded = totalFat > activePatient.lemak_target * 1.1;
                        const isCarbExceeded = totalCarb > activePatient.karbohidrat_target * 1.1;

                        return (
                          <div className="glass-panel rounded-2xl p-5 border border-slate-800/80 bg-slate-900/20 flex flex-col gap-4">

                            {/* Medically validated calorie target rationale */}
                            <div className="bg-slate-950/40 border border-slate-800/80 p-3.5 rounded-xl text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
                              <Info className="w-4 h-4 text-gdsk-soft mt-0.5 flex-shrink-0" />
                              <div>
                                <span className="font-bold text-white block mb-0.5">💡 Info Standar Konsumsi Gizi RSPC:</span>
                                Target kalori harian pasien rawat inap (1400-1900 Kcal) disesuaikan dengan kebutuhan energi basal dan tingkat aktivitas fisik minimal (tirah baring/bedrest) sesuai pedoman klinis (ESPEN/ASPEN). Pembatasan ini bertujuan menghindari kelelahan metabolik dan sindrom overfeeding selama masa pemulihan.
                              </div>
                            </div>

                            <div className="flex justify-between items-center flex-wrap gap-2">
                              <h5 className="text-xs font-extrabold uppercase text-slate-300 tracking-wider">Akurasi Nutrisi Paket Terpilih (Harian)</h5>
                              {(isCalExceeded || isProtExceeded || isFatExceeded || isCarbExceeded) && (
                                <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded border border-rose-500/20 flex items-center gap-1.5 animate-pulse">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  Batas Toleransi Gizi Harian Terlampaui (+10% Maks)
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {/* Kalori */}
                              <div className="flex flex-col gap-1.5">
                                <div className="flex justify-between text-xs font-semibold">
                                  <span className="text-slate-400">Kalori</span>
                                  <span className={isCalExceeded ? "text-rose-400 font-bold" : "text-slate-200"}>
                                    {totalCal.toFixed(0)} / {activePatient.kalori_target} Kcal
                                  </span>
                                </div>
                                <div className="w-full bg-slate-950 rounded-full h-2 border border-slate-800 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${isCalExceeded ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${Math.min((totalCal / activePatient.kalori_target) * 100, 100)}%` }}
                                  ></div>
                                </div>
                              </div>

                              {/* Protein */}
                              <div className="flex flex-col gap-1.5">
                                <div className="flex justify-between text-xs font-semibold">
                                  <span className="text-slate-400">Protein</span>
                                  <span className={isProtExceeded ? "text-rose-400 font-bold" : "text-slate-200"}>
                                    {totalProt.toFixed(0)}g / {activePatient.protein_target}g
                                  </span>
                                </div>
                                <div className="w-full bg-slate-950 rounded-full h-2 border border-slate-800 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${isProtExceeded ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${Math.min((totalProt / activePatient.protein_target) * 100, 100)}%` }}
                                  ></div>
                                </div>
                              </div>

                              {/* Lemak */}
                              <div className="flex flex-col gap-1.5">
                                <div className="flex justify-between text-xs font-semibold">
                                  <span className="text-slate-400">Lemak</span>
                                  <span className={isFatExceeded ? "text-rose-400 font-bold" : "text-slate-200"}>
                                    {totalFat.toFixed(0)}g / {activePatient.lemak_target}g
                                  </span>
                                </div>
                                <div className="w-full bg-slate-950 rounded-full h-2 border border-slate-800 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${isFatExceeded ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${Math.min((totalFat / activePatient.lemak_target) * 100, 100)}%` }}
                                  ></div>
                                </div>
                              </div>

                              {/* Karbohidrat */}
                              <div className="flex flex-col gap-1.5">
                                <div className="flex justify-between text-xs font-semibold">
                                  <span className="text-slate-400">Karbohidrat</span>
                                  <span className={isCarbExceeded ? "text-rose-400 font-bold" : "text-slate-200"}>
                                    {totalCarb.toFixed(0)}g / {activePatient.karbohidrat_target}g
                                  </span>
                                </div>
                                <div className="w-full bg-slate-950 rounded-full h-2 border border-slate-800 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${isCarbExceeded ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${Math.min((totalCarb / activePatient.karbohidrat_target) * 100, 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>

                            {/* Tracking Kalori Per-Waktu Makan */}
                            <div className="border-t border-slate-800/60 pt-4 mt-2 flex flex-col gap-3">
                              <h5 className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Tracking Kalori Per-Waktu Makan</h5>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {['sarapan', 'makan_siang', 'makan_malam'].map(mealTime => {
                                  let ratio = 0.35;
                                  let label = "Makan Malam";
                                  if (mealTime === 'sarapan') {
                                    ratio = 0.25;
                                    label = "Sarapan (Pagi)";
                                  } else if (mealTime === 'makan_siang') {
                                    ratio = 0.40;
                                    label = "Makan Siang";
                                  }

                                  const targetCal = activePatient.kalori_target * ratio;
                                  const limitCal = targetCal * 1.1;

                                  // calculate selected calories for this mealTime
                                  let selectedCal = 0;
                                  Object.keys(customMeals[mealTime] || {}).forEach(cat => {
                                    const item = customMeals[mealTime][cat];
                                    if (item) {
                                      selectedCal += item.kalori_kcal || 0;
                                    }
                                  });

                                  const percent = Math.min((selectedCal / targetCal) * 100, 100);
                                  const isExceeded = selectedCal > limitCal;

                                  return (
                                    <div key={mealTime} className="bg-slate-950/40 border border-slate-800/60 p-3 rounded-xl flex flex-col gap-1.5">
                                      <div className="flex justify-between text-xs font-semibold">
                                        <span className="text-slate-400 font-medium">{label}</span>
                                        <span className={isExceeded ? "text-rose-400 font-bold" : "text-slate-200"}>
                                          {selectedCal.toFixed(0)} / {targetCal.toFixed(0)} Kcal
                                        </span>
                                      </div>

                                      <div className="w-full bg-slate-950 rounded-full h-1.5 border border-slate-900 overflow-hidden">
                                        <div
                                          className={`h-full rounded-full transition-all duration-300 ${isExceeded ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                          style={{ width: `${percent}%` }}
                                        ></div>
                                      </div>

                                      <div className="flex justify-between items-center text-[9px] text-slate-500 leading-none">
                                        <span>Rasio: {ratio * 100}%</span>
                                        {isExceeded ? (
                                          <span className="text-rose-400 font-bold">Melebihi Batas!</span>
                                        ) : (
                                          <span>Sisa: {Math.max(0, limitCal - selectedCal).toFixed(0)} Kcal</span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                          </div>
                        );
                      })()}

                      {/* Built Meals Display */}
                      {aiMeals ? (
                        <div className="flex flex-col gap-6">

                          {/* Built meal time slots */}
                          {['sarapan', 'makan_siang', 'makan_malam'].map(mealTime => {
                            const mealData = aiMeals[mealTime];
                            const customItems = customMeals[mealTime];
                            const isLocked = getLockedMeals().includes(mealTime);

                            // Calc selected total calories for this meal
                            const selectedCal = Object.values(customItems).reduce((sum, item) => sum + (item?.kalori_kcal || 0), 0);

                            return (
                              <div key={mealTime} className="glass-panel rounded-2xl border border-slate-800 bg-slate-900/10 overflow-hidden">
                                <div className="px-5 py-4 bg-slate-900/70 border-b border-slate-800 flex items-center justify-between">
                                  <h4 className="font-bold text-white capitalize flex items-center gap-2">
                                    <Clock className="w-4.5 h-4.5 text-gdsk-leaf" />
                                    Paket Makan: {mealTime.replace('_', ' ')}
                                  </h4>
                                  <div className="text-xs text-slate-400 flex items-center gap-4">
                                    {isLocked && (
                                      <span className="text-[10px] font-bold bg-rose-500/10 border border-rose-500/25 text-rose-400 px-2.5 py-0.5 rounded-full">
                                        Sudah Disajikan (Terkunci)
                                      </span>
                                    )}
                                    <span>Target AI: {Math.round(mealData.targets.kalori_kcal)} kcal</span>
                                    <span className="text-gdsk-soft font-bold bg-gdsk-forest/20 border border-gdsk-leaf/20 px-2 py-0.5 rounded-full">
                                      Terpilih: {selectedCal.toFixed(0)} kcal
                                    </span>
                                  </div>
                                </div>

                                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                                  {['pokok', 'lauk_utama', 'lauk_nabati', 'sayur', 'dessert'].map(cat => {
                                    const item = customItems[cat];
                                    return (
                                      <div key={cat} className="flex flex-col gap-1.5">
                                        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex justify-between items-center">
                                          <span>{cat.replace('_', ' ')}</span>
                                          <div className="flex items-center gap-2">
                                            {isLocked ? (
                                              <span className="text-[9px] font-bold text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-900 leading-none">
                                                Terkunci
                                              </span>
                                            ) : (
                                              <>
                                                <button
                                                  onClick={() => searchMenuItems(cat, mealTime)}
                                                  className="text-gdsk-soft hover:text-gdsk-leaf font-semibold hover:underline"
                                                >
                                                  {item ? 'Ubah' : 'Pilih'}
                                                </button>
                                                {item && (
                                                  <button
                                                    onClick={() => removeCustomItem(mealTime, cat)}
                                                    className="text-rose-400 hover:text-rose-300 font-semibold hover:underline"
                                                  >
                                                    Hapus
                                                  </button>
                                                )}
                                              </>
                                            )}
                                          </div>
                                        </div>

                                        {item ? (
                                          <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl flex flex-col justify-between min-h-[100px] hover:border-slate-700 transition">
                                            <div className="font-bold text-xs text-white leading-normal line-clamp-2">{item.nama_menu}</div>
                                            <div className="text-[10px] text-slate-400 mt-2 flex flex-col gap-1 border-t border-slate-800/80 pt-1.5">
                                              <div className="flex justify-between">
                                                <span>{item.kalori_kcal} kcal</span>
                                                <span className="font-medium">P: {item.protein_g}g</span>
                                              </div>
                                              {item.sodium_mg !== undefined && (
                                                <div className="flex justify-between text-[9px] text-slate-500 font-medium leading-none mt-0.5">
                                                  <span>Na: {Math.round(item.sodium_mg)}mg</span>
                                                  <span>Gula: {Math.round(item.sugar_g)}g</span>
                                                </div>
                                              )}
                                              {item.similarity_score && (
                                                <div className="flex items-center justify-between text-[10px] text-gdsk-soft font-bold bg-gdsk-forest/10 border border-gdsk-leaf/20 px-1.5 py-0.5 rounded mt-1">
                                                  <span>Kesesuaian AI:</span>
                                                  <span>{Math.round(item.similarity_score * 100)}%</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="border border-dashed border-slate-800 p-4 rounded-xl flex items-center justify-center min-h-[100px] text-center bg-slate-900/20">
                                            <button
                                              onClick={() => searchMenuItems(cat, mealTime)}
                                              className="text-[10px] text-slate-500 hover:text-gdsk-leaf font-semibold"
                                            >
                                              + Tambah {cat.replace('_', ' ')}
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}

                          {/* Submit button */}
                          <div className="flex justify-end gap-3 mt-2">
                            <button
                              onClick={() => {
                                setAiMeals(null);
                              }}
                              className="px-5 py-3 text-xs font-semibold text-slate-400 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl"
                            >
                              Batal
                            </button>
                            <button
                              onClick={submitPatientOrder}
                              className="px-6 py-3.5 text-xs font-bold text-white bg-gradient-to-r from-gdsk-forest to-gdsk-leaf rounded-xl shadow-lg shadow-gdsk-forest/25 hover:scale-[1.02] transition"
                            >
                              Kirim Order ke Ahli Gizi
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="glass-panel rounded-2xl border border-slate-800/80 p-16 text-center flex flex-col items-center justify-center gap-3 bg-slate-900/10">
                          <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-gdsk-leaf animate-pulse-subtle">
                            <Sparkles className="w-6 h-6" />
                          </div>
                          <p className="text-slate-200 font-bold text-sm">GDSK AI Recommendation Ready</p>
                          <p className="text-slate-400 text-xs max-w-sm leading-relaxed">Klik tombol "Rancang Menu AI" di kanan atas untuk menyaring menu otomatis menggunakan <strong>Cosine Similarity (Kecocokan Profil Gizi GDSK)</strong> dan memblokir makanan pantangan pasien.</p>
                        </div>
                      )}

                      {/* Custom Search Selector Side Panel (Modal) */}
                      {searchResults.length > 0 && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
                          <div className="glass-panel-heavy max-w-lg w-full rounded-2xl overflow-hidden border border-slate-700 shadow-2xl p-6 flex flex-col gap-4">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                              <h3 className="font-bold text-white text-lg capitalize font-sans">
                                Cari Alternatif: {searchCategory.replace('_', ' ')}
                              </h3>
                              <button onClick={() => setSearchResults([])} className="text-slate-400 hover:text-white text-xl">&times;</button>
                            </div>

                            <p className="text-xs text-slate-400">
                              Daftar menu aman GDSK yang disaring dan diurutkan berdasarkan **persentase kecocokan rasio nutrisi** (Cosine Similarity) terhadap target {searchTargetMealTime}:
                            </p>

                            <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto">
                              {searchResults.map(item => (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl hover:border-gdsk-leaf/40 transition-all"
                                >
                                  <div>
                                    <div className="font-bold text-xs text-white">{item.nama_menu}</div>
                                    <div className="text-[10px] text-slate-400 mt-1 flex gap-3 flex-wrap">
                                      <span>Kalori: {item.kalori_kcal} kcal</span>
                                      <span>P: {item.protein_g}g</span>
                                      <span>L: {item.lemak_g}g</span>
                                      <span>K: {item.karbohidrat_g}g</span>
                                    </div>
                                    {item.sodium_mg !== undefined && (
                                      <div className="text-[9px] font-semibold mt-1 flex gap-3 flex-wrap">
                                        <span style={{ color: '#b45309' }}>Natrium: {Math.round(item.sodium_mg)}mg</span>
                                        <span style={{ color: '#e11d48' }}>Gula: {Math.round(item.sugar_g)}g</span>
                                        <span style={{ color: '#4338ca' }}>Kalium: {Math.round(item.potassium_mg)}mg</span>
                                        <span style={{ color: '#047857' }}>Serat: {item.fiber_g}g</span>
                                      </div>
                                    )}
                                    <div className="text-[9px] text-slate-500 mt-1">Aman untuk: {item.jenis_diet}</div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-bold text-gdsk-soft bg-gdsk-forest/10 border border-gdsk-leaf/20 px-2 py-0.5 rounded">
                                      {Math.round(item.similarity_score * 100)}% Match
                                    </span>
                                    <button
                                      onClick={() => {
                                        selectCustomItem(searchTargetMealTime, searchCategory, item);
                                        setSearchResults([]);
                                      }}
                                      className="text-xs font-bold bg-gradient-to-r from-gdsk-forest to-gdsk-leaf text-white px-3 py-1.5 rounded-lg"
                                    >
                                      Pilih
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

            {/* PORTAL AHLI GIZI (APPROVAL PAGE) */}
            {currentUser && currentUser.role === 'nutritionist' && (
              <div className="flex flex-col gap-6 animate-pulse-once">
                <div>
                  <h2 className="text-2xl font-extrabold text-white flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-gdsk-leaf animate-pulse"></span>
                    Portal Approval Ahli Gizi RSPC
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">Review diet harian, cek kecocokan alergi dan pantangan pasien, verifikasi kandungan kalori, lalu sahkan pesanan untuk diteruskan ke vendor GDSK.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                  {/* Left Column: Pending Validation Queue */}
                  <div className="lg:col-span-1 flex flex-col gap-4">
                    <h3 className="text-md font-bold text-white flex items-center gap-2">
                      <Clock className="w-5 h-5 text-gdsk-leaf" />
                      Persetujuan Menu Hidangan Harian (Pending)
                    </h3>

                    <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto">
                      {orders.filter(o => o.status === 'Pending').length === 0 ? (
                        <div className="glass-panel border border-slate-800 p-8 rounded-2xl text-center flex flex-col gap-2 justify-center items-center bg-slate-900/10">
                          <CheckCircle className="w-10 h-10 text-gdsk-leaf" />
                          <p className="text-slate-300 text-sm font-semibold">Semua Beres!</p>
                          <p className="text-slate-500 text-xs">Belum ada antrean order baru yang memerlukan validasi.</p>
                        </div>
                      ) : (
                        orders.filter(o => o.status === 'Pending').map(o => {
                          const patient = patients.find(p => p.id === o.patient_id);
                          if (!patient) return null;

                          // Check if order items contain any matching patient pantangan keywords (Allergy Warning!)
                          let hasAllergyRisk = false;
                          const pantanganKeywords = patient.pantangan ? patient.pantangan.toLowerCase().split(',') : [];

                          Object.keys(o.items || {}).forEach(meal => {
                            Object.keys(o.items[meal] || {}).forEach(cat => {
                              const itemName = o.items[meal][cat].nama_menu.toLowerCase();
                              pantanganKeywords.forEach(keyword => {
                                if (keyword.trim && keyword.trim() && itemName.includes(keyword.trim())) {
                                  hasAllergyRisk = true;
                                }
                              });
                            });
                          });

                          return (
                            <div key={o.id} className={`glass-panel border p-4 rounded-xl flex flex-col gap-3 transition ${hasAllergyRisk ? 'border-rose-500/30 bg-rose-950/10' : 'border-slate-800'
                              }`}>
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-bold text-white text-sm">{o.patient_name}</h4>
                                  <p className="text-[10px] text-slate-400 mt-0.5">{o.patient_mrn} • {o.patient_room} • <span className="font-semibold text-gdsk-soft">{formatOrderTime(o)}</span></p>
                                </div>
                                <span className="bg-gdsk-forest/20 text-gdsk-soft border border-gdsk-leaf/20 text-[10px] font-semibold px-2 py-0.5 rounded">Pending</span>
                              </div>

                              <div className="border-t border-slate-800/80 pt-2 flex flex-col gap-1">
                                <p className="text-xs text-indigo-400 font-semibold">Diagnosa RSPC: {patient.diagnosa}</p>
                                <p className="text-xs text-gdsk-soft font-semibold">Diet AI: {patient.diet}</p>
                                <p className="text-xs text-rose-400 font-bold">Alergi/Pantangan: {patient.pantangan || 'Tidak ada'}</p>
                                {patient.catatan_klinis && patient.catatan_klinis.includes('PERINGATAN KLINIS') ? (
                                  <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg text-xs text-amber-300 flex items-start gap-2 mt-2 leading-relaxed">
                                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                                    <span>{patient.catatan_klinis}</span>
                                  </div>
                                ) : patient.catatan_klinis ? (
                                  <p className="text-xs text-slate-400 italic mt-1 bg-slate-900 border border-slate-800/60 p-2 rounded-lg">Catatan: {patient.catatan_klinis}</p>
                                ) : null}
                              </div>

                              {hasAllergyRisk && (
                                <div className="bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg text-xs text-rose-300 flex items-start gap-2">
                                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                                  <span><strong>Bahaya Alergi:</strong> Menu terpilih terdeteksi mengandung bahan pantangan pasien! Harap verifikasi ulang.</span>
                                </div>
                              )}

                              {/* Show breakdown of selected items in the order */}
                              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-900 flex flex-col gap-1 text-[11px] text-slate-300">
                                <span className="text-[9px] uppercase font-bold text-slate-500 block">Daftar Menu Dipilih:</span>
                                {Object.keys(o.items || {}).map(meal => (
                                  <div key={meal} className="flex justify-between">
                                    <span className="capitalize text-slate-400">{meal.replace('_', ' ')}:</span>
                                    <span className="font-medium max-w-[150px] truncate text-white">{Object.values(o.items[meal]).map(it => it.nama_menu).join(', ')}</span>
                                  </div>
                                ))}
                              </div>

                              <div className="flex gap-2 mt-2 justify-end">
                                <button
                                  onClick={() => handleApproveOrder(o.id)}
                                  className="w-full text-xs font-bold text-white bg-gradient-to-r from-gdsk-forest to-gdsk-leaf py-2.5 rounded-xl text-center shadow-lg shadow-gdsk-forest/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                >
                                  Validasi & Kirim ke Vendor GDSK
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Right Column: General Validated Order History list */}
                  <div className="lg:col-span-2 flex flex-col gap-4">
                    <h3 className="text-md font-bold text-white">Log Riwayat Validasi Gizi RSPC</h3>
                    <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/10">
                      <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/60 flex justify-between items-center">
                        <span className="font-bold text-white text-sm">Pemesanan Katering Disetujui</span>
                      </div>

                      <div className="divide-y divide-slate-800/80">
                        {orders.filter(o => o.status !== 'Pending').length === 0 ? (
                          <p className="p-12 text-center text-slate-500 text-xs">Belum ada riwayat pesanan tervalidasi.</p>
                        ) : (
                          orders.filter(o => o.status !== 'Pending').map(o => (
                            <div key={o.id} className="p-5 flex flex-col md:flex-row justify-between md:items-center gap-4">
                              <div className="flex flex-col gap-1">
                                <div className="font-bold text-white text-sm">{o.patient_name}</div>
                                <div className="text-xs text-slate-400">{o.patient_mrn} • Room: {o.patient_room}</div>
                                <div className="text-[11px] text-slate-400 flex gap-4 mt-2">
                                  <span>Waktu Order: {formatOrderTime(o)}</span>
                                  <span className="text-gdsk-soft font-semibold">Tipe: {patients.find(p => p.id === o.patient_id)?.diet || 'Diet Umum'}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className={`text-xs font-semibold border px-3 py-1 rounded-full bg-gdsk-forest/20 border-gdsk-leaf/20 text-gdsk-soft font-bold`}>
                                  {o.status === 'Approved' ? 'Tervalidasi' : o.status}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PORTAL VENDOR (DAILY PRODUCTION) */}
            {currentUser && currentUser.role === 'vendor' && (
              <div className="flex flex-col gap-6 animate-pulse-once">

                {/* Vendor portal header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-extrabold text-white flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full bg-gdsk-leaf animate-pulse"></span>
                      Halaman Dashboard Vendor GDSK
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">Daftar hidangan harian yang harus diproduksi oleh GDSK Catering. Tandai selesai diproduksi dan tandai pengiriman menuju RSPC.</p>
                  </div>
                </div>

                {/* Vendor KPIs */}
                {(() => {
                  const vStats = getVendorStats();
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="glass-panel p-4 rounded-xl border border-slate-800/80 bg-slate-900/10">
                        <span className="text-xs text-slate-400 font-bold uppercase block">Pesanan Masuk</span>
                        <span className="text-2xl font-bold text-white block mt-1">{vStats.orderCount}</span>
                      </div>
                      <div className="glass-panel p-4 rounded-xl border border-slate-800/80 bg-slate-900/10">
                        <span className="text-xs text-slate-400 font-bold uppercase block">Sedang Dimasak</span>
                        <span className="text-2xl font-bold text-amber-400 block mt-1">{vStats.prepCount}</span>
                      </div>
                      <div className="glass-panel p-4 rounded-xl border border-slate-800/80 bg-slate-900/10">
                        <span className="text-xs text-slate-400 font-bold uppercase block">Sedang Dikirim</span>
                        <span className="text-2xl font-bold text-sky-400 block mt-1">{vStats.shipCount}</span>
                      </div>
                      <div className="glass-panel p-4 rounded-xl border border-slate-800/80 bg-slate-900/10">
                        <span className="text-xs text-slate-400 font-bold uppercase block">Selesai Diterima RSPC</span>
                        <span className="text-2xl font-bold text-gdsk-soft block mt-1">{vStats.completedCount}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Active orders belonging to this vendor */}
                <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/10">
                  <div className="px-6 py-4 bg-slate-900/60 border-b border-slate-800/80 flex justify-between items-center">
                    <span className="font-bold text-white text-sm">Pesanan Hidangan Harian RSPC</span>
                  </div>

                  <div className="divide-y divide-slate-800/80">
                    {(() => {
                      const vendorOrders = orders.filter(o => o.status !== 'Pending');

                      if (vendorOrders.length === 0) {
                        return <p className="p-12 text-center text-slate-500 text-xs">Belum ada order katering yang masuk dapur vendor GDSK.</p>;
                      }

                      return vendorOrders.map(o => {
                        const vendorItemsList = [];
                        Object.keys(o.items || {}).forEach(meal => {
                          Object.keys(o.items[meal] || {}).forEach(cat => {
                            const details = o.items[meal][cat];
                            vendorItemsList.push({ mealTime: meal, category: cat, name: details.nama_menu });
                          });
                        });

                        return (
                          <div key={o.id} className="p-6 flex flex-col lg:flex-row justify-between gap-4">
                            <div className="flex-1 flex flex-col gap-2">
                              <div className="flex justify-between md:justify-start items-center gap-4 flex-wrap">
                                <h4 className="font-bold text-white text-base">{o.patient_name}</h4>
                                <span className="bg-slate-900 border border-slate-800 text-slate-400 text-xs px-2.5 py-0.5 rounded-full font-semibold">Kamar RSPC: {o.patient_room}</span>
                                <span className="text-xs text-slate-400 font-semibold bg-slate-100/10 border border-slate-200/20 px-2.5 py-0.5 rounded-md">Order: {formatOrderTime(o)}</span>
                              </div>
                              <p className="text-xs text-gdsk-soft font-semibold">Tipe Pola Gizi: {patients.find(p => p.id === o.patient_id)?.diet || 'Diet Makanan Biasa'}</p>

                              {/* Vendor menu item list */}
                              <div className="mt-2 flex flex-col gap-1.5 bg-slate-900/40 border border-slate-800/80 p-3 rounded-xl max-w-xl">
                                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Item Yang Harus Diproduksi:</span>
                                {vendorItemsList.map((item, idx) => (
                                  <div key={idx} className="flex justify-between items-center text-xs text-white">
                                    <span className="capitalize text-slate-400 font-medium">{item.mealTime.replace('_', ' ')} ({item.category}):</span>
                                    <span className="font-semibold">{item.name}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Status Control Panel */}
                            <div className="flex flex-col md:flex-row items-center gap-3 justify-end lg:w-1/3">
                              <div className="text-right w-full md:w-auto">
                                <span className="text-xs text-slate-500 block uppercase font-bold mb-1">Status Katering</span>
                                <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full border ${o.status === 'Approved' ? 'bg-sky-500/10 border-sky-500/20 text-sky-400' :
                                    o.status === 'Diproduksi' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse' :
                                      o.status === 'Dikirim' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 animate-pulse' :
                                        'bg-gdsk-forest/20 border-gdsk-leaf/20 text-gdsk-soft font-bold'
                                  }`}>
                                  {o.status === 'Approved' ? 'Diterima Dapur (Belum Dimasak)' : o.status === 'Diproduksi' ? 'Selesai Dimasak' : o.status === 'Dikirim' ? 'Dalam Pengiriman' : 'Sudah Diterima RS'}
                                </span>
                              </div>

                              <div className="flex gap-2 w-full md:w-auto">
                                {o.status === 'Approved' && (
                                  <button
                                    onClick={() => handleUpdateOrderStatus(o.id, 'Diproduksi')}
                                    className="w-full md:w-auto bg-gradient-to-r from-gdsk-forest to-gdsk-leaf hover:opacity-90 text-white font-bold text-xs px-4 py-2.5 rounded-lg whitespace-nowrap"
                                  >
                                    Sudah Selesai Masak
                                  </button>
                                )}
                                {o.status === 'Diproduksi' && (
                                  <button
                                    onClick={() => handleUpdateOrderStatus(o.id, 'Dikirim')}
                                    className="w-full md:w-auto bg-gradient-to-r from-gdsk-forest to-gdsk-leaf hover:opacity-90 text-white font-bold text-xs px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 whitespace-nowrap"
                                  >
                                    <Truck className="w-4 h-4" />
                                    Sudah Dikirim ke RSPC
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* PORTAL ADMIN AI */}
            {currentUser && currentUser.role === 'admin' && (
              <div className="flex flex-col gap-8 animate-pulse-once">

                {/* Existing Admin Widgets Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                  {/* AI Specifications card */}
                  <div className="lg:col-span-1 flex flex-col gap-6">
                    <h3 className="text-lg font-bold text-white">Spesifikasi Engine AI CDSS GDSK</h3>

                    <div className="glass-panel rounded-2xl border border-slate-800 p-5 flex flex-col gap-4">
                      <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                        <span className="text-xs text-slate-400 font-bold uppercase">Algoritma AI</span>
                        <span className="text-xs bg-gdsk-forest/20 border border-gdsk-leaf/30 text-gdsk-soft px-2 py-0.5 rounded-full font-bold">MinMax + Cosine Similarity</span>
                      </div>

                      <div className="flex justify-between items-center py-1.5">
                        <span className="text-xs text-slate-400">Total Data Menu GDSK (CSV)</span>
                        <span className="text-sm font-bold text-white">{menus.length} Hidangan</span>
                      </div>

                      <div className="flex justify-between items-center py-1.5">
                        <span className="text-xs text-slate-400">Dimensi Model Scaler</span>
                        <span className="text-sm font-bold text-white">4 Fitur Gizi (Cal, P, L, K)</span>
                      </div>

                      <div className="flex justify-between items-center py-1.5">
                        <span className="text-xs text-slate-400">Clinical Rules Mapped (XLSX)</span>
                        <span className="text-sm font-bold text-white">10 Diagnosis</span>
                      </div>

                      <div className="flex justify-between items-center py-1.5">
                        <span className="text-xs text-slate-400">Jarak Metrik Pencarian</span>
                        <span className="text-xs font-bold text-slate-300">Vector Angle Match</span>
                      </div>

                      <div className="border-t border-slate-800 pt-4 flex flex-col gap-3">
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Cosine Similarity mengukur kemiripan arah profil nutrisi secara akurat, menghasilkan nilai persentase kecocokan menu (0% - 100%) setelah disaring oleh clinical restrictions.
                        </p>

                        <button
                          onClick={handleRetrainAI}
                          className="w-full py-2.5 text-xs font-bold bg-slate-900 border border-slate-800 text-white rounded-xl hover:bg-slate-800 transition flex items-center justify-center gap-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Latih Ulang Model AI GDSK
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Dashboard statistics graphs mockups */}
                  <div className="lg:col-span-2 flex flex-col gap-6">
                    <h3 className="text-lg font-bold text-white">Visualisasi Gizi & AI Metrics RSPC</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Diet Distribution Graph */}
                      <div className="glass-panel rounded-2xl border border-slate-800 p-5 flex flex-col gap-4">
                        <h4 className="font-bold text-sm text-white flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-gdsk-leaf" />
                          Distribusi Diet Pasien
                        </h4>
                        <div className="flex flex-col gap-3">
                          {stats && Object.entries(stats.diet_distribution || {}).map(([diet, count]) => {
                            const percent = stats.total_patients > 0 ? Math.round((count / stats.total_patients) * 100) : 0;
                            return (
                              <div key={diet} className="flex flex-col gap-1.5">
                                <div className="flex justify-between text-xs font-medium text-slate-300">
                                  <span className="truncate max-w-[150px]">{diet}</span>
                                  <span>{count} Pasien ({percent}%)</span>
                                </div>
                                <div className="w-full bg-slate-900 rounded-full h-2">
                                  <div
                                    className="bg-gdsk-forest h-2 rounded-full"
                                    style={{ width: `${percent}%` }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Order Status Distribution Graph */}
                      <div className="glass-panel rounded-2xl border border-slate-800 p-5 flex flex-col gap-4">
                        <h4 className="font-bold text-sm text-white flex items-center gap-2">
                          <CheckSquare className="w-4.5 h-4.5 text-gdsk-leaf" />
                          Pipa Status Order Katering GDSK
                        </h4>
                        <div className="flex flex-col gap-3">
                          {stats && Object.entries(stats.status_distribution || {}).map(([status, count]) => {
                            const percent = stats.total_orders > 0 ? Math.round((count / stats.total_orders) * 100) : 0;
                            return (
                              <div key={status} className="flex flex-col gap-1.5">
                                <div className="flex justify-between text-xs font-medium text-slate-300">
                                  <span>{status}</span>
                                  <span>{count} Order ({percent}%)</span>
                                </div>
                                <div className="w-full bg-slate-900 rounded-full h-2">
                                  <div
                                    className="bg-gdsk-forest h-2 rounded-full"
                                    style={{ width: `${percent}%` }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* System database stats */}
                    <div className="glass-panel rounded-2xl border border-slate-800 p-5 flex flex-col gap-3 bg-slate-900/10">
                      <h4 className="font-bold text-sm text-white flex items-center gap-2">
                        <Activity className="w-4 h-4 text-gdsk-leaf" />
                        Status Sistem Integrasi Cloud GDSK
                      </h4>
                      <p className="text-xs text-slate-400">
                        Sistem terhubung dengan database <span className="font-bold text-gdsk-leaf">{stats.database === 'supabase' ? 'Supabase Cloud (Live)' : 'Local File JSON fallback'}</span>.
                      </p>
                      <div className="flex gap-4 mt-2">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                          <span className="w-2.5 h-2.5 rounded-full bg-gdsk-leaf"></span>
                          Catering API: Online
                        </div>
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                          <span className="w-2.5 h-2.5 rounded-full bg-gdsk-leaf"></span>
                          AI Engine Pipeline: Ready
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Section Baru: Manajemen Pengguna GDSK */}
                <div className="glass-panel rounded-2xl border border-slate-800 p-6 flex flex-col gap-4 bg-slate-900/10">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-gdsk-leaf" />
                        Manajemen Pengguna & Persetujuan Akses GDSK
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">Daftar staf, perawat, ahli gizi, dan vendor katering yang terdaftar pada sistem POS RSPC.</p>
                    </div>
                    <button
                      onClick={() => {
                        setUserForm({ id: '', nama: '', email: '', password: '', role: 'doctor', vendor_id: 'V001', status_konfirmasi: true, accessCode: '' });
                        setShowAddUserModal(true);
                      }}
                      className="bg-gradient-to-r from-gdsk-forest to-gdsk-leaf hover:opacity-90 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-gdsk-forest/20 flex items-center gap-2 transition"
                    >
                      <Plus className="w-4 h-4" />
                      Tambah Pengguna Baru
                    </button>
                  </div>

                  {/* Users Table */}
                  <div className="overflow-x-auto border border-slate-800 rounded-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/40 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          <th className="px-6 py-4">Nama Pengguna & Email</th>
                          <th className="px-6 py-4">Peran (Role)</th>
                          <th className="px-6 py-4">ID Vendor</th>
                          <th className="px-6 py-4">Status Konfirmasi</th>
                          <th className="px-6 py-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-sm">
                        {loadingUsers ? (
                          <tr>
                            <td colSpan="5" className="px-6 py-12 text-center text-slate-500 text-xs">Memuat data pengguna...</td>
                          </tr>
                        ) : usersList.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="px-6 py-12 text-center text-slate-500 text-xs">Tidak ada data pengguna terdaftar.</td>
                          </tr>
                        ) : (
                          usersList.map(u => (
                            <tr key={u.id} className="hover:bg-slate-900/30 transition-all duration-150">
                              <td className="px-6 py-4">
                                <div className="font-bold text-white">{u.nama}</div>
                                <div className="text-xs text-slate-400 mt-0.5">{u.email}</div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${u.role === 'admin' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                    u.role === 'doctor' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                                      u.role === 'nutritionist' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' :
                                        u.role === 'order_taker' ? 'bg-sky-500/10 border-sky-500/20 text-sky-400' :
                                          'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                  }`}>
                                  {u.role.replace('_', ' ').toUpperCase()}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-slate-300 font-medium">
                                {u.vendor_id || '-'}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full border ${u.status_konfirmasi
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                    : 'bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse'
                                  }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${u.status_konfirmasi ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                                  {u.status_konfirmasi ? 'Sudah Dikonfirmasi' : 'Menunggu Konfirmasi'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  {!u.status_konfirmasi && (
                                    <button
                                      onClick={() => handleAdminConfirmUser(u.id)}
                                      className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-white font-bold text-xs px-2.5 py-1.5 rounded-lg transition"
                                    >
                                      Konfirmasi
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      setUserForm({
                                        id: u.id,
                                        nama: u.nama,
                                        email: u.email,
                                        password: '',
                                        role: u.role,
                                        vendor_id: u.vendor_id || 'V001',
                                        status_konfirmasi: u.status_konfirmasi,
                                        accessCode: ''
                                      });
                                      setShowEditUserModal(true);
                                    }}
                                    className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 font-bold text-xs px-2.5 py-1.5 rounded-lg transition"
                                  >
                                    Edit
                                  </button>
                                  {u.email !== 'admin@hospital.com' && (
                                    <button
                                      onClick={() => handleAdminDeleteUser(u.id)}
                                      className="bg-rose-950/20 border border-rose-500/25 text-rose-400 hover:bg-rose-600 hover:text-white font-bold text-xs px-2.5 py-1.5 rounded-lg transition"
                                    >
                                      Hapus
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* MODAL TAMBAH PENGGUNA BARU */}
                {showAddUserModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
                    <form
                      onSubmit={handleAdminAddUser}
                      className="glass-panel-heavy max-w-lg w-full rounded-2xl border border-slate-700 shadow-2xl p-6 flex flex-col gap-4"
                    >
                      <h3 className="font-bold text-white text-base border-b border-slate-800 pb-2 flex items-center gap-2">
                        <Users className="w-5 h-5 text-gdsk-leaf" />
                        Tambah Pengguna Baru
                      </h3>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-slate-300">Nama Lengkap</label>
                        <input
                          type="text"
                          required
                          placeholder="Ahmad Fauzi"
                          value={userForm.nama}
                          onChange={(e) => setUserForm({ ...userForm, nama: e.target.value })}
                          className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-gdsk-leaf transition"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-slate-300">Email / Username</label>
                        <input
                          type="email"
                          required
                          placeholder="nama@hospital.com"
                          value={userForm.email}
                          onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                          className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-gdsk-leaf transition"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-slate-300">Password</label>
                          <input
                            type="password"
                            required
                            placeholder="Password Baru"
                            value={userForm.password}
                            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-gdsk-leaf transition"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-slate-300">Peran (Role)</label>
                          <select
                            value={userForm.role}
                            onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-gdsk-leaf transition"
                          >
                            <option value="doctor">Pihak Rumah Sakit (Dokter)</option>
                            <option value="order_taker">Halaman Pasien (Order Taker)</option>
                            <option value="nutritionist">Ahli Gizi (Gizi RSPC)</option>
                            <option value="vendor">Dapur Katering (Vendor)</option>
                            <option value="admin">Administrator GDSK</option>
                          </select>
                        </div>
                      </div>

                      {userForm.role === 'vendor' && (
                        <div className="flex flex-col gap-1.5 bg-slate-900/30 border border-slate-800 p-3 rounded-xl">
                          <label className="text-xs font-semibold text-slate-300">Pilih ID Vendor Katering</label>
                          <select
                            value={userForm.vendor_id}
                            onChange={(e) => setUserForm({ ...userForm, vendor_id: e.target.value })}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-gdsk-leaf transition"
                          >
                            <option value="V001">V001 - Catering Sehat Mandiri</option>
                            <option value="V002">V002 - NutriCatering Premium</option>
                            <option value="V003">V003 - DietCatering Sejahtera</option>
                          </select>
                        </div>
                      )}

                      {userForm.role === 'admin' && (
                        <div className="flex flex-col gap-1.5 bg-amber-500/5 border border-amber-500/20 p-3 rounded-xl">
                          <label className="text-xs font-bold text-amber-400 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Kode Akses Pendaftaran Admin
                          </label>
                          <input
                            type="password"
                            required
                            placeholder="Masukkan kode ADMINPOS"
                            value={userForm.accessCode}
                            onChange={(e) => setUserForm({ ...userForm, accessCode: e.target.value })}
                            className="bg-slate-900 border border-amber-500/30 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500 transition"
                          />
                        </div>
                      )}

                      <div className="flex justify-end gap-3 mt-2">
                        <button
                          type="button"
                          onClick={() => setShowAddUserModal(false)}
                          className="px-4 py-2.5 text-xs font-semibold text-slate-400 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl transition"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-gdsk-forest to-gdsk-leaf rounded-xl shadow-lg shadow-gdsk-forest/20 transition"
                        >
                          Simpan User
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* MODAL EDIT PENGGUNA */}
                {showEditUserModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
                    <form
                      onSubmit={handleAdminUpdateUser}
                      className="glass-panel-heavy max-w-lg w-full rounded-2xl border border-slate-700 shadow-2xl p-6 flex flex-col gap-4"
                    >
                      <h3 className="font-bold text-white text-base border-b border-slate-800 pb-2 flex items-center gap-2">
                        <Users className="w-5 h-5 text-gdsk-leaf" />
                        Edit Data Pengguna
                      </h3>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-slate-300">Nama Lengkap</label>
                        <input
                          type="text"
                          required
                          value={userForm.nama}
                          onChange={(e) => setUserForm({ ...userForm, nama: e.target.value })}
                          className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-gdsk-leaf transition"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-slate-350">Email / Username</label>
                        <input
                          type="email"
                          required
                          value={userForm.email}
                          onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                          className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-gdsk-leaf transition"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-slate-300">Ganti Password (Opsional)</label>
                          <input
                            type="password"
                            placeholder="Kosongkan jika tidak diubah"
                            value={userForm.password}
                            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-gdsk-leaf transition"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-slate-300">Peran (Role)</label>
                          <select
                            value={userForm.role}
                            onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                            disabled={userForm.email === 'admin@hospital.com'}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-gdsk-leaf transition disabled:opacity-50"
                          >
                            <option value="doctor">Pihak Rumah Sakit (Dokter)</option>
                            <option value="order_taker">Halaman Pasien (Order Taker)</option>
                            <option value="nutritionist">Ahli Gizi (Gizi RSPC)</option>
                            <option value="vendor">Dapur Katering (Vendor)</option>
                            <option value="admin">Administrator GDSK</option>
                          </select>
                        </div>
                      </div>

                      {userForm.role === 'vendor' && (
                        <div className="flex flex-col gap-1.5 bg-slate-900/30 border border-slate-800 p-3 rounded-xl">
                          <label className="text-xs font-semibold text-slate-350">Pilih ID Vendor Katering</label>
                          <select
                            value={userForm.vendor_id}
                            onChange={(e) => setUserForm({ ...userForm, vendor_id: e.target.value })}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-gdsk-leaf transition"
                          >
                            <option value="V001">V001 - Catering Sehat Mandiri</option>
                            <option value="V002">V002 - NutriCatering Premium</option>
                            <option value="V003">V003 - DietCatering Sejahtera</option>
                          </select>
                        </div>
                      )}

                      <div className="flex justify-end gap-3 mt-2">
                        <button
                          type="button"
                          onClick={() => setShowEditUserModal(false)}
                          className="px-4 py-2.5 text-xs font-semibold text-slate-400 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl transition"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-gdsk-forest to-gdsk-leaf rounded-xl shadow-lg shadow-gdsk-forest/20 transition"
                        >
                          Perbarui User
                        </button>
                      </div>
                    </form>
                  </div>
                )}

              </div>
            )}

          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="glass-panel-heavy border-t border-slate-900/80 px-6 py-4 mt-12 text-center bg-slate-950">
        <p className="text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5 justify-center">
            <Utensils className="w-3.5 h-3.5 text-gdsk-leaf" />
            POS SYSTEM RSPC • Powered by GDSK Catering Service •
          </span>
        </p>
      </footer>
    </div>
  );
}

export default App;
