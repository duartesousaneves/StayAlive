import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single() as { data: { onboarding_completed: boolean } | null; error: unknown }

  // Use onboarding_completed flag — NOT balance, which can legitimately be 0 or negative
  if (!profileData || !profileData.onboarding_completed) redirect('/onboarding')
  redirect('/dashboard')
}
