'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { usePlannedItems, type PlannedItem } from '@/hooks/usePlannedItems'
import { useCategories } from '@/hooks/useCategories'
import { useAccounts } from '@/hooks/useAccounts'
import PlannedItemForm, { type PlannedFormData } from '@/components/PlannedItemForm'
import { formatCurrency } from '@/lib/format'

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function SimulatorPontualPage() {
  const { items, addItem, updateItem, removeItem } = usePlannedItems()
  const { categories } = useCategories()
  const { accounts } = useAccounts()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingItem, setEditingItem] = useState<PlannedItem | null>(null)
  const lastTap = useRef<Record<string, number>>({})

  async function handleAdd(data: PlannedFormData) {
    await addItem(data)
    setShowAddForm(false)
  }

  async function handleEdit(data: PlannedFormData) {
    if (!editingItem) return
    await updateItem(editingItem.id, {
      name: data.name,
      amount: data.amount,
      type: data.type,
      planned_date: data.planned_date,
      category_id: data.category_id,
      notes: data.notes,
      account_id: data.account_id,
    })
    setEditingItem(null)
  }

  function handleTouchEnd(item: PlannedItem) {
    const now = Date.now()
    if (now - (lastTap.current[item.id] ?? 0) < 300) setEditingItem(item)
    lastTap.current[item.id] = now
  }

  function getCategoryName(categoryId: string | null): string | null {
    if (!categoryId) return null
    return categories.find(c => c.id === categoryId)?.name ?? null
  }

  function getAccountName(accountId: string | null): string | null {
    if (!accountId) return null
    return accounts.find(a => a.id === accountId)?.name ?? null
  }

  return (
    <div className="pt-4 pb-6 flex flex-col gap-6">
      <div className="px-4 flex items-center gap-3">
        <Link href="/simulator" className="text-blue-600 flex items-center gap-1 text-sm">
          ‹ Registar
        </Link>
      </div>
      <h1 className="text-xl font-bold text-gray-900 px-4">Despesas e Rendimentos Futuros</h1>

      <section className="px-4">
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
          {items.map(item => {
            const catName = getCategoryName(item.category_id)
            const accountName = getAccountName(item.account_id)
            return (
              <div
                key={item.id}
                className="flex justify-between items-start px-4 py-3 cursor-pointer select-none"
                onDoubleClick={() => setEditingItem(item)}
                onTouchEnd={() => handleTouchEnd(item)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">{item.name}</p>
                  <p className="text-xs text-gray-400">
                    {formatDate(item.planned_date)}
                    {' · '}
                    {item.type === 'expense' ? 'Despesa' : 'Rendimento'}
                    {catName ? ` · ${catName}` : ''}
                    {accountName ? ` · ${accountName}` : ''}
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
              accounts={accounts}
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

      {editingItem && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setEditingItem(null)} />
          <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl max-w-md mx-auto">
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
              <p className="font-semibold text-gray-900">Editar item futuro</p>
              <button onClick={() => setEditingItem(null)} className="text-gray-400 text-xl">✕</button>
            </div>
            <div className="px-4 py-4 pb-8">
              <PlannedItemForm
                categories={categories}
                accounts={accounts}
                initialData={{
                  name: editingItem.name,
                  amount: editingItem.amount,
                  type: editingItem.type as 'expense' | 'income',
                  planned_date: editingItem.planned_date,
                  category_id: editingItem.category_id,
                  notes: editingItem.notes,
                  account_id: editingItem.account_id,
                }}
                onSave={handleEdit}
                onCancel={() => setEditingItem(null)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
