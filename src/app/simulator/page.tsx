'use client'
import SimulatorPanel from '@/components/SimulatorPanel'
import { useProfile } from '@/hooks/useProfile'
import { useRecurringItems } from '@/hooks/useRecurringItems'
import { useProjection } from '@/hooks/useProjection'
import { createClient } from '@/lib/supabase/client'

export default function SimulatorPage() {
  const { profile, updateBalance, refetch } = useProfile()
  const { items } = useRecurringItems()
  const projection = useProjection(profile?.balance ?? null, items)

  async function handleRegister(amount: number) {
    if (!profile) return
    // Create manual transaction
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await (supabase.from('transactions') as any).insert({
      user_id: user.id,
      date: new Date().toISOString().split('T')[0],
      description: 'Gasto registado',
      amount: -amount, // negative = expense
      source: 'manual',
    })
    // Decrement balance
    await updateBalance(profile.balance - amount)
    await refetch()
  }

  if (!profile || !projection) {
    return <div className="flex items-center justify-center h-64 text-gray-400">A carregar…</div>
  }

  return (
    <SimulatorPanel
      projection={projection}
      currentBalance={profile.balance}
      onRegister={handleRegister}
    />
  )
}
