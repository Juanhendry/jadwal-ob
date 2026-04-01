// src/components/DashboardClient.js
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatTanggalID, shiftLabel, jamShift } from '@/lib/jadwal-utils'
import DelegasiModal from './DelegasiModal'

export default function DashboardClient({ profile, pendingRequests, jadwalHariIni, today }) {
  const [selectedRequest, setSelectedRequest] = useState(null)

  const role = profile?.role

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          Halo, {profile?.nama} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {formatTanggalID(today)}
        </p>
      </div>

      {/* Jadwal Hari Ini */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-3">Jadwal Hari Ini</h2>
        {jadwalHariIni.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <p className="text-gray-400 text-sm">Belum ada jadwal untuk hari ini</p>
            {(role === 'admin' || role === 'hr') && (
              <Link href="/jadwal" className="inline-block mt-3 text-blue-600 text-sm font-medium hover:underline">
                Generate Jadwal →
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {jadwalHariIni.map(j => {
              const badge = shiftLabel(j.shift)
              return (
                <div key={j.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{j.ob?.nama}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{jamShift(j.shift)}</p>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-3">Menu Cepat</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/jadwal" className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-blue-200 hover:shadow-sm transition-all group">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="font-semibold text-gray-900 text-sm">Lihat Jadwal</p>
            <p className="text-xs text-gray-400 mt-0.5">Jadwal bulanan OB</p>
          </Link>

          {(role === 'admin' || role === 'hr') && (
            <Link href="/users" className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-blue-200 hover:shadow-sm transition-all group">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center mb-3 group-hover:bg-indigo-100 transition-colors">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="font-semibold text-gray-900 text-sm">Pengguna</p>
              <p className="text-xs text-gray-400 mt-0.5">Kelola akun OB & HR</p>
            </Link>
          )}
        </div>
      </section>

      {/* Pending Requests (HR/Admin only) */}
      {(role === 'admin' || role === 'hr') && pendingRequests.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-800">Request Libur Menunggu</h2>
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {pendingRequests.length}
            </span>
          </div>
          <div className="space-y-3">
            {pendingRequests.map(req => (
              <div key={req.id} className="bg-white rounded-2xl border border-orange-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{req.ob?.nama}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Request libur: <span className="font-medium">{formatTanggalID(req.tanggal)}</span>
                    </p>
                    {req.alasan && (
                      <p className="text-xs text-gray-400 mt-1">"{req.alasan}"</p>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedRequest(req)}
                    className="shrink-0 bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    Proses
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Delegasi Modal */}
      {selectedRequest && (
        <DelegasiModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onSuccess={() => {
            setSelectedRequest(null)
            window.location.reload()
          }}
        />
      )}
    </main>
  )
}
