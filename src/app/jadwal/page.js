// src/app/jadwal/page.js
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import Navbar from '@/components/Navbar'
import JadwalClient from '@/components/JadwalClient'

export default async function JadwalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Ambil semua OB aktif
  const { data: obList } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'ob')
    .eq('aktif', true)
    .order('created_at')

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} profile={profile} />
      <JadwalClient profile={profile} obList={obList || []} />
    </div>
  )
}
