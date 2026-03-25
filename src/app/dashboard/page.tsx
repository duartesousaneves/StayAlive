'use client'
import { useState } from 'react'
import BalanceCard from '@/components/BalanceCard'
import AlertBanner from '@/components/AlertBanner'
import ProjectionChart from '@/components/ProjectionChart'
import MonthSummary from '@/components/MonthSummary'
import RecentTransactions from '@/components/RecentTransactions'
import CSVImportSheet from '@/components/CSVImportSheet'
import { useProfile } from '@/hooks/useProfile'
import { useRecurringItems } from '@/hooks/useRecurringItems'
import { useProjection } from '@/hooks/useProjection'
import { useTransactions } from '@/hooks/useTransactions'

export default function DashboardPage() {
  const { profile, loading: profileLoading, updateBalance, refetch } = useProfile()
  const { items } = useRecurringItems()
  const { transactions, refetch: refetchTxns } = useTransactions(50)
  const projection = useProjection(profile?.balance ?? null, items)
  const [showImport, setShowImport] = useState(false)

  if (profileLoading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">A carregar…</div>
  }

  if (!profile) return null

  return (
    <div className="pb-6">
      <BalanceCard
        balance={profile.balance}
        updatedAt={profile.balance_updated_at}
        onUpdate={updateBalance}
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
    </div>
  )
}
