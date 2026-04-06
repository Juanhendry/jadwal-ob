// src/components/JadwalClient.js
'use client'

import { useState, useEffect } from 'react'
import { format, getDaysInMonth, startOfMonth, getDay, addMonths, subMonths } from 'date-fns'
import { id } from 'date-fns/locale'
import { createClient } from '@/lib/supabase'
import { shiftLabel, jamShift, formatBulanID } from '@/lib/jadwal-utils'
import RequestLiburModal from './RequestLiburModal'
import ShiftIcon from './ShiftIcon'

export default function JadwalClient({ profile, obList }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [jadwal, setJadwal] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedDay, setSelectedDay] = useState(null)
  const [requestLiburData, setRequestLiburData] = useState(null)
  const [editingJadwal, setEditingJadwal] = useState(null)

  const tahun = currentDate.getFullYear()
  const bulan = currentDate.getMonth() + 1
  const role = profile?.role

  useEffect(() => {
    loadJadwal()
  }, [tahun, bulan])

  async function loadJadwal() {
    setLoading(true)
    const supabase = createClient()

    const startDate = `${tahun}-${String(bulan).padStart(2, '0')}-01`
    const endDate = `${tahun}-${String(bulan).padStart(2, '0')}-${getDaysInMonth(currentDate)}`

    const { data } = await supabase
      .from('jadwal')
      .select('*, ob:ob_id(id, nama)')
      .gte('tanggal', startDate)
      .lte('tanggal', endDate)
      .order('tanggal')

    setJadwal(data || [])
    setLoading(false)
  }

  async function handleGenerateJadwal() {
    if (!confirm(`Generate jadwal untuk ${formatBulanID(tahun, bulan)}?\n\nJadwal yang sudah di-override manual tidak akan tertimpa.`)) return
    setGenerating(true)

    const res = await fetch('/api/generate-jadwal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tahun, bulan }),
    })

    if (res.ok) {
      await loadJadwal()
      alert('Jadwal berhasil digenerate!')
    } else {
      const err = await res.json()
      alert('Gagal generate jadwal: ' + (err.error || 'Unknown error'))
    }
    setGenerating(false)
  }

  // Kelompokkan jadwal per tanggal
  const jadwalByDate = {}
  jadwal.forEach(j => {
    if (!jadwalByDate[j.tanggal]) jadwalByDate[j.tanggal] = []
    jadwalByDate[j.tanggal].push(j)
  })

  // Build calendar grid
  const jumlahHari = getDaysInMonth(currentDate)
  const hariPertama = getDay(startOfMonth(currentDate)) // 0=Minggu
  const days = []

  // Empty cells before first day
  for (let i = 0; i < hariPertama; i++) {
    days.push(null)
  }
  for (let d = 1; d <= jumlahHari; d++) {
    days.push(d)
  }

  const today = new Date().toISOString().split('T')[0]

  function getDateStr(day) {
    return `${tahun}-${String(bulan).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  function handleDayClick(day) {
    const dateStr = getDateStr(day)
    const jadwalHari = jadwalByDate[dateStr] || []
    setSelectedDay({ day, dateStr, jadwal: jadwalHari })
  }

  function handleRequestLibur(jadwalItem) {
    setSelectedDay(null)
    setRequestLiburData(jadwalItem)
  }

  async function handleSaveEditJadwal(e) {
    e.preventDefault()
    const fd = new FormData(e.target)
    const newObId = fd.get('ob_id')
    const newShift = fd.get('shift')
    
    if (!newObId || !newShift) return alert('Pilih OB dan Shift!')

    const supabase = createClient()
    const tanggal = editingJadwal.tanggal
    
    try {
      if (newObId === editingJadwal.ob_id) {
        // Cuma ganti shift untuk OB yang sama
        const { error } = await supabase
          .from('jadwal')
          .update({ shift: newShift, is_override: true })
          .eq('id', editingJadwal.id)
        if (error) throw error
      } else {
        // Ganti ke OB lain:
        // 1. Set OB sebelumnya jadi libur
        const { error: err1 } = await supabase
          .from('jadwal')
          .update({ shift: 'libur', is_override: true })
          .eq('id', editingJadwal.id)
        if (err1) throw err1
        
        // 2. Set OB pengganti dengan shift baru
        const { error: err2 } = await supabase
          .from('jadwal')
          .update({ shift: newShift, is_override: true })
          .match({ ob_id: newObId, tanggal: tanggal })
        if (err2) throw err2
      }
      
      alert('Jadwal berhasil diubah!')
      setEditingJadwal(null)
      setSelectedDay(null)
      loadJadwal()
    } catch (err) {
      alert('Gagal mengubah jadwal: ' + err.message)
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Jadwal Kerja</h1>
          <p className="text-sm text-gray-500">{formatBulanID(tahun, bulan)}</p>
        </div>

        <div className="flex items-center gap-2">
          {(role === 'admin' || role === 'hr') && (
            <button
              onClick={handleGenerateJadwal}
              disabled={generating}
              className="bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {generating ? 'Generate...' : '+ Generate'}
            </button>
          )}
        </div>
      </div>

      {/* Month Nav */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 p-3">
        <button
          onClick={() => setCurrentDate(subMonths(currentDate, 1))}
          className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="font-semibold text-gray-900 text-sm">
          {format(currentDate, 'MMMM yyyy', { locale: id })}
        </span>
        <button
          onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-xs">
        {[
          { id: 'pagi', label: 'Pagi 06:00-18:00', color: 'bg-amber-100 text-amber-800 border-amber-200' },
          { id: 'malam', label: 'Malam 18:00-06:00', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
          { id: 'libur', label: 'Libur', color: 'bg-gray-100 text-gray-500 border-gray-200' },
        ].map(l => (
          <span key={l.label} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-medium ${l.color}`}>
            <ShiftIcon shift={l.id} />
            {l.label}
          </span>
        ))}
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(d => (
            <div key={d} className="py-2.5 text-center text-xs font-semibold text-gray-400">
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Memuat jadwal...</div>
        ) : (
          <div className="grid grid-cols-7">
            {days.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="min-h-[80px] border-b border-r border-gray-50" />

              const dateStr = getDateStr(day)
              const jadwalHari = jadwalByDate[dateStr] || []
              const isToday = dateStr === today

              return (
                <button
                  key={day}
                  onClick={() => handleDayClick(day)}
                  className={`min-h-[80px] p-1.5 border-b border-r border-gray-50 text-left hover:bg-blue-50/50 transition-colors ${
                    isToday ? 'bg-blue-50' : ''
                  }`}
                >
                  <span className={`text-xs font-semibold inline-flex items-center justify-center w-6 h-6 rounded-full ${
                    isToday ? 'bg-blue-600 text-white' : 'text-gray-700'
                  }`}>
                    {day}
                  </span>

                  <div className="mt-1 space-y-0.5">
                    {jadwalHari.map(j => {
                      const badge = shiftLabel(j.shift)
                      return (
                        <div key={j.id} className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md truncate ${badge.color}`}>
                          <ShiftIcon shift={j.shift} className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{j.ob?.nama?.split(' ')[0]}</span>
                        </div>
                      )
                    })}
                    {jadwalHari.length === 0 && (
                      <div className="text-[10px] text-gray-300">-</div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Day Detail Modal */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">
                {format(new Date(selectedDay.dateStr), 'EEEE, dd MMMM yyyy', { locale: id })}
              </h3>
              <button onClick={() => setSelectedDay(null)} className="text-gray-400 p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-3">
              {selectedDay.jadwal.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Belum ada jadwal</p>
              ) : (
                selectedDay.jadwal.map(j => {
                  const badge = shiftLabel(j.shift)
                  const isMyShift = j.ob?.id === profile?.id
                  const canRequest = isMyShift && j.shift !== 'libur' && role === 'ob'

                  return (
                    <div key={j.id} className={`p-4 rounded-xl border ${isMyShift ? 'border-blue-200 bg-blue-50' : 'border-gray-100'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{j.ob?.nama}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{jamShift(j.shift)}</p>
                          {j.is_override && (
                            <p className="text-xs text-orange-500 mt-0.5">✎ Telah diubah</p>
                          )}
                        </div>
                        <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${badge.color}`}>
                          <ShiftIcon shift={j.shift} />
                          {badge.label}
                        </span>
                      </div>

                      {canRequest && (
                        <button
                          onClick={() => handleRequestLibur(j)}
                          className="mt-3 w-full py-2 text-xs font-semibold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          Request Libur
                        </button>
                      )}
                      {(role === 'admin' || role === 'hr') && (
                        <button
                          onClick={() => setEditingJadwal(j)}
                          className="mt-3 w-full py-2 text-xs font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Ubah Jadwal / Pindah OB
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Request Libur Modal */}
      {requestLiburData && (
        <RequestLiburModal
          jadwal={requestLiburData}
          onClose={() => setRequestLiburData(null)}
          onSuccess={() => {
            setRequestLiburData(null)
            alert('Request libur berhasil dikirim!')
          }}
        />
      )}

      {/* Edit Jadwal Modal (Admin/HR) */}
      {editingJadwal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Ubah Jadwal</h3>
              <button onClick={() => setEditingJadwal(null)} className="text-gray-400 p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSaveEditJadwal} className="p-5 space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Pilih OB Pengganti</label>
                <select name="ob_id" defaultValue={editingJadwal.ob_id} className="w-full border border-gray-200 rounded-xl p-2.5 outline-none focus:border-blue-500">
                  {obList.map(ob => (
                    <option key={ob.id} value={ob.id}>{ob.nama}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Pilih Shift</label>
                <select name="shift" defaultValue={editingJadwal.shift} className="w-full border border-gray-200 rounded-xl p-2.5 outline-none focus:border-blue-500">
                  <option value="pagi">Pagi (06:00 - 18:00)</option>
                  <option value="malam">Malam (18:00 - 06:00)</option>
                  <option value="libur">Libur</option>
                </select>
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full bg-blue-600 text-white rounded-xl py-2.5 font-semibold hover:bg-blue-700">
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
