-- =============================================
-- FIX SCHEMA JADWAL OB
-- Jalankan ini di Supabase SQL Editor
-- Aman dijalankan ulang (DROP IF EXISTS dulu)
-- =============================================

-- 1. Hapus trigger & function lama dulu
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
DROP TRIGGER IF EXISTS update_jadwal_updated_at ON jadwal;
DROP TRIGGER IF EXISTS update_request_updated_at ON request_libur;
DROP FUNCTION IF EXISTS update_updated_at_column();

-- 2. Hapus tabel lama (urutan: child dulu baru parent)
DROP TABLE IF EXISTS request_libur CASCADE;
DROP TABLE IF EXISTS jadwal CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 3. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABEL PROFILES (extends auth.users)
-- =============================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  nama TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'ob' CHECK (role IN ('admin', 'hr', 'ob')),
  aktif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABEL JADWAL
-- =============================================
CREATE TABLE jadwal (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ob_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  tanggal DATE NOT NULL,
  shift TEXT NOT NULL CHECK (shift IN ('pagi', 'malam', 'libur')),
  is_override BOOLEAN DEFAULT false,   -- true jika hasil delegasi/edit manual
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ob_id, tanggal)
);

-- =============================================
-- TABEL REQUEST LIBUR
-- =============================================
CREATE TABLE request_libur (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ob_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  tanggal DATE NOT NULL,
  alasan TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  pengganti_id UUID REFERENCES profiles(id),
  diproses_oleh UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEKS
-- =============================================
CREATE INDEX idx_jadwal_ob_id ON jadwal(ob_id);
CREATE INDEX idx_jadwal_tanggal ON jadwal(tanggal);
CREATE INDEX idx_request_libur_ob_id ON request_libur(ob_id);
CREATE INDEX idx_request_libur_status ON request_libur(status);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jadwal ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_libur ENABLE ROW LEVEL SECURITY;

-- PROFILES: service_role bisa insert (untuk trigger)
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "profiles_insert_service" ON profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "profiles_update_admin_hr" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'hr')
    )
  );

CREATE POLICY "profiles_delete_admin" ON profiles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- JADWAL
CREATE POLICY "jadwal_select" ON jadwal
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "jadwal_all_admin_hr" ON jadwal
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'hr')
    )
  );

-- REQUEST LIBUR
CREATE POLICY "request_select" ON request_libur
  FOR SELECT USING (
    ob_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'hr')
    )
  );

CREATE POLICY "request_insert_ob" ON request_libur
  FOR INSERT WITH CHECK (ob_id = auth.uid());

CREATE POLICY "request_update_admin_hr" ON request_libur
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'hr')
    )
  );

-- =============================================
-- FUNCTION: Auto-create profile saat user baru
-- Perbaikan: ON CONFLICT + EXCEPTION handler
-- =============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nama, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'nama'), ''),
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), ''),
      'ob'
    )
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user error: %', SQLERRM;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- FUNCTION: Update updated_at otomatis
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- =============================================
-- Setelah schema berhasil, buat user admin:
-- 1. Supabase > Authentication > Users > Add user > Create new user
-- 2. Isi email & password lalu Save
-- 3. Jalankan SQL berikut (ganti email):
--
-- UPDATE profiles SET role = 'admin', nama = 'Admin Utama'
-- WHERE email = 'admin@emailkamu.com';
-- =============================================

CREATE TRIGGER update_jadwal_updated_at
  BEFORE UPDATE ON jadwal
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_request_updated_at
  BEFORE UPDATE ON request_libur
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
