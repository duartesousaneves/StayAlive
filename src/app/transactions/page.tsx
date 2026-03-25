'use client'
import { useState } from 'react'
import TransactionList from '@/components/TransactionList'
import CSVImportSheet from '@/components/CSVImportSheet'
import { useTransactions } from '@/hooks/useTransactions'

export default function TransactionsPage() {
  const { transactions, loading, refetch } = useTransactions()
  const [showImport, setShowImport] = useState(false)

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
      <TransactionList transactions={transactions} loading={loading} />
      {showImport && (
        <CSVImportSheet
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); refetch() }}
        />
      )}
    </div>
  )
}
