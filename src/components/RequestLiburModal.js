// src/components/RequestLiburModal.js
'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { createClient } from '@/lib/supabase'
import { jamShift, shiftLabel } from '@/lib/jadwal-utils'
import ShiftIcon from './ShiftIcon'

export default function RequestLiburModal({ jadwal, onClose, onSuccess }) {
  const [alasan, setAlasan] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const badge = shiftLabel(jadwal.shift)

  async function handleSubmit() {
    setSaving(true)
    setError('')

    const supabase = createClient()

    // Cek apakah sudah ada request untuk tanggal ini
    const { data: existing } = await supabase
      .from('request_libur')
      .select('id, status')
      .eq('ob_id', jadwal.ob_id)
      .eq('tanggal', jadwal.tanggal)
      .single()

    if (existing) {
      if (existing.status === 'pending') {
        setError('Kamu sudah punya request libur yang menunggu untuk tanggal ini.')
        setSaving(false)
        return
      }
      if (existing.status === 'approved') {
        setError('Request libur untuk tanggal ini sudah disetujui.')
        setSaving(false)
        return
      }
    }

    const { error: err } = await supabase
      .from('request_libur')
      .insert({
        ob_id: jadwal.ob_id,
        tanggal: jadwal.tanggal,
        alasan: alasan.trim() || null,
      })

    if (err) {
      setError('Gagal mengirim request. Coba lagi.')
    } else {
      onSuccess()
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Request Libur</h3>
          <button onClick={onClose} className="text-gray-400 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Info jadwal */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-900">
              {format(new Date(jadwal.tanggal), 'EEEE, dd MMMM yyyy', { locale: id })}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${badge.color}`}>
                <ShiftIcon shift={jadwal.shift} />
                {badge.label}
              </span>
              <span className="text-xs text-gray-500">{jamShift(jadwal.shift)}</span>
            </div>
          </div>

          {/* Alasan */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Alasan <span className="text-gray-400 font-normal">(opsional)</span>
            </label>
            <textarea
              value={alasan}
              onChange={e => setAlasan(e.target.value)}
              placeholder="Contoh: keperluan keluarga, sakit, dll."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 placeholder-gray-400 resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
              {error}
            </div>
          )}

          <p className="text-xs text-gray-400">
            Request akan dikirim ke HR/Admin untuk diproses. HR akan menentukan OB pengganti.
          </p>
        </div>

        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Mengirim...' : 'Kirim Request'}
          </button>
        </div>
      </div>
    </div>
  )
}
