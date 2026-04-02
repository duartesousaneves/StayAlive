import { describe, it, expect } from 'vitest'
import { buildOccurrences, findMatchCandidates, toExcludedOccurrences } from './deduplication'
import type { Database } from './supabase/types'

type RecurringItem = Database['public']['Tables']['recurring_items']['Row']
type PlannedItem = Database['public']['Tables']['planned_items']['Row']
type CardPayment = Database['public']['Tables']['card_payment_schedules']['Row']
type Account = Database['public']['Tables']['accounts']['Row']
type Transaction = Database['public']['Tables']['transactions']['Row']

const TODAY = new Date(2026, 3, 1) // April 1, 2026 — fixed for deterministic tests

function makeRecurring(overrides: Partial<RecurringItem> = {}): RecurringItem {
  return {
    id: 'rec-1', user_id: 'u', name: 'PAG.PRESTACAO N.074', amount: 740.73,
    type: 'expense', frequency: 'monthly', day_of_month: 1, day_of_week: null,
    next_date: '2026-04-01', active: true, category_id: null,
    account_id: 'acc-1', start_date: null, end_date: null, ...overrides,
  }
}

function makePlanned(overrides: Partial<PlannedItem> = {}): PlannedItem {
  return {
    id: 'pln-1', user_id: 'u', name: 'Oficina', amount: 400,
    type: 'expense', planned_date: '2026-04-03', category_id: null,
    notes: null, active: true, created_at: '', account_id: 'acc-1', ...overrides,
  }
}

function makeCardPayment(overrides: Partial<CardPayment> = {}): CardPayment {
  return {
    id: 'cp-1', user_id: 'u', credit_card_id: 'card-1', source_account_id: 'acc-1',
    amount: 200, percentage: null, planned_date: '2026-04-17',
    notes: null, active: true, created_at: '', ...overrides,
  }
}

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'acc-1', user_id: 'u', name: 'Conta à ordem', type: 'checking',
    balance: 500, balance_updated_at: null, credit_limit: null,
    statement_close_day: null, currency: 'EUR', is_default: true, created_at: '', ...overrides,
  }
}

function makeTxn(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'txn-1', user_id: 'u', date: '2026-04-01',
    description: 'PAG.PRESTACAO N.075 EMP.N. 1802910883',
    amount: -740.73, account_id: 'acc-1', source: 'csv', category_id: null, created_at: '', ...overrides,
  }
}

describe('buildOccurrences', () => {
  it('builds a recurring occurrence on its next_date', () => {
    const occs = buildOccurrences([makeRecurring()], [], [], [makeAccount()], 'acc-1', TODAY, 30)
    expect(occs.some(o => o.sourceType === 'recurring' && o.date === '2026-04-01' && o.amount === 740.73)).toBe(true)
  })

  it('builds a planned occurrence within the horizon', () => {
    const occs = buildOccurrences([], [makePlanned()], [], [makeAccount()], 'acc-1', TODAY, 30)
    expect(occs.some(o => o.sourceType === 'planned' && o.date === '2026-04-03' && o.amount === 400)).toBe(true)
  })

  it('excludes planned items past today', () => {
    const past = makePlanned({ planned_date: '2026-03-31' })
    const occs = buildOccurrences([], [past], [], [makeAccount()], 'acc-1', TODAY, 30)
    expect(occs).toHaveLength(0)
  })

  it('excludes items linked to a different account', () => {
    const occs = buildOccurrences(
      [makeRecurring({ account_id: 'acc-2' })], [], [], [makeAccount()], 'acc-1', TODAY, 30
    )
    expect(occs).toHaveLength(0)
  })

  it('builds a card payment occurrence with fixed amount', () => {
    const occs = buildOccurrences([], [], [makeCardPayment()], [makeAccount()], 'acc-1', TODAY, 30)
    expect(occs.some(o => o.sourceType === 'card_payment' && o.amount === 200 && o.date === '2026-04-17')).toBe(true)
  })

  it('builds a card payment with percentage-based amount', () => {
    const card: Account = makeAccount({ id: 'card-1', type: 'credit_card', balance: -400, is_default: false })
    const cp = makeCardPayment({ amount: null, percentage: 50 })
    const occs = buildOccurrences([], [], [cp], [makeAccount(), card], 'acc-1', TODAY, 30)
    expect(occs.find(o => o.sourceType === 'card_payment')?.amount).toBeCloseTo(200, 2)
  })
})

