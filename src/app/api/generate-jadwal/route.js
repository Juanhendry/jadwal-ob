// src/app/api/generate-jadwal/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { generateJadwalBulan, getOffsetDefault } from '@/lib/jadwal-utils'

export async function POST(request) {
  try {
    const supabase = await createClient()

    // Cek auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Cek role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'hr'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { tahun, bulan } = await request.json()

    if (!tahun || !bulan) {
      return NextResponse.json({ error: 'tahun dan bulan diperlukan' }, { status: 400 })
    }

    // Ambil semua OB aktif (urut by created_at untuk offset yang konsisten)
    const { data: obList } = await supabase
      .from('profiles')
      .select('id, nama')
      .eq('role', 'ob')
      .eq('aktif', true)
      .order('created_at')

    if (!obList || obList.length === 0) {
      return NextResponse.json({ error: 'Tidak ada OB aktif' }, { status: 400 })
    }

    // Assign offset ke setiap OB
    const obWithOffset = obList.map((ob, idx) => ({
      ...ob,
      offset: getOffsetDefault(idx),
    }))

    // Generate jadwal
    const jadwalBaru = generateJadwalBulan(obWithOffset, tahun, bulan)

    // Ambil jadwal yang sudah ada (untuk menghindari overwrite is_override)
    const startDate = `${tahun}-${String(bulan).padStart(2, '0')}-01`
    const endDate = `${tahun}-${String(bulan).padStart(2, '0')}-31`

    const { data: jadwalExisting } = await supabase
      .from('jadwal')
      .select('ob_id, tanggal, is_override')
      .gte('tanggal', startDate)
      .lte('tanggal', endDate)

    // Buat set dari jadwal yang sudah di-override
    const overrideSet = new Set()
    jadwalExisting?.forEach(j => {
      if (j.is_override) {
        overrideSet.add(`${j.ob_id}_${j.tanggal}`)
      }
    })

    // Filter: hanya upsert yang belum di-override
    const jadwalToUpsert = jadwalBaru.filter(j => {
      return !overrideSet.has(`${j.ob_id}_${j.tanggal}`)
    })

    if (jadwalToUpsert.length > 0) {
      const { error } = await supabase
        .from('jadwal')
        .upsert(jadwalToUpsert, { onConflict: 'ob_id,tanggal' })

      if (error) {
        console.error('Upsert error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      generated: jadwalToUpsert.length,
      skipped: jadwalBaru.length - jadwalToUpsert.length,
    })

  } catch (err) {
    console.error('Generate jadwal error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
