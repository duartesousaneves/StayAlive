'use client'
import { useState, useMemo, useCallback } from 'react'
import { buildOccurrences, findMatchCandidates, toExcludedOccurrences, type MatchCandidate, type OccurrenceKey } from '@/lib/deduplication'
import type { ExcludedOccurrences } from '@/lib/projection'
import type { Database } from '@/lib/supabase/types'

type RecurringItem = Database['public']['Tables']['recurring_items']['Row']
type PlannedItem = Database['public']['Tables']['planned_items']['Row']
type CardPayment = Database['public']['Tables']['card_payment_schedules']['Row']
type Account = Database['public']['Tables']['accounts']['Row']
type Transaction = Database['public']['Tables']['transactions']['Row']

const STORAGE_KEY = 'stayalive_match_decisions'
type Decisions = Record<OccurrenceKey, 'confirmed' | 'dismissed'>

function loadDecisions(): Decisions {
  try {
    if (typeof window === 'undefined') return {}
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function useMatchReview(
  recurringItems: RecurringItem[],
  plannedItems: PlannedItem[],
  cardPayments: CardPayment[],
  accounts: Account[],
  transactions: Transaction[],
  selectedAccountId: string | null
): {
  pendingMatches: MatchCandidate[]
  excludedOccurrences: ExcludedOccurrences
  confirm: (key: OccurrenceKey) => void
  dismiss: (key: OccurrenceKey) => void
} {
  const [decisions, setDecisions] = useState<Decisions>(() => loadDecisions())

  const allCandidates = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const windowStart = new Date(today)
    windowStart.setDate(today.getDate() - 3)
    const windowEnd = new Date(today)
    windowEnd.setDate(today.getDate() + 30)

    const windowTxns = transactions.filter(t => {
      const [y, m, d] = t.date.split('-').map(Number)
      const td = new Date(y, m - 1, d)
      return td >= windowStart && td <= windowEnd
    })

    const occs = buildOccurrences(
      recurringItems, plannedItems, cardPayments, accounts, selectedAccountId, today, 30
    )
    return findMatchCandidates(occs, windowTxns)
  }, [recurringItems, plannedItems, cardPayments, accounts, transactions, selectedAccountId])

  const pendingMatches = useMemo(
    () => allCandidates.filter(c => !decisions[c.occurrence.key]),
    [allCandidates, decisions]
  )

  const excludedOccurrences = useMemo(() => {
    const confirmed = allCandidates.filter(c => decisions[c.occurrence.key] === 'confirmed')
    return toExcludedOccurrences(confirmed)
  }, [allCandidates, decisions])

  const confirm = useCallback((key: OccurrenceKey) => {
    setDecisions(prev => {
      const next = { ...prev, [key]: 'confirmed' as const }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const dismiss = useCallback((key: OccurrenceKey) => {
    setDecisions(prev => {
      const next = { ...prev, [key]: 'dismissed' as const }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return { pendingMatches, excludedOccurrences, confirm, dismiss }
}
