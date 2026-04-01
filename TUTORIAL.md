# Tutorial Lengkap: Jadwal Presensi OB

## Gambaran Sistem
- **Stack**: Next.js 14 (tanpa TypeScript) + Supabase + Tailwind CSS
- **Hosting**: Vercel (frontend) + Supabase (database & auth)
- **Fitur**: Login, role-based (Admin/HR/OB), jadwal rolling otomatis, request libur, delegasi

---

## LANGKAH 1: Persiapan Tools

Install dulu di komputer kamu:
1. **Node.js** versi 18+ → https://nodejs.org
2. **Git** → https://git-scm.com
3. **VS Code** (opsional tapi disarankan) → https://code.visualstudio.com

Cek versi setelah install:
```bash
node --version   # harus v18+
npm --version
git --version
```

---

## LANGKAH 2: Buat Project Next.js

Buka terminal, lalu jalankan:

```bash
npx create-next-app@latest jadwal-ob --no-typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd jadwal-ob
```

Kalau ada pertanyaan interaktif, pilih opsi default (Enter saja).

---

## LANGKAH 3: Install Dependencies

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install date-fns
npm install lucide-react
npm install clsx
```

---

## LANGKAH 4: Setup Supabase

### 4.1 Buat Project Supabase
1. Buka https://supabase.com → Sign up / Login
2. Klik **"New Project"**
3. Isi:
   - **Name**: `jadwal-ob`
   - **Database Password**: buat password kuat, **simpan baik-baik!**
   - **Region**: pilih `Southeast Asia (Singapore)`
4. Klik **"Create new project"** → tunggu ~2 menit

### 4.2 Ambil Credentials
1. Buka project Supabase kamu
2. Klik **Settings** (ikon gear) → **API**
3. Copy:
   - `Project URL` → ini `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → ini `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 4.3 Buat File .env.local
Di folder project (`jadwal-ob/`), buat file `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

Ganti dengan nilai asli dari Supabase kamu.

---

## LANGKAH 5: Setup Database Supabase

1. Di Supabase, klik **SQL Editor** di sidebar kiri
2. Klik **"New query"**
3. Copy-paste SQL dari file `supabase/schema.sql` (ada di folder project ini)
4. Klik **Run** (Ctrl+Enter)

---

## LANGKAH 6: Salin Semua File Kode

Copy semua file dari folder ini ke project kamu sesuai path yang tertera di masing-masing file.

Struktur folder akhir:
```
jadwal-ob/
├── .env.local
├── src/
│   ├── app/
│   │   ├── layout.js
│   │   ├── page.js
│   │   ├── login/
│   │   │   └── page.js
│   │   ├── dashboard/
│   │   │   └── page.js
│   │   ├── jadwal/
│   │   │   └── page.js
│   │   ├── users/
│   │   │   └── page.js
│   │   └── api/
│   │       └── generate-jadwal/
│   │           └── route.js
│   ├── components/
│   │   ├── Navbar.js
│   │   ├── JadwalCalendar.js
│   │   ├── RequestLiburModal.js
│   │   └── DelegasiModal.js
│   ├── lib/
│   │   ├── supabase.js
│   │   ├── supabase-server.js
│   │   └── jadwal-utils.js
│   └── middleware.js
└── supabase/
    └── schema.sql
```

---

## LANGKAH 7: Run di Lokal

```bash
npm run dev
```

Buka browser → http://localhost:3000

### Login Pertama Kali
Setelah setup database, buat user admin pertama:
1. Buka **Supabase → Authentication → Users**
2. Klik **"Add user"** → **"Create new user"**
3. Isi email & password
4. Buka **SQL Editor**, jalankan:
```sql
-- Ganti email dengan email yang baru dibuat
UPDATE profiles SET role = 'admin' WHERE email = 'admin@example.com';
```

---

## LANGKAH 8: Deploy ke Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login ke Vercel
vercel login

# Deploy
vercel
```

Ikuti instruksi:
- Set up and deploy? **Y**
- Which scope? pilih akun kamu
- Link to existing project? **N**
- Project name? `jadwal-ob`
- Directory? `./ `

Setelah deploy, tambahkan environment variables di Vercel:
1. Buka https://vercel.com → project kamu
2. **Settings → Environment Variables**
3. Tambahkan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **Redeploy**: `vercel --prod`

---

## LOGIKA JADWAL ROLLING

```
Siklus 6 hari per OB:
Hari 1: Pagi (06:00-14:00)
Hari 2: Pagi (06:00-14:00)
Hari 3: Malam (14:00-22:00)
Hari 4: Malam (14:00-22:00)
Hari 5: Libur
Hari 6: Libur
→ Ulangi dari Hari 1
```

Setiap OB punya offset berbeda agar selalu ada yang shift pagi & malam:
- OB 1: offset 0 (mulai dari Hari 1)
- OB 2: offset 2 (mulai dari Hari 3)
- OB 3: offset 4 (mulai dari Hari 5)

---

## ALUR REQUEST LIBUR & DELEGASI

1. **OB** klik hari jadwal mereka → klik "Request Libur"
2. **HR/Admin** menerima notifikasi di dashboard
3. **HR/Admin** buka request → lihat siapa yang available
4. **HR/Admin** pilih OB pengganti → klik "Delegasikan"
5. Jadwal otomatis ter-update

Kondisi OB bisa didelegasi:
- OB yang shift malam bisa cover shift pagi (jadi 24 jam)
- OB yang sedang libur bisa dipanggil masuk

---

## TROUBLESHOOTING

**Error: Module not found**
```bash
npm install
```

**Error: Supabase connection failed**
- Cek `.env.local` sudah benar
- Restart dev server: Ctrl+C → `npm run dev`

**Halaman blank setelah login**
- Cek console browser (F12)
- Pastikan tabel `profiles` sudah ada di Supabase

---

## SELESAI! 🎉

Setelah semua langkah selesai, sistem jadwal OB kamu sudah siap digunakan.
