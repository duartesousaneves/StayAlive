'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

export type CardPayment = Database['public']['Tables']['card_payment_schedules']['Row']
type CardPaymentInsert = Database['public']['Tables']['card_payment_schedules']['Insert']

export function useCardPayments() {
  const [items, setItems] = useState<CardPayment[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchItems() {
    const supabase = createClient()
    const { data } = await supabase
      .from('card_payment_schedules')
      .select('*')
      .eq('active', true)
      .order('planned_date', { ascending: true })
    setItems((data as CardPayment[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [])

  async function addItem(item: Omit<CardPaymentInsert, 'user_id'>) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await (supabase.from('card_payment_schedules') as any)
      .insert({ ...item, user_id: user.id })
    await fetchItems()
  }

  async function updateItem(id: string, item: Omit<CardPaymentInsert, 'user_id'>) {
    const supabase = createClient()
    await (supabase.from('card_payment_schedules') as any)
      .update(item)
      .eq('id', id)
    await fetchItems()
  }

  async function removeItem(id: string) {
    const supabase = createClient()
    await (supabase.from('card_payment_schedules') as any)
      .update({ active: false })
      .eq('id', id)
    await fetchItems()
  }

  /**
   * Executes a scheduled card payment:
   * 1. Computes the effective amount (fixed or percentage of card balance)
   * 2. Deducts from source account
   * 3. Reduces credit card debt
   * 4. Soft-deletes the schedule
   */
  async function executePayment(
    payment: CardPayment,
    creditCardBalance: number,
    sourceAccountBalance: number
  ) {
    const effectiveAmount = payment.amount !== null
      ? payment.amount
      : (payment.percentage! / 100) * Math.abs(creditCardBalance)

    const supabase = createClient()

    // Deduct from source account
    await (supabase.from('accounts') as any)
      .update({
        balance: sourceAccountBalance - effectiveAmount,
        balance_updated_at: new Date().toISOString(),
      })
      .eq('id', payment.source_account_id)

    // Reduce credit card debt (balance becomes less negative)
    await (supabase.from('accounts') as any)
      .update({
        balance: creditCardBalance + effectiveAmount,
        balance_updated_at: new Date().toISOString(),
      })
      .eq('id', payment.credit_card_id)

    // Soft-delete the schedule
    await removeItem(payment.id)
  }

  return { items, loading, addItem, updateItem, removeItem, executePayment, refetch: fetchItems }
}
