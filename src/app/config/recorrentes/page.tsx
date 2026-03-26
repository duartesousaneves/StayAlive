'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRecurringItems, type RecurringItem } from '@/hooks/useRecurringItems'
import { useCategories } from '@/hooks/useCategories'
import { useAccounts } from '@/hooks/useAccounts'
import RecurringItemForm, { type RecurringFormData } from '@/components/RecurringItemForm'
import { formatCurrency } from '@/lib/format'

const FREQUENCY_LABELS: Record<string, string> = {
  monthly: 'Mensal',
  weekly: 'Semanal',
  quinzenal: 'Quinzenal',
  yearly: 'Anual',
}

export default function RecorrentesPage() {
  const { items, addItem, updateItem, removeItem } = useRecurringItems()
  const { categories } = useCategories()
  const { accounts } = useAccounts()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingItem, setEditingItem] = useState<RecurringItem | null>(null)
  const lastTap = useRef<Record<string, number>>({})

  async function handleAdd(data: RecurringFormData) {
    await addItem(data)
    setShowAddForm(false)
  }

  async function handleEdit(data: RecurringFormData) {
    if (!editingItem) return
    await updateItem(editingItem.id, {
      name: data.name,
      amount: data.amount,
      type: data.type,
      frequency: data.frequency,
      next_date: data.next_date,
      day_of_month: data.day_of_month,
      category_id: data.category_id,
      account_id: data.account_id,
    })
    setEditingItem(null)
  }

  function handleTouchEnd(item: RecurringItem) {
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
              <div
                key={item.id}
                className="flex justify-between items-center px-4 py-3 cursor-pointer select-none"
                onDoubleClick={() => setEditingItem(item)}
                onTouchEnd={() => handleTouchEnd(item)}
              >
                <div>
                  <p className="text-sm text-gray-800">{item.name}</p>
                  <p className="text-xs text-gray-400">
                    {FREQUENCY_LABELS[item.frequency] ?? item.frequency}
                    {item.day_of_month ? ` · dia ${item.day_of_month}` : ''}
                    {' · '}
                    {item.type === 'expense' ? 'Despesa' : 'Rendimento'}
                    {catName ? ` · ${catName}` : ''}
                    {getAccountName(item.account_id) ? ` · ${getAccountName(item.account_id)}` : ''}
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
              <p className="font-semibold text-gray-900">Editar item fixo</p>
              <button onClick={() => setEditingItem(null)} className="text-gray-400 text-xl">✕</button>
            </div>
            <div className="px-4 py-4 pb-8">
              <RecurringItemForm
                categories={categories}
                accounts={accounts}
                initialData={{
                  name: editingItem.name,
                  amount: editingItem.amount,
                  type: editingItem.type as 'expense' | 'income',
                  frequency: editingItem.frequency as RecurringFormData['frequency'],
                  next_date: editingItem.next_date ?? new Date().toISOString().split('T')[0],
                  day_of_month: editingItem.day_of_month,
                  category_id: editingItem.category_id,
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