describe('findMatchCandidates', () => {
  it('matches exact amount and date', () => {
    const occs = buildOccurrences([makeRecurring()], [], [], [makeAccount()], 'acc-1', TODAY, 30)
    const candidates = findMatchCandidates(occs, [makeTxn()])
    expect(candidates).toHaveLength(1)
    expect(candidates[0].occurrence.sourceId).toBe('rec-1')
    expect(candidates[0].transaction.id).toBe('txn-1')
  })

  it('matches transaction 2 days after the occurrence date', () => {
    const occs = buildOccurrences([makeRecurring()], [], [], [makeAccount()], 'acc-1', TODAY, 30)
    const candidates = findMatchCandidates(occs, [makeTxn({ date: '2026-04-03' })])
    expect(candidates).toHaveLength(1)
  })

  it('does not match transaction 4 days after', () => {
    const occs = buildOccurrences([makeRecurring()], [], [], [makeAccount()], 'acc-1', TODAY, 30)
    const candidates = findMatchCandidates(occs, [makeTxn({ date: '2026-04-05' })])
    expect(candidates).toHaveLength(0)
  })

  it('matches amount within 2% tolerance', () => {
    const occs = buildOccurrences([makeRecurring()], [], [], [makeAccount()], 'acc-1', TODAY, 30)
    // 740.73 * 0.99 = 733.32
    const candidates = findMatchCandidates(occs, [makeTxn({ amount: -733.32 })])
    expect(candidates).toHaveLength(1)
  })

  it('does not match amount more than 2% off', () => {
    const occs = buildOccurrences([makeRecurring()], [], [], [makeAccount()], 'acc-1', TODAY, 30)
    const candidates = findMatchCandidates(occs, [makeTxn({ amount: -700 })])
    expect(candidates).toHaveLength(0)
  })

  it('does not match a different account', () => {
    const occs = buildOccurrences([makeRecurring()], [], [], [makeAccount()], 'acc-1', TODAY, 30)
    const candidates = findMatchCandidates(occs, [makeTxn({ account_id: 'acc-2' })])
    expect(candidates).toHaveLength(0)
  })

  it('one transaction matches at most one occurrence', () => {
    const rec1 = makeRecurring({ id: 'rec-1', next_date: '2026-04-01' })
    const rec2 = makeRecurring({ id: 'rec-2', next_date: '2026-04-02', day_of_month: 2 })
    const occs = buildOccurrences([rec1, rec2], [], [], [makeAccount()], 'acc-1', TODAY, 30)
    const candidates = findMatchCandidates(occs, [makeTxn()])
    expect(candidates).toHaveLength(1)
  })

  it('matches a planned item', () => {
    const occs = buildOccurrences([], [makePlanned()], [], [makeAccount()], 'acc-1', TODAY, 30)
    const candidates = findMatchCandidates(occs, [makeTxn({ date: '2026-04-03', amount: -400, description: 'Oficina' })])
    expect(candidates).toHaveLength(1)
    expect(candidates[0].occurrence.sourceType).toBe('planned')
  })

  it('matches a card payment', () => {
    const occs = buildOccurrences([], [], [makeCardPayment()], [makeAccount()], 'acc-1', TODAY, 30)
    const candidates = findMatchCandidates(occs, [makeTxn({ date: '2026-04-17', amount: -200, description: 'Pagamento cartão' })])
    expect(candidates).toHaveLength(1)
    expect(candidates[0].occurrence.sourceType).toBe('card_payment')
  })
})

describe('toExcludedOccurrences', () => {
  it('maps recurring occurrence to recurringDates', () => {
    const occ = buildOccurrences([makeRecurring()], [], [], [makeAccount()], 'acc-1', TODAY, 30)[0]
    const excluded = toExcludedOccurrences([{ occurrence: occ, transaction: makeTxn(), confidence: 'high' }])
    expect(excluded.recurringDates.get('rec-1')?.has('2026-04-01')).toBe(true)
  })

  it('maps planned occurrence to plannedIds', () => {
    const occ = buildOccurrences([], [makePlanned()], [], [makeAccount()], 'acc-1', TODAY, 30)[0]
    const excluded = toExcludedOccurrences([{ occurrence: occ, transaction: makeTxn(), confidence: 'medium' }])
    expect(excluded.plannedIds.has('pln-1')).toBe(true)
  })

  it('maps card_payment occurrence to cardPaymentIds', () => {
    const occ = buildOccurrences([], [], [makeCardPayment()], [makeAccount()], 'acc-1', TODAY, 30)[0]
    const excluded = toExcludedOccurrences([{ occurrence: occ, transaction: makeTxn(), confidence: 'medium' }])
    expect(excluded.cardPaymentIds.has('cp-1')).toBe(true)
  })
})
