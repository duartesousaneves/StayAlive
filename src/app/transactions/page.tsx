'use client'
import { useState, useMemo, useEffect } from 'react'
import TransactionList from '@/components/TransactionList'
import TransactionEditModal from '@/components/TransactionEditModal'
import CSVImportSheet from '@/components/CSVImportSheet'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useAccounts } from '@/hooks/useAccounts'
import { useTransactionEdit } from '@/hooks/useTransactionEdit'
import { useTransactionTags } from '@/hooks/useTransactionTags'
import { categorize } from '@/lib/categorize'
import { createClient } from '@/lib/supabase/client'
import { extractKeyword } from '@/lib/keywords'

export default function TransactionsPage() {
  const { transactions, loading, refetch } = useTransactions()
  const { categories, rules } = useCategories()
  const { accounts } = useAccounts()
  const { tags, getOrCreateTag, getAssignedTagIds } = useTransactionTags()
  const [showImport, setShowImport] = useState(false)
  const [assignedTagIds, setAssignedTagIds] = useState<string[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)

  const editModal = useTransactionEdit(refetch)

  useEffect(() => {
    if (editModal.state.transaction) {
      getAssignedTagIds(editModal.state.transaction.id).then(setAssignedTagIds)
    } else {
      setAssignedTagIds([])
    }
  }, [editModal.state.transaction?.id])

  const filteredTransactions = selectedAccountId
    ? transactions.filter(t => t.account_id === selectedAccountId)
    : transactions

  const suggestions = useMemo(() => {
    if (!rules.length) return {}
    const map: Record<string, string> = {}
    for (const t of filteredTransactions) {
      if (!t.category_id) {
        const suggested = categorize(t.description, rules)
        if (suggested) map[t.id] = suggested
      }
    }
    return map
  }, [filteredTransactions, rules])

  async function acceptSuggestion(transactionId: string, categoryId: string) {
    const supabase = createClient()

    await (supabase.from('transactions') as any)
      .update({ category_id: categoryId })
      .eq('id', transactionId)

    const transaction = transactions.find(t => t.id === transactionId)
    if (transaction) {
      const keyword = extractKeyword(transaction.description)
      if (keyword) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: existing } = await supabase
            .from('category_rules')
            .select('id')
            .eq('user_id', user.id)
            .eq('keyword', keyword)
            .eq('category_id', categoryId)
            .maybeSingle()

          if (!existing) {
            await (supabase.from('category_rules') as any).insert({
              user_id: user.id,
              keyword,
              category_id: categoryId,
              priority: 1,
            })
          }
        }
      }
    }

    refetch()
  }

  return (
    <div className="pt-4 pb-6">
      <div className="flex items-center justify-between px-4 mb-4">
        <h1 className="text-xl font-bold text-gray-900">Transações</h1>
        <button
          onClick={() => setShowImport(true)}
          className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg"
        >
          Importar CSV
        </button>
      </div>

      {accounts.length > 0 && (
        <div className="flex gap-2 px-4 mb-4 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setSelectedAccountId(null)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedAccountId === null
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            Todos
          </button>
          {accounts.map(account => (
            <button
              key={account.id}
              onClick={() => setSelectedAccountId(account.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedAccountId === account.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {account.name}
            </button>
          ))}
        </div>
      )}

      <TransactionList
        transactions={filteredTransactions}
        categories={categories}
        suggestions={suggestions}
        loading={loading}
        onEditTransaction={editModal.open}
        onAcceptSuggestion={acceptSuggestion}
      />

      {editModal.state.isOpen && editModal.state.transaction && (
        <TransactionEditModal
          transaction={editModal.state.transaction}
          categories={categories}
          accounts={accounts}
          tags={tags}
          assignedTagIds={assignedTagIds}
          saving={editModal.state.saving}
          deleting={editModal.state.deleting}
          confirmDelete={editModal.state.confirmDelete}
          onSave={editModal.save}
          onClose={editModal.close}
          onRequestDelete={editModal.requestDelete}
          onConfirmDelete={editModal.remove}
          onCancelDelete={editModal.cancelDelete}
          onCreateTag={getOrCreateTag}
        />
      )}

      {showImport && (
        <CSVImportSheet
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); refetch() }}
        />
      )}
    </div>
  )
}
