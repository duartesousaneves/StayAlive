'use client'
import { useState } from 'react'
import { formatCurrency, formatDate } from '@/lib/format'

interface Props {
  balance: number
  updatedAt: string
  onUpdate: (balance: number) => Promise<void>
}

export default function BalanceCard({ balance, updatedAt, onUpdate }: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  function startEdit() {
    setValue(balance.toFixed(2).replace('.', ','))
    setEditing(true)
  }

  async function save() {
    const n = parseFloat(value.replace(',', '.'))
    if (isNaN(n)) return
    setSaving(true)
    await onUpdate(n)
    setSaving(false)
    setEditing(false)
  }

  return (
    <div
      className="bg-blue-600 text-white rounded-2xl p-5 mx-4 mt-4 shadow-lg cursor-pointer"
      onClick={!editing ? startEdit : undefined}
    >
      <p className="text-blue-200 text-sm">Saldo atual</p>
      {editing ? (
        <div className="flex items-center gap-2 mt-1" onClick={e => e.stopPropagation()}>
          <span className="text-2xl">€</span>
          <input
            autoFocus
            value={value}
            onChange={e => setValue(e.target.value.replace(/[^0-9,.\-]/g, ''))}
            className="bg-blue-500 text-white text-3xl font-bold w-full rounded-lg px-2 py-1 outline-none"
            inputMode="decimal"
          />
          <button onClick={save} disabled={saving} className="bg-white text-blue-600 px-3 py-1 rounded-lg text-sm font-semibold">
            {saving ? '…' : 'OK'}
          </button>
          <button onClick={() => setEditing(false)} className="text-blue-200 text-sm">✕</button>
        </div>
      ) : (
        <p className="text-4xl font-bold mt-1">{formatCurrency(balance)}</p>
      )}
      <p className="text-blue-200 text-xs mt-2">Atualizado em {formatDate(updatedAt)}</p>
    </div>
  )
}
