// src/app/users/page.js
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import Navbar from '@/components/Navbar'
import UsersClient from '@/components/UsersClient'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Hanya admin dan HR yang boleh akses
  if (!profile || !['admin', 'hr'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at')

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} profile={profile} />
      <UsersClient profile={profile} initialUsers={users || []} />
    </div>
  )
}
