'use client'
import { useState } from 'react'
import type { Database } from '@/lib/supabase/types'

type Category = Database['public']['Tables']['categories']['Row']
type Account = Database['public']['Tables']['accounts']['Row']

export interface PlannedFormData {
  name: string
  amount: number
  type: 'expense' | 'income'
  planned_date: string
  category_id: string | null
  notes: string | null
  account_id: string | null
}

export interface ConvertToRecurringData {
  name: string
  amount: number
  type: 'expense' | 'income'
  category_id: string | null
  account_id: string | null
  frequency: 'monthly' | 'weekly' | 'quinzenal' | 'yearly'
  next_date: string
  start_date: string | null
  end_date: string | null
}

interface Props {
  categories: Category[]
  accounts: Account[]
  initialData?: PlannedFormData
  isEditing?: boolean
  onSave: (data: PlannedFormData) => Promise<void>
  onConvertToRecurring?: (data: ConvertToRecurringData) => Promise<void>
  onCancel: () => void
}

export default function PlannedItemForm({ categories, accounts, initialData, isEditing, onSave, onConvertToRecurring, onCancel }: Props) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [amount, setAmount] = useState(initialData ? initialData.amount.toFixed(2).replace('.', ',') : '')
  const [type, setType] = useState<'expense' | 'income'>(initialData?.type ?? 'expense')
  const [plannedDate, setPlannedDate] = useState(initialData?.planned_date ?? '')
  const [categoryId, setCategoryId] = useState(initialData?.category_id ?? '')
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [accountId, setAccountId] = useState<string>(initialData?.account_id ?? '')
  const [saving, setSaving] = useState(false)
  const [convertMode, setConvertMode] = useState(false)
  const [frequency, setFrequency] = useState<'monthly' | 'weekly' | 'quinzenal' | 'yearly'>('monthly')
  const [endDate, setEndDate] = useState('')

  const filteredCategories = categories.filter(c => c.type === type)

  async function handleSave() {
    const n = parseFloat(amount.replace(',', '.'))
    if (!name.trim() || isNaN(n) || n <= 0 || !plannedDate) return
    setSaving(true)
    if (convertMode && onConvertToRecurring) {
      await onConvertToRecurring({
        name: name.trim(),
        amount: n,
        type,
        category_id: categoryId || null,
        account_id: accountId || null,
        frequency,
        next_date: plannedDate,
        start_date: plannedDate,
        end_date: endDate || null,
      })
    } else {
      await onSave({
        name: name.trim(),
        amount: n,
        type,
        planned_date: plannedDate,
        category_id: categoryId || null,
        notes: notes.trim() || null,
        account_id: accountId || null,
      })
    }
    setSaving(false)
  }

  return (
    <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-3">
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Nome (ex: Revisão do carro)"
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
      <div>
        <label className="text-xs text-gray-400 uppercase font-semibold">Data prevista</label>
        <input
          type="date"
          value={plannedDate}
          onChange={e => setPlannedDate(e.target.value)}
          className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
      </div>
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
      {!convertMode && (
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Notas (opcional)"
          rows={2}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
        />
      )}
      <select
        value={accountId}
        onChange={e => setAccountId(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
      >
        <option value="">Sem conta específica</option>
        {accounts.map(a => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>

      {isEditing && onConvertToRecurring && (
        <button
          type="button"
          onClick={() => setConvertMode(v => !v)}
          className={`w-full py-2 rounded-lg text-sm font-medium border transition-colors ${
            convertMode
              ? 'bg-purple-50 border-purple-300 text-purple-700'
              : 'border-gray-200 text-gray-500 hover:border-purple-200 hover:text-purple-600'
          }`}
        >
          {convertMode ? '↩ Manter como pontual' : '↻ Converter para recorrente'}
        </button>
      )}

      {convertMode && (
        <div className="flex flex-col gap-2 bg-purple-50 rounded-xl p-3">
          <label className="text-xs text-purple-600 uppercase font-semibold">Frequência</label>
          <select
            value={frequency}
            onChange={e => setFrequency(e.target.value as typeof frequency)}
            className="border border-purple-200 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="monthly">Mensal</option>
            <option value="weekly">Semanal</option>
            <option value="quinzenal">Quinzenal</option>
            <option value="yearly">Anual</option>
          </select>
          <label className="text-xs text-purple-600 uppercase font-semibold mt-1">Data de fim (opcional)</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="border border-purple-200 rounded-lg px-3 py-2 text-sm bg-white"
          />
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex-1 py-2 text-white rounded-lg text-sm font-semibold disabled:opacity-40 ${
            convertMode ? 'bg-purple-600' : 'bg-blue-600'
          }`}
        >
          {saving
            ? 'A guardar…'
            : convertMode
              ? 'Converter e guardar'
              : 'Guardar'}
        </button>
        <button onClick={onCancel} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">
          Cancelar
        </button>
      </div>
    </div>
  )
}
