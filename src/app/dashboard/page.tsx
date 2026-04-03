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
import { useCardPayments } from '@/hooks/useCardPayments'
import { useProjection } from '@/hooks/useProjection'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useTransactionEdit } from '@/hooks/useTransactionEdit'
import { useTransactionTags } from '@/hooks/useTransactionTags'
import { useMatchReview } from '@/hooks/useMatchReview'
import MatchReviewSheet from '@/components/MatchReviewSheet'
import HorizonSelector from '@/components/HorizonSelector'
import { filterItemsByAccount } from '@/lib/filterItemsByAccount'
import { HORIZON_LABELS, type ProjectionHorizon } from '@/lib/projection'
import { categorize } from '@/lib/categorize'
import { createClient } from '@/lib/supabase/client'
import { extractKeyword } from '@/lib/keywords'
import type { Account } from '@/hooks/useAccounts'

export default function DashboardPage() {
  const { accounts, defaultAccount, loading: accountsLoading, updateBalance, createAccount, updateAccount, refetch: refetchAccounts } = useAccounts()
  const { items } = useRecurringItems()
  const { items: plannedItems } = usePlannedItems()
  const { items: cardPayments } = useCardPayments()
  const { transactions, refetch: refetchTxns } = useTransactions(50)
  const { categories, rules } = useCategories()
  const { tags, getOrCreateTag, getAssignedTagIds } = useTransactionTags()

  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const selectedAccountInitialized = useRef(false)
  const [horizon, setHorizon] = useState<ProjectionHorizon>('30d')

  // Initialize selectedAccount once defaultAccount is loaded
  useEffect(() => {
    if (!selectedAccountInitialized.current && defaultAccount) {
      setSelectedAccount(defaultAccount)
      selectedAccountInitialized.current = true
    }
  }, [defaultAccount])

  // Load per-account horizon from localStorage when selected account changes
  useEffect(() => {
    if (!selectedAccount) return
    try {
      const stored = localStorage.getItem('projection_horizon_by_account')
      const map = stored ? JSON.parse(stored) as Record<string, ProjectionHorizon> : {}
      setHorizon(map[selectedAccount.id] ?? '30d')
    } catch {
      setHorizon('30d')
    }
  }, [selectedAccount?.id])

  function handleHorizonChange(h: ProjectionHorizon) {
    setHorizon(h)
    if (!selectedAccount) return
    try {
      const stored = localStorage.getItem('projection_horizon_by_account')
      const map = stored ? JSON.parse(stored) as Record<string, ProjectionHorizon> : {}
      map[selectedAccount.id] = h
      localStorage.setItem('projection_horizon_by_account', JSON.stringify(map))
    } catch {
      // ignore
    }
  }

  const accountTransactions = selectedAccount
    ? transactions.filter(t => t.account_id === selectedAccount.id)
    : transactions

  const filteredRecurring = filterItemsByAccount(items, selectedAccount)
  const filteredPlanned = filterItemsByAccount(plannedItems, selectedAccount)
  const projectionBalance = selectedAccount?.balance ?? defaultAccount?.balance ?? null

  const { pendingMatches, excludedOccurrences, confirm, dismiss } = useMatchReview(
    items, plannedItems, cardPayments, accounts, accountTransactions, selectedAccount?.id ?? null
  )

  const projection = useProjection(
    projectionBalance, filteredRecurring, filteredPlanned, cardPayments, accounts,
    selectedAccount?.id ?? null, excludedOccurrences, horizon
  )

  const [showImport, setShowImport] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [showMatchReview, setShowMatchReview] = useState(false)
  const [assignedTagIds, setAssignedTagIds] = useState<string[]>([])

  const editModal = useTransactionEdit(() => { refetchTxns(); refetchAccounts() })

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
    for (const t of accountTransactions) {
      if (!t.category_id) {
        const suggested = categorize(t.description, rules)
        if (suggested) map[t.id] = suggested
      }
    }
    return map
  }, [accountTransactions, rules])

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
      {pendingMatches.length > 0 && (
        <button
          onClick={() => setShowMatchReview(true)}
          className="mx-4 mb-2 w-full text-left px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm"
        >
          <span className="font-semibold text-amber-700">
            {pendingMatches.length === 1
              ? '1 transação possivelmente realizada'
              : `${pendingMatches.length} transações possivelmente realizadas`}
          </span>
          <span className="text-amber-600"> — rever →</span>
        </button>
      )}
      <HorizonSelector value={horizon} onChange={handleHorizonChange} />
      <AlertBanner criticalDay={projection?.criticalDay ?? null} />
      {projection && (
        <ProjectionChart days={projection.days} criticalDay={projection.criticalDay} horizonLabel={HORIZON_LABELS[horizon]} />
      )}
      <MonthSummary transactions={accountTransactions} accountName={selectedAccount?.name} onImportCSV={() => setShowImport(true)} />
      <RecentTransactions
        transactions={accountTransactions}
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
      {showMatchReview && pendingMatches.length > 0 && (
        <MatchReviewSheet
          matches={pendingMatches}
          accounts={accounts}
          onConfirm={key => { confirm(key); if (pendingMatches.length === 1) setShowMatchReview(false) }}
          onDismiss={key => { dismiss(key); if (pendingMatches.length === 1) setShowMatchReview(false) }}
          onClose={() => setShowMatchReview(false)}
        />
      )}
    </div>
  )
}
