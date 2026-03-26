'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRecurringItems } from '@/hooks/useRecurringItems'
import { useCategories } from '@/hooks/useCategories'
import RecurringItemForm, { type RecurringFormData } from '@/components/RecurringItemForm'
import { formatCurrency } from '@/lib/format'

const FREQUENCY_LABELS: Record<string, string> = {
  monthly: 'Mensal',
  weekly: 'Semanal',
  quinzenal: 'Quinzenal',
  yearly: 'Anual',
}

export default function RecorrentesPage() {
  const { items, addItem, removeItem } = useRecurringItems()
  const { categories } = useCategories()
  const [showAddForm, setShowAddForm] = useState(false)

  async function handleAdd(data: RecurringFormData) {
    await addItem(data)
    setShowAddForm(false)
  }

  function getCategoryName(categoryId: string | null): string | null {
    if (!categoryId) return null
    return categories.find(c => c.id === categoryId)?.name ?? null
  }

  return (
    <div className="pt-4 pb-6 flex flex-col gap-6">
      <div className="px-4 flex items-center gap-3">
        <Link href="/config" className="text-blue-600 flex items-center gap-1 text-sm">
          ‹ Configurações
        </Link>
      </div>
      <h1 className="text-xl font-bold text-gray-900 px-4">Despesas e Rendimentos Fixos</h1>

      <section className="px-4">
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
          {items.map(item => {
            const catName = getCategoryName(item.category_id)
            return (
              <div key={item.id} className="flex justify-between items-center px-4 py-3">
                <div>
                  <p className="text-sm text-gray-800">{item.name}</p>
                  <p className="text-xs text-gray-400">
                    {FREQUENCY_LABELS[item.frequency] ?? item.frequency}
                    {item.day_of_month ? ` · dia ${item.day_of_month}` : ''}
                    {' · '}
                    {item.type === 'expense' ? 'Despesa' : 'Rendimento'}
                    {catName ? ` · ${catName}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-semibold ${item.type === 'expense' ? 'text-red-500' : 'text-green-600'}`}>
                    {formatCurrency(item.amount)}
                  </span>
                  <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-400 text-lg">×</button>
                </div>
              </div>
            )
          })}
          {items.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-6">Sem itens fixos</p>
          )}
        </div>
        {showAddForm ? (
          <div className="mt-3">
            <RecurringItemForm
              categories={categories}
              onSave={handleAdd}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full mt-3 py-3 border-2 border-dashed border-blue-200 text-blue-600 text-sm font-medium rounded-xl"
          >
            + Adicionar
          </button>
        )}
      </section>
    </div>
  )
}
