-- =============================================
-- SCHEMA JADWAL OB
-- Jalankan ini di Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABEL PROFILES (extends auth.users)
-- =============================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  nama TEXT NOT NULL,
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

-- PROFILES policies
CREATE POLICY "User bisa lihat semua profil" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin dan HR bisa edit profil" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'hr')
    )
  );

CREATE POLICY "User bisa lihat profil sendiri" ON profiles
  FOR SELECT USING (id = auth.uid());

-- JADWAL policies
CREATE POLICY "Semua user login bisa lihat jadwal" ON jadwal
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin dan HR bisa kelola jadwal" ON jadwal
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'hr')
    )
  );

-- REQUEST LIBUR policies
CREATE POLICY "OB bisa lihat request sendiri" ON request_libur
  FOR SELECT USING (
    ob_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'hr')
    )
  );

CREATE POLICY "OB bisa buat request" ON request_libur
  FOR INSERT WITH CHECK (ob_id = auth.uid());

CREATE POLICY "Admin dan HR bisa update request" ON request_libur
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'hr')
    )
  );

-- =============================================
-- FUNCTION: Auto-create profile saat user baru
-- =============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, nama, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nama', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'ob')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- FUNCTION: Update updated_at otomatis
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_jadwal_updated_at
  BEFORE UPDATE ON jadwal
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_request_updated_at
  BEFORE UPDATE ON request_libur
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
