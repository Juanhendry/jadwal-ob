// src/app/dashboard/page.js
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import Navbar from '@/components/Navbar'
import DashboardClient from '@/components/DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Ambil request libur pending (untuk HR/Admin)
  let pendingRequests = []
  if (profile?.role === 'admin' || profile?.role === 'hr') {
    const { data } = await supabase
      .from('request_libur')
      .select('*, ob:ob_id(nama)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    pendingRequests = data || []
  }

  // Jadwal hari ini untuk semua OB
  const today = new Date().toISOString().split('T')[0]
  const { data: jadwalHariIni } = await supabase
    .from('jadwal')
    .select('*, ob:ob_id(nama)')
    .eq('tanggal', today)
    .order('shift')

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} profile={profile} />
      <DashboardClient
        profile={profile}
        pendingRequests={pendingRequests}
        jadwalHariIni={jadwalHariIni || []}
        today={today}
      />
    </div>
  )
}
