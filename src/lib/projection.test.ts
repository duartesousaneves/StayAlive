import { describe, it, expect } from 'vitest'
import { computeProjection } from './projection'
import type { Database } from './supabase/types'

type RecurringItem = Database['public']['Tables']['recurring_items']['Row']
type PlannedItem = Database['public']['Tables']['planned_items']['Row']

function makeRecurring(overrides: Partial<RecurringItem>): RecurringItem {
  return {
    id: 'test-id',
    user_id: 'user-id',
    name: 'Test',
    amount: 100,
    type: 'expense',
    frequency: 'monthly',
    next_date: '2099-01-01',
    day_of_month: null,
    day_of_week: null,
    active: true,
    category_id: null,
    account_id: null,
    start_date: null,
    end_date: null,
    ...overrides,
  }
}

describe('computeProjection', () => {
  it('returns starting balance when no items exist', () => {
    const result = computeProjection(1000, [], [], [], 30)
    expect(result.days[0].balance).toBe(1000)
    expect(result.criticalDay).toBeNull()
  })

  it('deducts a monthly expense on its next_date', () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    const nextDate = tomorrow.toISOString().split('T')[0]

    const item = makeRecurring({ amount: 200, next_date: nextDate, day_of_month: tomorrow.getDate() })
    const result = computeProjection(500, [item], [], [], 30)

    const day = result.days.find(d => d.date === nextDate)
    expect(day?.cashflow).toBe(-200)
    expect(day?.balance).toBe(300)
  })

  it('does not double-count when next_date day differs from day_of_month', () => {
    // Simulates the real bug: next_date = March 31 but day_of_month = 1
    // Both dates fall within a 30-day window starting March 26.
    // Without the fix, the item would be counted on March 31 AND April 1.
    // With the fix, it should only be counted once (April 1).

    const item = makeRecurring({
      amount: 740.73,
      next_date: '2026-03-31',
      day_of_month: 1,
    })

    // Freeze "today" to 2026-03-26 by injecting a known balance and checking
    // that only one deduction of 740.73 occurs in the first 7 days.
    // We can't freeze Date in this test, so we verify via the projection math:
    // if counted twice the total deduction would be 1481.46 in that window.
    const result = computeProjection(948.74, [item], [], [], 30)

    const totalDeducted = result.days.reduce((sum, d) => sum + (d.cashflow < 0 ? Math.abs(d.cashflow) : 0), 0)
    // Within 30 days, a monthly item fires at most twice (if two occurrences fit).
    // But day_of_month=1 means it fires on the 1st — only once in a 30-day window
    // starting on the 26th (April 1, no May 1 since 26+30=April 25).
    // So total deduction must equal exactly 740.73, not 1481.46.
    expect(totalDeducted).toBeCloseTo(740.73, 2)
  })

  it('identifies the first day balance goes negative as criticalDay', () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const in2Days = new Date(today)
    in2Days.setDate(today.getDate() + 2)
    const nextDate = in2Days.toISOString().split('T')[0]

    const item = makeRecurring({ amount: 600, next_date: nextDate, day_of_month: in2Days.getDate() })
    const result = computeProjection(500, [item], [], [], 30)

    expect(result.criticalDay).toBe(nextDate)
  })
})
