import type { Database } from './supabase/types'

type RecurringItem = Database['public']['Tables']['recurring_items']['Row']
type PlannedItem = Database['public']['Tables']['planned_items']['Row']

/**
 * Pre-computed card payment for projection (effective amount already resolved).
 * `amount` is a signed net cashflow: negative = expense (source account),
 * positive = income (credit card account — debt reduced).
 */
export interface CardPaymentProjection {
  id?: string
  planned_date: string
  amount: number
  active: boolean
}

export interface DayProjection {
  date: string // YYYY-MM-DD
  balance: number
  cashflow: number
}

export interface ProjectionResult {
  days: DayProjection[]
  criticalDay: string | null // first day balance < 0
}

export interface ExcludedOccurrences {
  recurringDates: Map<string, Set<string>>  // itemId → Set of YYYY-MM-DD dates to skip
  plannedIds: Set<string>                    // plannedItem IDs to skip entirely
  cardPaymentIds: Set<string>                // card_payment_schedules IDs to skip
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function nextOccurrence(from: Date, item: RecurringItem): Date {
  const d = new Date(from)
  switch (item.frequency) {
    case 'weekly':
      d.setDate(d.getDate() + 7)
      break
    case 'quinzenal':
      d.setDate(d.getDate() + 14)
      break
    case 'monthly':
      d.setDate(1)
      d.setMonth(d.getMonth() + 1)
      if (item.day_of_month) d.setDate(item.day_of_month)
      break
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1)
      break
  }
  return d
}

export function expandOccurrences(
  item: RecurringItem,
  today: Date,
  horizon: number
): Date[] {
  const end = addDays(today, horizon)
  const dates: Date[] = []
  const [year, month, day] = item.next_date.split('-').map(Number)
  let d = new Date(year, month - 1, day) // local midnight

  // Defensive: if day_of_month is set but next_date lands on a different day,
  // snap forward to the correct next occurrence on that day_of_month.
  if (item.frequency === 'monthly' && item.day_of_month && d.getDate() !== item.day_of_month) {
    const dom = item.day_of_month
    const candidate = new Date(d.getFullYear(), d.getMonth(), dom)
    if (candidate < d) candidate.setMonth(candidate.getMonth() + 1)
    d = candidate
  }
  const startDate = item.start_date
    ? (() => { const [sy, sm, sd] = item.start_date.split('-').map(Number); return new Date(sy, sm - 1, sd) })()
    : null

  while (d <= end) {
    if (d >= today && (!startDate || d >= startDate)) dates.push(new Date(d))
    d = nextOccurrence(d, item)
  }
  return dates
}

export function computeProjection(
  currentBalance: number,
  recurringItems: RecurringItem[],
  plannedItems: PlannedItem[],
  cardPayments: CardPaymentProjection[] = [],
  horizon = 30,
  excluded?: ExcludedOccurrences
): ProjectionResult {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = addDays(today, horizon)

  // Build cashflow map: date → net cashflow
  const cashflowMap = new Map<string, number>()

  for (const item of recurringItems) {
    if (!item.active) continue
    const sign = item.type === 'income' ? 1 : -1
    const dates = expandOccurrences(item, today, horizon)
    const excludedDates = excluded?.recurringDates.get(item.id) ?? new Set<string>()
    for (const d of dates) {
      const key = toISODate(d)
      if (excludedDates.has(key)) continue
      cashflowMap.set(key, (cashflowMap.get(key) ?? 0) + sign * item.amount)
    }
  }

  for (const item of plannedItems) {
    if (!item.active) continue
    if (excluded?.plannedIds.has(item.id)) continue
    const [year, month, day] = item.planned_date.split('-').map(Number)
    const itemDate = new Date(year, month - 1, day)
    if (itemDate >= today && itemDate <= end) {
      const sign = item.type === 'income' ? 1 : -1
      const key = item.planned_date
      cashflowMap.set(key, (cashflowMap.get(key) ?? 0) + sign * item.amount)
    }
  }

  for (const payment of cardPayments) {
    if (!payment.active) continue
    if (payment.id && excluded?.cardPaymentIds.has(payment.id)) continue
    const [year, month, day] = payment.planned_date.split('-').map(Number)
    const paymentDate = new Date(year, month - 1, day)
    if (paymentDate >= today && paymentDate <= end) {
      cashflowMap.set(payment.planned_date, (cashflowMap.get(payment.planned_date) ?? 0) + payment.amount)
    }
  }

  // Walk days and accumulate
  const days: DayProjection[] = []
  let runningBalance = currentBalance
  let criticalDay: string | null = null

  for (let i = 0; i <= horizon; i++) {
    const date = toISODate(addDays(today, i))
    const cashflow = cashflowMap.get(date) ?? 0
    runningBalance += cashflow
    days.push({ date, balance: runningBalance, cashflow })
    if (criticalDay === null && runningBalance < 0) {
      criticalDay = date
    }
  }

  return { days, criticalDay }
}

export type ProjectionHorizon = '30d' | '90d' | '180d' | '365d' | 'end-of-year'

export const HORIZON_LABELS: Record<ProjectionHorizon, string> = {
  '30d': '30 dias',
  '90d': '90 dias',
  '180d': '180 dias',
  '365d': '365 dias',
  'end-of-year': 'Fim do ano',
}

export function resolveHorizon(horizon: ProjectionHorizon): number {
  if (horizon === 'end-of-year') {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const endOfYear = new Date(today.getFullYear(), 11, 31)
    return Math.max(Math.round((endOfYear.getTime() - today.getTime()) / 86400000), 0)
  }
  const days: Record<string, number> = { '30d': 30, '90d': 90, '180d': 180, '365d': 365 }
  return days[horizon]
}

export function computeSimulatedProjection(
  projection: ProjectionResult,
  spendAmount: number
): ProjectionResult {
  const days = projection.days.map(d => ({
    ...d,
    balance: d.balance - spendAmount,
  }))
  const criticalDay = days.find(d => d.balance < 0)?.date ?? null
  return { days, criticalDay }
}
