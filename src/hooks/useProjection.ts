'use client'
import { useMemo } from 'react'
import { computeProjection, computeSimulatedProjection, type ProjectionResult } from '@/lib/projection'
import type { Database } from '@/lib/supabase/types'

type RecurringItem = Database['public']['Tables']['recurring_items']['Row']

export function useProjection(
  balance: number | null,
  recurringItems: RecurringItem[]
): ProjectionResult | null {
  return useMemo(() => {
    if (balance === null) return null
    return computeProjection(balance, recurringItems)
  }, [balance, recurringItems])
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
