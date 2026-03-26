'use client'
import { useState } from 'react'
import { categorize } from '@/lib/categorize'
import type { Database } from '@/lib/supabase/types'

type Account = Database['public']['Tables']['accounts']['Row']
type Category = Database['public']['Tables']['categories']['Row']
type CategoryRule = Database['public']['Tables']['category_rules']['Row']

export interface ManualTransactionData {
  date: string
  description: string
  amount: number
  account_id: string
  category_id: string | null
}

interface Props {
  accounts: Account[]
  defaultAccountId: string | null
  categories: Category[]
  rules: CategoryRule[]
  saving: boolean
  onSubmit: (data: ManualTransactionData) => Promise<void>
}

export default function ManualTransactionForm({
  accounts,
  defaultAccountId,
  categories,
  rules,
  saving,
  onSubmit,
}: Props) {
  const today = new Date().toISOString().split('T')[0]

  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [accountId, setAccountId] = useState(defaultAccountId ?? accounts[0]?.id ?? '')
  const [categoryId, setCategoryId] = useState<string>('')
  const [userPickedCategory, setUserPickedCategory] = useState(false)
  const [date, setDate] = useState(today)

  const filteredCategories = categories.filter(c => c.type === type)

  function handleDescriptionBlur() {
    if (userPickedCategory || !description.trim()) return
    const suggested = categorize(description, rules)
    if (suggested) {
      const match = filteredCategories.find(c => c.id === suggested)
      if (match) setCategoryId(suggested)
    }
  }

  function handleTypeChange(newType: 'expense' | 'income') {
    setType(newType)
    if (!userPickedCategory) setCategoryId('')
  }

  function handleCategoryChange(value: string) {
    setCategoryId(value)
    setUserPickedCategory(value !== '')
  }

  const parsedAmount = parseFloat(amount.replace(',', '.'))
  const isValid = description.trim() !== '' && !isNaN(parsedAmount) && parsedAmount > 0 && accountId !== ''

  async function handleSubmit() {
    if (!isValid) return
    const signed = type === 'expense' ? -parsedAmount : parsedAmount
    await onSubmit({
      date,
      description: description.trim(),
      amount: signed,
      account_id: accountId,
      category_id: categoryId || null,
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Type toggle */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200">
        <button
          type="button"
          onClick={() => handleTypeChange('expense')}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
            type === 'expense'
              ? 'bg-red-500 text-white'
              : 'bg-white text-gray-500'
          }`}
        >
          Despesa
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange('income')}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
            type === 'income'
              ? 'bg-green-500 text-white'
              : 'bg-white text-gray-500'
          }`}
        >
          Rendimento
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

      {/* Description */}
      <input
        value={description}
        onChange={e => setDescription(e.target.value)}
        onBlur={handleDescriptionBlur}
        placeholder="Descrição (ex: Supermercado)"
        className="border border-gray-200 rounded-xl px-4 py-3 text-sm"
      />

      {/* Account selector */}
      <select
        value={accountId}
        onChange={e => setAccountId(e.target.value)}
        className="border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white"
      >
        {accounts.map(a => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>

      {/* Category selector */}
      {filteredCategories.length > 0 && (
        <select
          value={categoryId}
          onChange={e => handleCategoryChange(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white"
        >
          <option value="">Sem categoria</option>
          {filteredCategories.map(c => (
            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
          ))}
        </select>
      )}

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
        {saving ? 'A registar…' : 'Registar'}
      </button>
    </div>
  )
}
