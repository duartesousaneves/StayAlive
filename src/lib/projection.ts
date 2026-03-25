import type { Database } from './supabase/types'

type RecurringItem = Database['public']['Tables']['recurring_items']['Row']

export interface DayProjection {
  date: string // YYYY-MM-DD
  balance: number
  cashflow: number
}

export interface ProjectionResult {
  days: DayProjection[]
  criticalDay: string | null // first day balance < 0
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toISODate(d: Date): string {
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

function expandOccurrences(
  item: RecurringItem,
  today: Date,
  horizon: number
): Date[] {
  const end = addDays(today, horizon)
  const dates: Date[] = []
  const [year, month, day] = item.next_date.split('-').map(Number)
  let d = new Date(year, month - 1, day) // local midnight
  while (d <= end) {
    if (d >= today) dates.push(new Date(d))
    d = nextOccurrence(d, item)
  }
  return dates
}

export function computeProjection(
  currentBalance: number,
  recurringItems: RecurringItem[],
  horizon = 30
): ProjectionResult {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Build cashflow map: date → net cashflow
  const cashflowMap = new Map<string, number>()

  for (const item of recurringItems) {
    if (!item.active) continue
    const sign = item.type === 'income' ? 1 : -1
    const dates = expandOccurrences(item, today, horizon)
    for (const d of dates) {
      const key = toISODate(d)
      cashflowMap.set(key, (cashflowMap.get(key) ?? 0) + sign * item.amount)
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
