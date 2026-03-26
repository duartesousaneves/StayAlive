'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePlannedItems } from '@/hooks/usePlannedItems'
import { useCategories } from '@/hooks/useCategories'
import PlannedItemForm, { type PlannedFormData } from '@/components/PlannedItemForm'
import { formatCurrency } from '@/lib/format'

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function FuturosPage() {
  const { items, addItem, removeItem } = usePlannedItems()
  const { categories } = useCategories()
  const [showAddForm, setShowAddForm] = useState(false)

  async function handleAdd(data: PlannedFormData) {
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
      <h1 className="text-xl font-bold text-gray-900 px-4">Despesas e Rendimentos Futuros</h1>

      <section className="px-4">
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
          {items.map(item => {
            const catName = getCategoryName(item.category_id)
            return (
              <div key={item.id} className="flex justify-between items-start px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">{item.name}</p>
                  <p className="text-xs text-gray-400">
                    {formatDate(item.planned_date)}
                    {' · '}
                    {item.type === 'expense' ? 'Despesa' : 'Rendimento'}
                    {catName ? ` · ${catName}` : ''}
                  </p>
                  {item.notes && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{item.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 ml-3">
                  <span className={`text-sm font-semibold ${item.type === 'expense' ? 'text-red-500' : 'text-green-600'}`}>
                    {formatCurrency(item.amount)}
                  </span>
                  <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-400 text-lg">×</button>
                </div>
              </div>
            )
          })}
          {items.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-6">Sem eventos futuros previstos</p>
          )}
        </div>
        {showAddForm ? (
          <div className="mt-3">
            <PlannedItemForm
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
