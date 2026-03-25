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
    .single()

  // Use onboarding_completed flag — NOT balance, which can legitimately be 0 or negative
  const onboardingCompleted = profileData != null && 'onboarding_completed' in profileData
    ? (profileData as { onboarding_completed: boolean }).onboarding_completed
    : false
  if (!profileData || !onboardingCompleted) redirect('/onboarding')
  redirect('/dashboard')
}
