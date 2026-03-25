'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

export type Account = Database['public']['Tables']['accounts']['Row']
export type AccountInsert = Database['public']['Tables']['accounts']['Insert']

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchAccounts() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    setAccounts(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchAccounts() }, [])

  const defaultAccount = accounts.find(a => a.is_default) ?? null

  async function updateBalance(accountId: string, balance: number) {
    const supabase = createClient()
    await (supabase.from('accounts') as any)
      .update({ balance, balance_updated_at: new Date().toISOString() })
      .eq('id', accountId)
    await fetchAccounts()
  }

  async function setDefault(accountId: string) {
    const supabase = createClient()
    await (supabase as any).rpc('set_default_account', { p_account_id: accountId })
    await fetchAccounts()
  }

  async function createAccount(data: Omit<AccountInsert, 'user_id'>) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await (supabase.from('accounts') as any).insert({ ...data, user_id: user.id })
    await fetchAccounts()
  }

  async function updateAccount(
    accountId: string,
    patch: Partial<Pick<Account, 'name' | 'balance' | 'credit_limit' | 'statement_close_day'>>
  ) {
    const supabase = createClient()
    const update: Database['public']['Tables']['accounts']['Update'] = { ...patch }
    if ('balance' in patch) update.balance_updated_at = new Date().toISOString()
    await (supabase.from('accounts') as any).update(update).eq('id', accountId)
    await fetchAccounts()
  }

  async function deleteAccount(accountId: string) {
    const supabase = createClient()
    await supabase.from('accounts').delete().eq('id', accountId)
    await fetchAccounts()
  }

  async function getTransactionCount(accountId: string): Promise<number> {
    const supabase = createClient()
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId)
    return count ?? 0
  }

  return {
    accounts,
    defaultAccount,
    loading,
    updateBalance,
    setDefault,
    createAccount,
    updateAccount,
    deleteAccount,
    getTransactionCount,
    refetch: fetchAccounts,
  }
}
