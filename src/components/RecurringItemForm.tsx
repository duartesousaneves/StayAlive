'use client'
import { useState } from 'react'

export interface RecurringFormData {
  name: string
  amount: number
  type: 'expense' | 'income'
  frequency: 'monthly' | 'weekly' | 'quinzenal' | 'yearly'
  next_date: string
}

interface Props {
  onSave: (data: RecurringFormData) => Promise<void>
  onCancel: () => void
}

export default function RecurringItemForm({ onSave, onCancel }: Props) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [frequency, setFrequency] = useState<RecurringFormData['frequency']>('monthly')
  const [saving, setSaving] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  async function handleSave() {
    const n = parseFloat(amount.replace(',', '.'))
    if (!name.trim() || isNaN(n) || n <= 0) return
    setSaving(true)
    await onSave({ name: name.trim(), amount: n, type, frequency, next_date: today })
    setSaving(false)
  }

  return (
    <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-3">
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Nome (ex: Renda)"
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
          <input
            value={amount}
            onChange={e => setAmount(e.target.value.replace(/[^0-9,.]/g, ''))}
            inputMode="decimal"
            placeholder="0,00"
            className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
        <select
          value={type}
          onChange={e => setType(e.target.value as 'expense' | 'income')}
          className="border border-gray-200 rounded-lg px-2 text-sm"
        >
          <option value="expense">Despesa</option>
          <option value="income">Rendimento</option>
        </select>
      </div>
      <select
        value={frequency}
        onChange={e => setFrequency(e.target.value as RecurringFormData['frequency'])}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
      >
        <option value="monthly">Mensal</option>
        <option value="weekly">Semanal</option>
        <option value="quinzenal">Quinzenal</option>
        <option value="yearly">Anual</option>
      </select>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-40"
        >
          {saving ? 'A guardar…' : 'Guardar'}
        </button>
        <button onClick={onCancel} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">
          Cancelar
        </button>
      </div>
    </div>
  )
}
