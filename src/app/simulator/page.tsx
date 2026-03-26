'use client'
import SimulatorPanel from '@/components/SimulatorPanel'
import { useAccounts } from '@/hooks/useAccounts'
import { useRecurringItems } from '@/hooks/useRecurringItems'
import { usePlannedItems } from '@/hooks/usePlannedItems'
import { useProjection } from '@/hooks/useProjection'
import { createClient } from '@/lib/supabase/client'

export default function SimulatorPage() {
  const { defaultAccount, updateBalance } = useAccounts()
  const { items } = useRecurringItems()
  const { items: plannedItems } = usePlannedItems()
  const projection = useProjection(defaultAccount?.balance ?? null, items, plannedItems)

  async function handleRegister(amount: number) {
    if (!defaultAccount) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await (supabase.from('transactions') as any).insert({
      user_id: user.id,
      date: new Date().toISOString().split('T')[0],
      description: 'Gasto registado',
      amount: -amount,
      account_id: defaultAccount.id,
      source: 'manual',
    })
    await updateBalance(defaultAccount.id, defaultAccount.balance - amount)
  }

  if (!defaultAccount || !projection) {
    return <div className="flex items-center justify-center h-64 text-gray-400">A carregar…</div>
  }

  return (
    <SimulatorPanel
      projection={projection}
      currentBalance={defaultAccount.balance}
      onRegister={handleRegister}
    />
  )
}
