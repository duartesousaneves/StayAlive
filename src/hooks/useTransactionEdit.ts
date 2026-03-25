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

  async function save(data: TransactionFormData) {
    if (!state.transaction) return
    setState(s => ({ ...s, saving: true }))
    const supabase = createClient()

    await (supabase.from('transactions') as any)
      .update({
        date: data.date,
        amount: data.amount,
        description: data.description,
        account_id: data.account_id,
        category_id: data.category_id,
      })
      .eq('id', state.transaction.id)

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
    await (supabase.from('transactions') as any).delete().eq('id', state.transaction.id)
    setState(s => ({ ...s, deleting: false, isOpen: false, transaction: null }))
    onMutated()
  }

  return { state, open, close, save, remove, requestDelete, cancelDelete }
}
