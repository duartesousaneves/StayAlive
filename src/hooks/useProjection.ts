'use client'
import { useMemo } from 'react'
import { computeProjection, computeSimulatedProjection, type ProjectionResult } from '@/lib/projection'
import type { Database } from '@/lib/supabase/types'

type RecurringItem = Database['public']['Tables']['recurring_items']['Row']
type PlannedItem = Database['public']['Tables']['planned_items']['Row']
type CardPayment = Database['public']['Tables']['card_payment_schedules']['Row']
type Account = Database['public']['Tables']['accounts']['Row']

export function useProjection(
  balance: number | null,
  recurringItems: RecurringItem[],
  plannedItems: PlannedItem[],
  cardPayments: CardPayment[] = [],
  accounts: Account[] = []
): ProjectionResult | null {
  return useMemo(() => {
    if (balance === null) return null
    const cardProjections = cardPayments
      .filter(p => p.active)
      .map(p => {
        let amount: number
        if (p.amount !== null) {
          amount = p.amount
        } else {
          const card = accounts.find(a => a.id === p.credit_card_id)
          const debt = card ? Math.abs(Math.min(card.balance, 0)) : 0
          amount = (p.percentage! / 100) * debt
        }
        return { planned_date: p.planned_date, amount, active: true }
      })
    return computeProjection(balance, recurringItems, plannedItems, cardProjections)
  }, [balance, recurringItems, plannedItems, cardPayments, accounts])
}

export function useSimulatedProjection(
  projection: ProjectionResult | null,
  spendAmount: number
): ProjectionResult | null {
  return useMemo(() => {
    if (!projection) return null
    if (spendAmount === 0) return projection
    return computeSimulatedProjection(projection, spendAmount)
  }, [projection, spendAmount])
}
