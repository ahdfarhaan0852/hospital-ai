-- SQL SCHEMA FOR HOSPITAL CATERING SYSTEM
-- Copy and run these queries in your Supabase SQL Editor.

-- Drop old tables if they exist
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.menus CASCADE;
DROP TABLE IF EXISTS public.patients CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- 1. Create Users Table
CREATE TABLE public.users (
    id TEXT PRIMARY KEY,
    nama TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('doctor', 'nutritionist', 'order_taker', 'vendor', 'admin')),
    vendor_id TEXT, -- Nullable, used if role is 'vendor'
    password TEXT,
    status_konfirmasi BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Create Patients Table
CREATE TABLE public.patients (
    id TEXT PRIMARY KEY,
    mrn TEXT NOT NULL UNIQUE,
    nama TEXT NOT NULL,
    umur INTEGER NOT NULL,
    room_id TEXT NOT NULL,
    diagnosa TEXT,
    alergi TEXT,
    diet TEXT,
    berat_badan DOUBLE PRECISION,
    tingkat_aktivitas TEXT,
    jenis_kelamin TEXT,
    kalori_target INTEGER,
    protein_target INTEGER,
    lemak_target INTEGER,
    karbohidrat_target INTEGER,
    pantangan TEXT,
    catatan_klinis TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. Create Menus Table
CREATE TABLE public.menus (
    id INTEGER PRIMARY KEY,
    nama_menu TEXT NOT NULL,
    jenis_diet TEXT NOT NULL,
    kalori_kcal DOUBLE PRECISION NOT NULL,
    protein_g DOUBLE PRECISION NOT NULL,
    lemak_g DOUBLE PRECISION NOT NULL,
    karbohidrat_g DOUBLE PRECISION NOT NULL,
    kategori TEXT NOT NULL CHECK (kategori IN ('pokok', 'lauk_utama', 'lauk_nabati', 'sayur', 'dessert')),
    vendor_id TEXT NOT NULL
);

-- 4. Create Orders Table
CREATE TABLE public.orders (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    items JSONB NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Pending', 'Approved', 'Diproduksi', 'Dikirim', 'Diterima')),
    tanggal TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Disable Row Level Security (RLS) for testing/MVP
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
