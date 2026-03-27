'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useAccounts } from '@/hooks/useAccounts'
import { useTransactions } from '@/hooks/useTransactions'

type Mode = 'transfer' | 'atm'

export default function TransferenciaPage() {
  const { accounts, loading, updateBalance } = useAccounts()
  const { insertTransaction } = useTransactions()

  const today = new Date().toISOString().split('T')[0]

  const [mode, setMode] = useState<Mode>('transfer')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(today)
  const [saving, setSaving] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const checkingAccounts = accounts.filter(a => a.type === 'checking')
  const cashAccounts = accounts.filter(a => a.type === 'cash')

  const defaultFromId =
    mode === 'atm'
      ? (checkingAccounts[0]?.id ?? accounts[0]?.id ?? '')
      : (accounts[0]?.id ?? '')

  const defaultToId =
    mode === 'atm'
      ? (cashAccounts[0]?.id ?? accounts.find(a => a.id !== defaultFromId)?.id ?? '')
      : (accounts.find(a => a.id !== defaultFromId)?.id ?? '')

  const [fromId, setFromId] = useState<string>('')
  const [toId, setToId] = useState<string>('')

  const resolvedFromId = fromId || defaultFromId
  const resolvedToId = toId || defaultToId

  function handleModeChange(next: Mode) {
    setMode(next)
    setFromId('')
    setToId('')
    setDescription('')
  }

  const fromAccount = accounts.find(a => a.id === resolvedFromId)
  const toAccount = accounts.find(a => a.id === resolvedToId)

  const parsedAmount = parseFloat(amount.replace(',', '.'))
  const isValid =
    resolvedFromId !== '' &&
    resolvedToId !== '' &&
    resolvedFromId !== resolvedToId &&
    !isNaN(parsedAmount) &&
    parsedAmount > 0

  const effectiveDescription =
    description.trim() ||
    (mode === 'atm'
      ? 'Levantamento ATM'
      : fromAccount && toAccount
        ? `Transferência de ${fromAccount.name} para ${toAccount.name}`
        : 'Transferência')

  async function handleSubmit() {
    if (!isValid || !fromAccount || !toAccount) return
    setSaving(true)
    try {
      await insertTransaction({
        date,
        description: effectiveDescription,
        amount: -parsedAmount,
        account_id: resolvedFromId,
        category_id: null,
        source: 'manual',
      })
      await insertTransaction({
        date,
        description: effectiveDescription,
        amount: parsedAmount,
        account_id: resolvedToId,
        category_id: null,
        source: 'manual',
      })
      await updateBalance(resolvedFromId, fromAccount.balance - parsedAmount)
      await updateBalance(resolvedToId, toAccount.balance + parsedAmount)
      setAmount('')
      setDescription('')
      setDate(today)
      setFromId('')
      setToId('')
      setConfirmed(true)
      setTimeout(() => setConfirmed(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">A carregar…</div>
  }

  if (accounts.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 px-6 text-center">
        <p className="text-gray-500 text-sm">Precisas de pelo menos duas contas para fazer uma transferência.</p>
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
      <h1 className="text-xl font-bold text-gray-800">Transferência / ATM</h1>

      {confirmed && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm font-medium text-center">
          ✓ Transferência registada
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200">
        <button
          type="button"
          onClick={() => handleModeChange('transfer')}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
            mode === 'transfer' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500'
          }`}
        >
          Transferência
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('atm')}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
            mode === 'atm' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500'
          }`}
        >
          Levantamento ATM
        </button>
      </div>

      {/* Amount */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">€</span>
        <input
          value={amount}
          onChange={e => setAmount(e.target.value.replace(/[^0-9,.]/g, ''))}
          inputMode="decimal"
          placeholder="0,00"
          className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-2xl font-semibold text-center"
        />
      </div>

      {/* From account */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400 px-1">De</label>
        <select
          value={resolvedFromId}
          onChange={e => setFromId(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white"
        >
          {accounts.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      {/* To account */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400 px-1">Para</label>
        <select
          value={resolvedToId}
          onChange={e => setToId(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white"
        >
          {accounts.filter(a => a.id !== resolvedFromId).map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      {/* Description */}
      <input
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder={effectiveDescription}
        className="border border-gray-200 rounded-xl px-4 py-3 text-sm"
      />

      {/* Date */}
      <input
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
        className="border border-gray-200 rounded-xl px-4 py-3 text-sm"
      />

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!isValid || saving}
        className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold disabled:opacity-40 transition-opacity"
      >
        {saving ? 'A registar…' : mode === 'atm' ? 'Registar levantamento' : 'Registar transferência'}
      </button>
    </div>
  )
}
