// src/components/DelegasiModal.js
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { formatTanggalID, shiftLabel, jamShift } from '@/lib/jadwal-utils'
import ShiftIcon from './ShiftIcon'

export default function DelegasiModal({ request, onClose, onSuccess }) {
  const [obList, setObList] = useState([])
  const [jadwalOb, setJadwalOb] = useState({})
  const [selectedOb, setSelectedOb] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [rejectLoading, setRejectLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = createClient()

    // Ambil semua OB kecuali yang request
    const { data: obs } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'ob')
      .eq('aktif', true)
      .neq('id', request.ob_id)

    if (obs) {
      setObList(obs)

      // Ambil jadwal mereka di tanggal request
      const { data: jadwals } = await supabase
        .from('jadwal')
        .select('*')
        .in('ob_id', obs.map(o => o.id))
        .eq('tanggal', request.tanggal)

      const jadwalMap = {}
      jadwals?.forEach(j => { jadwalMap[j.ob_id] = j })
      setJadwalOb(jadwalMap)
    }

    setLoading(false)
  }

  async function handleDelegasi() {
    if (!selectedOb) return
    setSaving(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 1. Update request libur → approved + set pengganti
    await supabase
      .from('request_libur')
      .update({
        status: 'approved',
        pengganti_id: selectedOb,
        diproses_oleh: user.id,
      })
      .eq('id', request.id)

    // 2. Update jadwal OB yang request → libur (is_override = true)
    await supabase
      .from('jadwal')
      .upsert({
        ob_id: request.ob_id,
        tanggal: request.tanggal,
        shift: 'libur',
        is_override: true,
      }, { onConflict: 'ob_id,tanggal' })

    // 3. Update jadwal OB pengganti → shift pagi (is_override = true)
    // OB pengganti akan masuk shift pagi (menggantikan OB yang libur)
    await supabase
      .from('jadwal')
      .upsert({
        ob_id: selectedOb,
        tanggal: request.tanggal,
        shift: 'pagi',
        is_override: true,
      }, { onConflict: 'ob_id,tanggal' })

    setSaving(false)
    onSuccess()
  }

  async function handleReject() {
    setRejectLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    await supabase
      .from('request_libur')
      .update({ status: 'rejected', diproses_oleh: user.id })
      .eq('id', request.id)

    setRejectLoading(false)
    onSuccess()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-gray-900">Proses Request Libur</h3>
              <p className="text-sm text-gray-500 mt-0.5">{formatTanggalID(request.tanggal)}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Info Request */}
          <div className="bg-orange-50 rounded-xl p-4">
            <p className="text-sm font-semibold text-orange-900">{request.ob?.nama} minta libur</p>
            {request.alasan && (
              <p className="text-xs text-orange-700 mt-1">Alasan: {request.alasan}</p>
            )}
          </div>

          {/* Pilih Pengganti */}
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-3">Pilih OB Pengganti</p>

            {loading ? (
              <div className="space-y-2">
                {[1,2].map(i => (
                  <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : obList.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Tidak ada OB lain</p>
            ) : (
              <div className="space-y-2">
                {obList.map(ob => {
                  const j = jadwalOb[ob.id]
                  const badge = shiftLabel(j?.shift || 'libur')
                  const isSelected = selectedOb === ob.id
                  const keterangan = j?.shift === 'malam'
                    ? '⚠️ Akan jadi shift 24 jam'
                    : j?.shift === 'libur'
                    ? 'Sedang libur, akan dipanggil masuk'
                    : 'Sama-sama shift pagi'

                  return (
                    <button
                      key={ob.id}
                      onClick={() => setSelectedOb(ob.id)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-100 bg-white hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{ob.nama}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{keterangan}</p>
                          {j?.shift && (
                            <p className="text-xs text-gray-500 mt-0.5">{jamShift(j.shift)}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${badge.color}`}>
                            <ShiftIcon shift={j?.shift || 'libur'} />
                            {badge.label}
                          </span>
                          {isSelected && (
                            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button
            onClick={handleReject}
            disabled={rejectLoading || saving}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {rejectLoading ? 'Menolak...' : 'Tolak'}
          </button>
          <button
            onClick={handleDelegasi}
            disabled={!selectedOb || saving || rejectLoading}
            className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {saving ? 'Menyimpan...' : 'Delegasikan'}
          </button>
        </div>
      </div>
    </div>
  )
}
