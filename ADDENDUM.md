# ADDENDUM TUTORIAL — Service Role Key & Langkah Tambahan

## ⚠️ PENTING: Tambah SUPABASE_SERVICE_ROLE_KEY

File ini melengkapi TUTORIAL.md utama.

### Cara dapat Service Role Key:
1. Buka Supabase dashboard → project kamu
2. Klik **Settings** → **API**
3. Scroll ke bawah, lihat bagian **"Project API keys"**
4. Copy **service_role** key (klik "Reveal")
5. Tambahkan ke `.env.local`:
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1...
```

**PERINGATAN**: Service role key bisa bypass semua RLS.
Jangan pernah expose ke client/frontend. Hanya dipakai di server (API routes).

---

## Urutan Lengkap Langkah Setup

### A. Jalankan SQL Schema
1. Buka Supabase → **SQL Editor**
2. Copy isi file `supabase/schema.sql`
3. Paste → Run

### B. Salin Semua File Kode
Salin semua file dari folder ini ke project Next.js kamu.
Struktur lengkap:
```
jadwal-ob/
├── .env.local                          ← isi dari .env.local.example
├── .gitignore
├── next.config.js
├── tailwind.config.js
├── package.json
├── supabase/
│   └── schema.sql
└── src/
    ├── middleware.js
    ├── app/
    │   ├── globals.css
    │   ├── layout.js
    │   ├── page.js
    │   ├── login/
    │   │   └── page.js
    │   ├── dashboard/
    │   │   └── page.js
    │   ├── jadwal/
    │   │   └── page.js
    │   ├── users/
    │   │   └── page.js
    │   └── api/
    │       ├── generate-jadwal/
    │       │   └── route.js
    │       └── users/
    │           └── route.js
    ├── components/
    │   ├── Navbar.js
    │   ├── DashboardClient.js
    │   ├── JadwalClient.js
    │   ├── UsersClient.js
    │   ├── DelegasiModal.js
    │   └── RequestLiburModal.js
    └── lib/
        ├── supabase.js
        ├── supabase-server.js
        └── jadwal-utils.js
```

### C. Install & Run
```bash
npm install
npm run dev
```

### D. Buat Admin Pertama
1. Buka Supabase → **Authentication → Users → Add user**
2. Isi email & password
3. Buka **SQL Editor** → jalankan:
```sql
UPDATE profiles
SET role = 'admin', nama = 'Admin Utama'
WHERE email = 'admin@emailkamu.com';
```

### E. Generate Jadwal Pertama
1. Login sebagai Admin
2. Klik menu **Jadwal**
3. Klik tombol **"+ Generate"**
4. Jadwal bulan ini otomatis ter-generate

---

## Cara Kerja Rolling Schedule

Sistem otomatis menghitung shift berdasarkan tanggal:
- **OB 1** (ditambah pertama): selalu mulai dari offset 0 → Pagi, Pagi, Malam, Malam, Libur, Libur, dst.
- **OB 2** (ditambah kedua): offset 2 → Malam, Malam, Libur, Libur, Pagi, Pagi, dst.
- **OB 3** (ditambah ketiga): offset 4 → Libur, Libur, Pagi, Pagi, Malam, Malam, dst.

Sehingga setiap hari selalu ada 1 OB pagi, 1 OB malam, 1 OB libur.

---

## Deploy ke Vercel

### Tambahkan env vars di Vercel:
Setelah `vercel` pertama kali:
1. Buka https://vercel.com → project → **Settings → Environment Variables**
2. Tambahkan ketiga variabel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Redeploy: `vercel --prod`

### Tambahkan domain Vercel ke Supabase:
1. Copy URL deployment Vercel (misal: `https://jadwal-ob.vercel.app`)
2. Buka Supabase → **Authentication → URL Configuration**
3. Tambahkan ke **"Redirect URLs"**: `https://jadwal-ob.vercel.app/**`
4. Update **"Site URL"**: `https://jadwal-ob.vercel.app`

---

## Fitur yang Ada

| Fitur | OB | HR | Admin |
|-------|----|----|-------|
| Lihat jadwal | ✅ | ✅ | ✅ |
| Request libur | ✅ | - | - |
| Proses & delegasi request libur | - | ✅ | ✅ |
| Generate jadwal bulanan | - | ✅ | ✅ |
| Tambah/edit user | - | ✅ (OB saja) | ✅ |
| Nonaktifkan/hapus user | - | - | ✅ |

---

## Selesai 🎉

Sistem siap digunakan. Akses dari HP/mobile sudah responsive.
