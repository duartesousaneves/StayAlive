'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

type Transaction = Database['public']['Tables']['transactions']['Row']

export interface TransactionFormData {
  date: string
  amount: number
  description: string
  account_id: string | null
  category_id: string | null
  tag_ids: string[]
}

interface EditState {
  isOpen: boolean
  transaction: Transaction | null
  saving: boolean
  deleting: boolean
  confirmDelete: boolean
}

export function useTransactionEdit(onMutated: () => void) {
  const [state, setState] = useState<EditState>({
    isOpen: false,
    transaction: null,
    saving: false,
    deleting: false,
    confirmDelete: false,
  })

  function open(transaction: Transaction) {
    setState({ isOpen: true, transaction, saving: false, deleting: false, confirmDelete: false })
  }

  function close() {
    setState(s => ({ ...s, isOpen: false, transaction: null }))
  }

  function requestDelete() {
    setState(s => ({ ...s, confirmDelete: true }))
  }

  function cancelDelete() {
    setState(s => ({ ...s, confirmDelete: false }))
  }

  async function adjustAccountBalance(supabase: ReturnType<typeof createClient>, accountId: string, delta: number) {
    const { data, error } = await (supabase.from('accounts') as any)
      .select('balance')
      .eq('id', accountId)
      .limit(1)
    if (error || !data || data.length === 0) return
    const currentBalance = (data[0] as { balance: number }).balance
    await (supabase.from('accounts') as any)
      .update({ balance: currentBalance + delta, balance_updated_at: new Date().toISOString() })
      .eq('id', accountId)
  }

  async function save(data: TransactionFormData) {
    if (!state.transaction) return
    setState(s => ({ ...s, saving: true }))
    const supabase = createClient()

    const oldAccountId = state.transaction.account_id
    const oldAmount = state.transaction.amount
    const newAccountId = data.account_id
    const newAmount = data.amount

    await (supabase.from('transactions') as any)
      .update({
        date: data.date,
        amount: data.amount,
        description: data.description,
        account_id: data.account_id,
        category_id: data.category_id,
      })
      .eq('id', state.transaction.id)

    // Update account balances based on what changed
    if (oldAccountId === newAccountId) {
      // Same account: apply the delta
      if (oldAccountId) {
        const delta = newAmount - oldAmount
        if (delta !== 0) await adjustAccountBalance(supabase, oldAccountId, delta)
      }
    } else {
      // Account changed: revert old, apply to new
      if (oldAccountId) await adjustAccountBalance(supabase, oldAccountId, -oldAmount)
      if (newAccountId) await adjustAccountBalance(supabase, newAccountId, newAmount)
    }

    // Sync tag assignments: delete all old, insert new ones
    await (supabase.from('transaction_tag_assignments') as any)
      .delete()
      .eq('transaction_id', state.transaction.id)

    if (data.tag_ids.length > 0) {
      await (supabase.from('transaction_tag_assignments') as any).insert(
        data.tag_ids.map(tag_id => ({
          transaction_id: state.transaction!.id,
          tag_id,
        }))
      )
    }

    setState(s => ({ ...s, saving: false, isOpen: false, transaction: null }))
    onMutated()
  }

  async function remove() {
    if (!state.transaction) return
    setState(s => ({ ...s, deleting: true }))
    const supabase = createClient()

    const { account_id, amount } = state.transaction
    await (supabase.from('transactions') as any).delete().eq('id', state.transaction.id)

    // Revert the transaction amount from the account balance
    if (account_id) await adjustAccountBalance(supabase, account_id, -amount)

    setState(s => ({ ...s, deleting: false, isOpen: false, transaction: null }))
    onMutated()
  }

  return { state, open, close, save, remove, requestDelete, cancelDelete }
}
