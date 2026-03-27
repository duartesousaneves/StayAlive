'use client'
import { useState } from 'react'
import Link from 'next/link'
import ManualTransactionForm from '@/components/ManualTransactionForm'
import type { ManualTransactionData } from '@/components/ManualTransactionForm'
import { useAccounts } from '@/hooks/useAccounts'
import { useCategories } from '@/hooks/useCategories'
import { useTransactions } from '@/hooks/useTransactions'

export default function RegistarTransacaoPage() {
  const { accounts, defaultAccount, loading: accountsLoading, updateBalance } = useAccounts()
  const { categories, rules, loading: categoriesLoading } = useCategories()
  const { insertTransaction } = useTransactions()

  const [saving, setSaving] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const loading = accountsLoading || categoriesLoading

  async function handleSubmit(data: ManualTransactionData) {
    setSaving(true)
    try {
      await insertTransaction({
        date: data.date,
        description: data.description,
        amount: data.amount,
        account_id: data.account_id,
        category_id: data.category_id,
        source: 'manual',
      })
      const account = accounts.find(a => a.id === data.account_id)
      if (account) {
        await updateBalance(account.id, account.balance + data.amount)
      }
      setConfirmed(true)
      setTimeout(() => setConfirmed(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">A carregar…</div>
  }

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 px-6 text-center">
        <p className="text-gray-500 text-sm">Ainda não tens nenhuma conta configurada.</p>
        <Link
          href="/config/contas"
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold"
        >
          Configurar contas
        </Link>
      </div>
    )
  }

  return (
    <div className="px-4 pt-4 pb-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link href="/simulator" className="text-blue-600 text-sm">
          ‹ Registar
        </Link>
      </div>
      <h1 className="text-xl font-bold text-gray-800">Transação ocorrida</h1>

      {confirmed && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm font-medium text-center">
          ✓ Transação registada
        </div>
      )}

      <ManualTransactionForm
        accounts={accounts}
        defaultAccountId={defaultAccount?.id ?? null}
        categories={categories}
        rules={rules}
        saving={saving}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
