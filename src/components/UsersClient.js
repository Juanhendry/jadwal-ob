// src/components/UsersClient.js
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

const ROLE_LABEL = { admin: 'Admin', hr: 'HR', ob: 'OB' }
const ROLE_COLOR = {
  admin: 'bg-purple-100 text-purple-800 border-purple-200',
  hr: 'bg-blue-100 text-blue-800 border-blue-200',
  ob: 'bg-green-100 text-green-800 border-green-200',
}

export default function UsersClient({ profile, initialUsers }) {
  const [users, setUsers] = useState(initialUsers)
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [form, setForm] = useState({ nama: '', email: '', password: '', role: 'ob' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isAdmin = profile?.role === 'admin'

  async function loadUsers() {
    const supabase = createClient()
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    
    const finalData = profile?.role === 'hr' 
      ? (data || []).filter(u => u.role !== 'admin')
      : (data || [])
      
    setUsers(finalData)
  }

  function openAdd() {
    setEditUser(null)
    setForm({ nama: '', email: '', password: '', role: 'ob' })
    setError('')
    setShowModal(true)
  }

  function openEdit(u) {
    setEditUser(u)
    setForm({ nama: u.nama, email: u.email, password: '', role: u.role })
    setError('')
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.nama.trim() || !form.email.trim()) {
      setError('Nama dan email wajib diisi.')
      return
    }
    if (!editUser && !form.password.trim()) {
      setError('Password wajib diisi untuk user baru.')
      return
    }

    setSaving(true)
    setError('')
    const supabase = createClient()

    if (editUser) {
      // Update profile
      const { error: err } = await supabase
        .from('profiles')
        .update({ nama: form.nama.trim(), role: form.role })
        .eq('id', editUser.id)

      if (err) { setError(err.message); setSaving(false); return }

    } else {
      // Buat user baru via API route
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          nama: form.nama.trim(),
          role: form.role,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Gagal membuat user.'); setSaving(false); return }
    }

    await loadUsers()
    setShowModal(false)
    setSaving(false)
  }

  async function handleToggleAktif(u) {
    if (!isAdmin) return
    if (!confirm(`${u.aktif ? 'Nonaktifkan' : 'Aktifkan'} akun ${u.nama}?`)) return
    const supabase = createClient()
    await supabase.from('profiles').update({ aktif: !u.aktif }).eq('id', u.id)
    await loadUsers()
  }

  async function handleDelete(u) {
    if (!isAdmin) return
    if (!confirm(`Hapus user ${u.nama}? Tindakan ini tidak bisa dibatalkan.`)) return
    const res = await fetch(`/api/users?id=${u.id}`, { method: 'DELETE' })
    if (res.ok) {
      await loadUsers()
    } else {
      alert('Gagal menghapus user.')
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pengguna</h1>
          <p className="text-sm text-gray-500">{users.length} akun terdaftar</p>
        </div>
        {isAdmin && (
          <button
            onClick={openAdd}
            className="bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors"
          >
            + Tambah User
          </button>
        )}
      </div>

      {/* User List */}
      <div className="space-y-3">
        {users.map(u => (
          <div key={u.id} className={`bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 ${!u.aktif ? 'opacity-50' : ''}`}>
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {u.nama?.charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-gray-900 text-sm">{u.nama}</p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${ROLE_COLOR[u.role]}`}>
                  {ROLE_LABEL[u.role]}
                </span>
                {!u.aktif && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200">
                    Nonaktif
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5 truncate">{u.email}</p>
            </div>

            {/* Actions */}
            {isAdmin && u.id !== profile.id && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEdit(u)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleToggleAktif(u)}
                  className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                  title={u.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={u.aktif
                      ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                      : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(u)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Hapus"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            )}

            {/* HR bisa edit tapi tidak hapus */}
            {profile?.role === 'hr' && u.role === 'ob' && u.id !== profile.id && (
              <button
                onClick={() => openEdit(u)}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">{editUser ? 'Edit User' : 'Tambah User Baru'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Lengkap</label>
                <input
                  type="text"
                  value={form.nama}
                  onChange={e => setForm(f => ({ ...f, nama: e.target.value }))}
                  placeholder="Nama OB"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="email@perusahaan.com"
                  disabled={!!editUser}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>

              {!editUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Min. 6 karakter"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  <option value="ob">OB (Office Boy)</option>
                  <option value="hr">HR</option>
                  {isAdmin && <option value="admin">Admin</option>}
                </select>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
                  {error}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
