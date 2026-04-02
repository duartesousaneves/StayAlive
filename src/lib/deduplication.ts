import { expandOccurrences, toISODate, type ExcludedOccurrences } from './projection'
import { extractKeyword } from './keywords'
import type { Database } from './supabase/types'

type RecurringItem = Database['public']['Tables']['recurring_items']['Row']
type PlannedItem = Database['public']['Tables']['planned_items']['Row']
type CardPayment = Database['public']['Tables']['card_payment_schedules']['Row']
type Account = Database['public']['Tables']['accounts']['Row']
type Transaction = Database['public']['Tables']['transactions']['Row']

export type OccurrenceKey = string  // `${sourceType}:${sourceId}:${date}`

export interface ProjectedOccurrence {
  key: OccurrenceKey
  sourceType: 'recurring' | 'planned' | 'card_payment'
  sourceId: string
  date: string       // YYYY-MM-DD
  amount: number     // absolute value
  name: string
  accountId: string | null
}

export interface MatchCandidate {
  occurrence: ProjectedOccurrence
  transaction: Transaction
  confidence: 'high' | 'medium'
}

export function buildOccurrences(
  recurringItems: RecurringItem[],
  plannedItems: PlannedItem[],
  cardPayments: CardPayment[],
  accounts: Account[],
  selectedAccountId: string | null,
  today: Date,
  horizon: number
): ProjectedOccurrence[] {
  const end = new Date(today)
  end.setDate(today.getDate() + horizon)
  const occurrences: ProjectedOccurrence[] = []

  for (const item of recurringItems) {
    if (!item.active) continue
    if (selectedAccountId && item.account_id !== selectedAccountId) continue
    const dates = expandOccurrences(item, today, horizon)
    for (const d of dates) {
      const date = toISODate(d)
      occurrences.push({
        key: `recurring:${item.id}:${date}`,
        sourceType: 'recurring',
        sourceId: item.id,
        date,
        amount: item.amount,
        name: item.name,
        accountId: item.account_id,
      })
    }
  }

  for (const item of plannedItems) {
    if (!item.active) continue
    if (selectedAccountId && item.account_id !== selectedAccountId) continue
    const [y, m, d] = item.planned_date.split('-').map(Number)
    const itemDate = new Date(y, m - 1, d)
    if (itemDate < today || itemDate > end) continue
    occurrences.push({
      key: `planned:${item.id}:${item.planned_date}`,
      sourceType: 'planned',
      sourceId: item.id,
      date: item.planned_date,
      amount: item.amount,
      name: item.name,
      accountId: item.account_id,
    })
  }

  for (const cp of cardPayments) {
    if (!cp.active) continue
    if (selectedAccountId && cp.source_account_id !== selectedAccountId) continue
    const [y, m, d] = cp.planned_date.split('-').map(Number)
    const payDate = new Date(y, m - 1, d)
    if (payDate < today || payDate > end) continue
    const rawAmount = cp.amount !== null
      ? cp.amount
      : (() => {
          const card = accounts.find(a => a.id === cp.credit_card_id)
          const debt = card ? Math.abs(Math.min(card.balance, 0)) : 0
          return (cp.percentage! / 100) * debt
        })()
    const cardName = accounts.find(a => a.id === cp.credit_card_id)?.name ?? 'Cartão'
    occurrences.push({
      key: `card_payment:${cp.id}:${cp.planned_date}`,
      sourceType: 'card_payment',
      sourceId: cp.id,
      date: cp.planned_date,
      amount: rawAmount,
      name: cardName,
      accountId: cp.source_account_id,
    })
  }

  return occurrences
}

function dateToMs(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).getTime()
}

export function findMatchCandidates(
  occurrences: ProjectedOccurrence[],
  transactions: Transaction[]
): MatchCandidate[] {
  const usedTxnIds = new Set<string>()
  const candidates: MatchCandidate[] = []

  const sorted = [...occurrences].sort((a, b) => a.date.localeCompare(b.date))

  for (const occ of sorted) {
    const occMs = dateToMs(occ.date)

    const best = transactions
      .filter(txn => {
        if (usedTxnIds.has(txn.id)) return false
        if (txn.account_id !== occ.accountId) return false
        const dayDiff = Math.abs((dateToMs(txn.date) - occMs) / 86_400_000)
        if (dayDiff > 3) return false
        const txnAbs = Math.abs(txn.amount)
        const diff = Math.abs(txnAbs - occ.amount)
        return diff <= occ.amount * 0.02 + 0.01
      })
      .sort((a, b) => {
        const aDiff = Math.abs(Math.abs(a.amount) - occ.amount)
        const bDiff = Math.abs(Math.abs(b.amount) - occ.amount)
        if (Math.abs(aDiff - bDiff) > 0.01) return aDiff - bDiff
        return Math.abs(dateToMs(a.date) - occMs) - Math.abs(dateToMs(b.date) - occMs)
      })[0]

    if (!best) continue

    usedTxnIds.add(best.id)

    const occKw = extractKeyword(occ.name) ?? ''
    const txnKw = extractKeyword(best.description) ?? ''
    const confidence: 'high' | 'medium' =
      occKw.length >= 4 && txnKw.length >= 4 &&
      (occKw.toLowerCase().includes(txnKw.toLowerCase()) ||
       txnKw.toLowerCase().includes(occKw.toLowerCase()))
        ? 'high'
        : 'medium'

    candidates.push({ occurrence: occ, transaction: best, confidence })
  }

  return candidates
}

export function toExcludedOccurrences(confirmed: MatchCandidate[]): ExcludedOccurrences {
  const recurringDates = new Map<string, Set<string>>()
  const plannedIds = new Set<string>()
  const cardPaymentIds = new Set<string>()

  for (const { occurrence } of confirmed) {
    if (occurrence.sourceType === 'recurring') {
      const set = recurringDates.get(occurrence.sourceId) ?? new Set<string>()
      set.add(occurrence.date)
      recurringDates.set(occurrence.sourceId, set)
    } else if (occurrence.sourceType === 'planned') {
      plannedIds.add(occurrence.sourceId)
    } else {
      cardPaymentIds.add(occurrence.sourceId)
    }
  }

  return { recurringDates, plannedIds, cardPaymentIds }
}
