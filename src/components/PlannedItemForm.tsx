'use client'
import { useState } from 'react'
import type { Database } from '@/lib/supabase/types'

type Category = Database['public']['Tables']['categories']['Row']

export interface PlannedFormData {
  name: string
  amount: number
  type: 'expense' | 'income'
  planned_date: string
  category_id: string | null
  notes: string | null
}

interface Props {
  categories: Category[]
  initialData?: PlannedFormData
  onSave: (data: PlannedFormData) => Promise<void>
  onCancel: () => void
}

export default function PlannedItemForm({ categories, initialData, onSave, onCancel }: Props) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [amount, setAmount] = useState(initialData ? initialData.amount.toFixed(2).replace('.', ',') : '')
  const [type, setType] = useState<'expense' | 'income'>(initialData?.type ?? 'expense')
  const [plannedDate, setPlannedDate] = useState(initialData?.planned_date ?? '')
  const [categoryId, setCategoryId] = useState(initialData?.category_id ?? '')
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [saving, setSaving] = useState(false)

  const filteredCategories = categories.filter(c => c.type === type)

  async function handleSave() {
    const n = parseFloat(amount.replace(',', '.'))
    if (!name.trim() || isNaN(n) || n <= 0 || !plannedDate) return
    setSaving(true)
    await onSave({
      name: name.trim(),
      amount: n,
      type,
      planned_date: plannedDate,
      category_id: categoryId || null,
      notes: notes.trim() || null,
    })
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
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Notas (opcional)"
        rows={2}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
      />
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
