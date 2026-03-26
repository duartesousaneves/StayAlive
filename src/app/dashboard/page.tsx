'use client'
import { useState, useMemo, useEffect, useRef } from 'react'
import AccountCarousel from '@/components/AccountCarousel'
import AccountFormSheet from '@/components/AccountFormSheet'
import AlertBanner from '@/components/AlertBanner'
import ProjectionChart from '@/components/ProjectionChart'
import MonthSummary from '@/components/MonthSummary'
import RecentTransactions from '@/components/RecentTransactions'
import TransactionEditModal from '@/components/TransactionEditModal'
import CSVImportSheet from '@/components/CSVImportSheet'
import { useAccounts } from '@/hooks/useAccounts'
import { useRecurringItems } from '@/hooks/useRecurringItems'
import { usePlannedItems } from '@/hooks/usePlannedItems'
import { useProjection } from '@/hooks/useProjection'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useTransactionEdit } from '@/hooks/useTransactionEdit'
import { useTransactionTags } from '@/hooks/useTransactionTags'
import { filterItemsByAccount } from '@/lib/filterItemsByAccount'
import { categorize } from '@/lib/categorize'
import { createClient } from '@/lib/supabase/client'
import { extractKeyword } from '@/lib/keywords'
import type { Account } from '@/hooks/useAccounts'

export default function DashboardPage() {
  const { accounts, defaultAccount, loading: accountsLoading, updateBalance, createAccount, updateAccount } = useAccounts()
  const { items } = useRecurringItems()
  const { items: plannedItems } = usePlannedItems()
  const { transactions, refetch: refetchTxns } = useTransactions(50)
  const { categories, rules } = useCategories()
  const { tags, getOrCreateTag, getAssignedTagIds } = useTransactionTags()

  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const selectedAccountInitialized = useRef(false)

  // Initialize selectedAccount once defaultAccount is loaded
  useEffect(() => {
    if (!selectedAccountInitialized.current && defaultAccount) {
      setSelectedAccount(defaultAccount)
      selectedAccountInitialized.current = true
    }
  }, [defaultAccount])

  const filteredRecurring = filterItemsByAccount(items, selectedAccount)
  const filteredPlanned = filterItemsByAccount(plannedItems, selectedAccount)
  const projectionBalance = selectedAccount?.balance ?? defaultAccount?.balance ?? null
  const projection = useProjection(projectionBalance, filteredRecurring, filteredPlanned)

  const [showImport, setShowImport] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [assignedTagIds, setAssignedTagIds] = useState<string[]>([])

  const editModal = useTransactionEdit(refetchTxns)

  // Load assigned tags when a transaction is opened for editing
  useEffect(() => {
    if (editModal.state.transaction) {
      getAssignedTagIds(editModal.state.transaction.id).then(setAssignedTagIds)
    } else {
      setAssignedTagIds([])
    }
  }, [editModal.state.transaction?.id])

  // Auto-suggestions: run categorize over uncategorised transactions
  const suggestions = useMemo(() => {
    if (!rules.length) return {}
    const map: Record<string, string> = {}
    for (const t of transactions) {
      if (!t.category_id) {
        const suggested = categorize(t.description, rules)
        if (suggested) map[t.id] = suggested
      }
    }
    return map
  }, [transactions, rules])

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

    refetchTxns()
  }

  if (accountsLoading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">A carregar…</div>
  }

  return (
    <div className="pb-6">
      <AccountCarousel
        accounts={accounts}
        selectedAccountId={selectedAccount?.id ?? null}
        onSelectAccount={setSelectedAccount}
        onEditAccount={setEditingAccount}
        onAddAccount={() => setShowAddAccount(true)}
      />
      <AlertBanner criticalDay={projection?.criticalDay ?? null} />
      {projection && (
        <ProjectionChart days={projection.days} criticalDay={projection.criticalDay} />
      )}
      <MonthSummary transactions={transactions} onImportCSV={() => setShowImport(true)} />
      <RecentTransactions
        transactions={transactions}
        categories={categories}
        suggestions={suggestions}
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
          onImported={() => { setShowImport(false); refetchTxns() }}
        />
      )}

      {showAddAccount && (
        <AccountFormSheet
          onSave={createAccount}
          onClose={() => setShowAddAccount(false)}
        />
      )}

      {editingAccount && (
        <AccountFormSheet
          account={editingAccount}
          onSave={data => updateAccount(editingAccount.id, data)}
          onClose={() => setEditingAccount(null)}
        />
      )}
    </div>
  )
}
