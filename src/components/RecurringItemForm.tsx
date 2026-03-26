'use client'
import { useState } from 'react'
import type { Database } from '@/lib/supabase/types'

type Category = Database['public']['Tables']['categories']['Row']

export interface RecurringFormData {
  name: string
  amount: number
  type: 'expense' | 'income'
  frequency: 'monthly' | 'weekly' | 'quinzenal' | 'yearly'
  next_date: string
  day_of_month: number | null
  category_id: string | null
}

interface Props {
  categories: Category[]
  initialData?: RecurringFormData
  onSave: (data: RecurringFormData) => Promise<void>
  onCancel: () => void
}

/** Given a desired day-of-month, returns the next YYYY-MM-DD date on that day. */
function computeNextMonthlyDate(dayOfMonth: number): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed
  const today = now.getDate()

  // Clamp day to valid range for current month
  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate()
  const effectiveDay = Math.min(dayOfMonth, daysInCurrentMonth)

  if (today <= effectiveDay) {
    // Still ahead this month
    const d = new Date(year, month, effectiveDay)
    return d.toISOString().split('T')[0]
  }

  // Already passed — use next month
  const nextMonth = month + 1
  const nextYear = nextMonth > 11 ? year + 1 : year
  const normalizedMonth = nextMonth % 12
  const daysInNextMonth = new Date(nextYear, normalizedMonth + 1, 0).getDate()
  const nextDay = Math.min(dayOfMonth, daysInNextMonth)
  const d = new Date(nextYear, normalizedMonth, nextDay)
  return d.toISOString().split('T')[0]
}

export default function RecurringItemForm({ categories, initialData, onSave, onCancel }: Props) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [amount, setAmount] = useState(initialData ? initialData.amount.toFixed(2).replace('.', ',') : '')
  const [type, setType] = useState<'expense' | 'income'>(initialData?.type ?? 'expense')
  const [frequency, setFrequency] = useState<RecurringFormData['frequency']>(initialData?.frequency ?? 'monthly')
  const [dayOfMonth, setDayOfMonth] = useState(initialData?.day_of_month?.toString() ?? '')
  const [categoryId, setCategoryId] = useState<string>(initialData?.category_id ?? '')
  const [saving, setSaving] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const filteredCategories = categories.filter(c => c.type === type)

  async function handleSave() {
    const n = parseFloat(amount.replace(',', '.'))
    if (!name.trim() || isNaN(n) || n <= 0) return

    const dom = frequency === 'monthly' && dayOfMonth ? parseInt(dayOfMonth, 10) : null
    const nextDate = dom ? computeNextMonthlyDate(dom) : today

    setSaving(true)
    await onSave({
      name: name.trim(),
      amount: n,
      type,
      frequency,
      next_date: nextDate,
      day_of_month: dom,
      category_id: categoryId || null,
    })
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
          onChange={e => { setType(e.target.value as 'expense' | 'income'); setCategoryId('') }}
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
      {frequency === 'monthly' && (
        <div>
          <label className="text-xs text-gray-400 uppercase font-semibold">Dia do mês</label>
          <input
            value={dayOfMonth}
            onChange={e => {
              const v = e.target.value.replace(/[^0-9]/g, '')
              if (v === '' || (parseInt(v, 10) >= 1 && parseInt(v, 10) <= 31)) setDayOfMonth(v)
            }}
            inputMode="numeric"
            placeholder="Ex: 1"
            className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      )}
      {filteredCategories.length > 0 && (
        <select
          value={categoryId}
          onChange={e => setCategoryId(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Sem categoria</option>
          {filteredCategories.map(c => (
            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
          ))}
        </select>
      )}
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
