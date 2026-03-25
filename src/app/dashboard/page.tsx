'use client'
import { useState } from 'react'
import AccountCarousel from '@/components/AccountCarousel'
import AccountFormSheet from '@/components/AccountFormSheet'
import AlertBanner from '@/components/AlertBanner'
import ProjectionChart from '@/components/ProjectionChart'
import MonthSummary from '@/components/MonthSummary'
import RecentTransactions from '@/components/RecentTransactions'
import CSVImportSheet from '@/components/CSVImportSheet'
import { useAccounts } from '@/hooks/useAccounts'
import { useRecurringItems } from '@/hooks/useRecurringItems'
import { useProjection } from '@/hooks/useProjection'
import { useTransactions } from '@/hooks/useTransactions'

export default function DashboardPage() {
  const { accounts, defaultAccount, loading: accountsLoading, updateBalance, createAccount, updateAccount } = useAccounts()
  const { items } = useRecurringItems()
  const { transactions, refetch: refetchTxns } = useTransactions(50)
  const projection = useProjection(defaultAccount?.balance ?? null, items)

  const [showImport, setShowImport] = useState(false)
  const [editingAccount, setEditingAccount] = useState<import('@/hooks/useAccounts').Account | null>(null)
  const [showAddAccount, setShowAddAccount] = useState(false)

  if (accountsLoading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">A carregar…</div>
  }

  return (
    <div className="pb-6">
      <AccountCarousel
        accounts={accounts}
        onEditAccount={setEditingAccount}
        onAddAccount={() => setShowAddAccount(true)}
      />
      <AlertBanner criticalDay={projection?.criticalDay ?? null} />
      {projection && (
        <ProjectionChart days={projection.days} criticalDay={projection.criticalDay} />
      )}
      <MonthSummary transactions={transactions} onImportCSV={() => setShowImport(true)} />
      <RecentTransactions transactions={transactions} />

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
