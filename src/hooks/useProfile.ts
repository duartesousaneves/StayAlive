'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

type Profile = Database['public']['Tables']['profiles']['Row']

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const result = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    setProfile((result as unknown as { data: Profile | null }).data)
    setLoading(false)
  }

  useEffect(() => { fetchProfile() }, [])

  async function updateBalance(balance: number) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await (supabase.from('profiles') as any)
      .update({
        balance,
        balance_updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
    await fetchProfile()
  }

  return { profile, loading, updateBalance, refetch: fetchProfile }
}
