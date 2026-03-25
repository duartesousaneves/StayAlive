'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { applyMapping } from '@/lib/csv'
import { categorize } from '@/lib/categorize'
import { DEFAULT_CATEGORIES } from './Step4Categories'
import type { WizardState } from '../page'

type RecurringDraft = {
  name: string
  amount: string
  type: 'expense' | 'income'
  frequency: 'monthly' | 'weekly' | 'quinzenal' | 'yearly'
}

interface Props {
  wizardState: WizardState
}

export default function Step5Recurring({ wizardState }: Props) {
  const router = useRouter()
  const [items, setItems] = useState<RecurringDraft[]>([
    { name: '', amount: '', type: 'expense', frequency: 'monthly' },
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function addItem() {
    setItems(i => [...i, { name: '', amount: '', type: 'expense', frequency: 'monthly' }])
  }

  function updateItem(i: number, patch: Partial<RecurringDraft>) {
    setItems(items => items.map((item, idx) => idx === i ? { ...item, ...patch } : item))
  }

  function removeItem(i: number) {
    setItems(items => items.filter((_, idx) => idx !== i))
  }

  async function handleConcluir() {
    setSaving(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const balance = parseFloat(wizardState.balance.replace(',', '.'))

      // 1. Create default checking account + mark onboarding complete
      await (supabase as any)
        .from('accounts')
        .insert({
          user_id: user.id,
          name: 'Conta à ordem',
          type: 'checking',
          balance,
          balance_updated_at: new Date().toISOString(),
          is_default: true,
        })

      await (supabase as any)
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id)

      // 2. Create default categories + rules
      for (const cat of DEFAULT_CATEGORIES) {
        const { data: createdCat } = await (supabase as any)
          .from('categories')
          .insert([{ user_id: user.id, name: cat.name, type: cat.type, icon: cat.icon, color: cat.color }])
          .select('id')
          .single()
        if (createdCat) {
          await (supabase as any)
            .from('category_rules')
            .insert(
              cat.keywords.map((kw, i) => ({
                user_id: user.id,
                keyword: kw,
                category_id: createdCat.id,
                priority: cat.keywords.length - i,
              }))
            )
        }
      }

      // 3. Import CSV transactions (if any)
      if (wizardState.mapping && wizardState.csvRows.length > 0) {
        const { data: rules } = await (supabase as any)
          .from('category_rules')
          .select('*')
          .eq('user_id', user.id)
          .order('priority', { ascending: false })

        const parsed = applyMapping(wizardState.csvRows, wizardState.mapping)
        // Deduplicate: onboarding can be retried if abandoned
        const { data: existing } = await (supabase as any)
          .from('transactions')
          .select('date, description, amount')
          .eq('user_id', user.id)
        const existingSet = new Set(
          (existing ?? []).map((t: any) => `${t.date}|${t.description}|${t.amount}`)
        )
        const txns = parsed
          .filter(row => !existingSet.has(`${row.date}|${row.description}|${row.amount}`))
          .map(row => ({
            user_id: user.id,
            date: row.date,
            description: row.description,
            amount: row.amount,
            category_id: categorize(row.description, rules ?? []) ?? undefined,
            source: 'csv' as const,
          }))
        if (txns.length > 0) {
          await (supabase as any)
            .from('transactions')
            .insert(txns)
        }

        // Save CSV mapping to user_settings
        await (supabase as any)
          .from('user_settings')
          .upsert({
            user_id: user.id,
            csv_column_date: wizardState.mapping.dateCol,
            csv_column_description: wizardState.mapping.descriptionCol,
            csv_column_amount: wizardState.mapping.amountCol,
            csv_negative_is_expense: wizardState.mapping.negativeIsExpense,
            updated_at: new Date().toISOString(),
          })
      }

      // 4. Create recurring items
      const today = new Date().toISOString().split('T')[0]
      const validItems = items.filter(i => i.name.trim() && parseFloat(i.amount.replace(',', '.')) > 0)
      if (validItems.length > 0) {
        await (supabase as any)
          .from('recurring_items')
          .insert(
            validItems.map(item => ({
              user_id: user.id,
              name: item.name.trim(),
              amount: parseFloat(item.amount.replace(',', '.')),
              type: item.type,
              frequency: item.frequency,
              next_date: today,
              active: true,
            }))
          )
      }

      // 5. Clear localStorage
      localStorage.removeItem('stayalive_onboarding')

      router.replace('/dashboard')
    } catch (e) {
      setError('Erro ao guardar. Tenta de novo.')
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-6 py-8 flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Despesas fixas</h2>
        <p className="mt-2 text-gray-500">Renda, salário, subscrições mensais…</p>
      </div>

      <div className="flex flex-col gap-4">
        {items.map((item, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                value={item.name}
                onChange={e => updateItem(i, { name: e.target.value })}
                placeholder="Nome (ex: Renda)"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <button onClick={() => removeItem(i)} className="text-gray-300 hover:text-red-400 text-xl px-1">×</button>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                <input
                  value={item.amount}
                  onChange={e => updateItem(i, { amount: e.target.value.replace(/[^0-9,.]/g, '') })}
                  placeholder="0,00"
                  inputMode="decimal"
                  className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <select
                value={item.type}
                onChange={e => updateItem(i, { type: e.target.value as 'expense' | 'income' })}
                className="border border-gray-200 rounded-lg px-2 py-2 text-sm"
              >
                <option value="expense">Despesa</option>
                <option value="income">Rendimento</option>
              </select>
            </div>
            <select
              value={item.frequency}
              onChange={e => updateItem(i, { frequency: e.target.value as RecurringDraft['frequency'] })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="monthly">Mensal</option>
              <option value="weekly">Semanal</option>
              <option value="quinzenal">Quinzenal</option>
              <option value="yearly">Anual</option>
            </select>
          </div>
        ))}

        <button
          onClick={addItem}
          className="text-blue-600 text-sm font-medium py-2 border-2 border-dashed border-blue-200 rounded-xl"
        >
          + Adicionar
        </button>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        onClick={handleConcluir}
        disabled={saving}
        className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl disabled:opacity-40 active:scale-95 transition"
      >
        {saving ? 'A guardar…' : 'Concluir configuração'}
      </button>
    </div>
  )
}
