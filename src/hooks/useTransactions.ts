'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

type Transaction = Database['public']['Tables']['transactions']['Row']

export function useTransactions(limit?: number) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchTransactions() {
    const supabase = createClient()
    let query = supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })
    if (limit) query = query.limit(limit)
    const result = await query
    setTransactions(((result as unknown as { data: Transaction[] | null }).data ?? []))
    setLoading(false)
  }

  useEffect(() => { fetchTransactions() }, [limit])

  async function insertTransactions(txns: Omit<Transaction, 'id' | 'user_id' | 'created_at'>[]) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await (supabase.from('transactions') as any)
      .insert(
        txns.map(t => ({
          ...t,
          user_id: user.id,
        }))
      )
    await fetchTransactions()
  }

  return { transactions, loading, insertTransactions, refetch: fetchTransactions }
}
