'use client'
import { useMemo } from 'react'
import { computeProjection, computeSimulatedProjection, resolveHorizon, type ProjectionResult, type ExcludedOccurrences, type ProjectionHorizon } from '@/lib/projection'
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
  accounts: Account[] = [],
  selectedAccountId: string | null = null,
  excluded?: ExcludedOccurrences,
  horizon: ProjectionHorizon = '30d'
): ProjectionResult | null {
  return useMemo(() => {
    if (balance === null) return null
    const cardProjections = cardPayments
      .filter(p => p.active)
      .filter(p => p.source_account_id === selectedAccountId || p.credit_card_id === selectedAccountId)
      .map(p => {
        const rawAmount = p.amount !== null
          ? p.amount
          : (() => {
              const card = accounts.find(a => a.id === p.credit_card_id)
              const debt = card ? Math.abs(Math.min(card.balance, 0)) : 0
              return (p.percentage! / 100) * debt
            })()
        const sign = p.source_account_id === selectedAccountId ? -1 : 1
        return { planned_date: p.planned_date, amount: sign * rawAmount, active: true, id: p.id }
      })
    return computeProjection(balance, recurringItems, plannedItems, cardProjections, resolveHorizon(horizon), excluded)
  }, [balance, recurringItems, plannedItems, cardPayments, accounts, selectedAccountId, excluded, horizon])
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
