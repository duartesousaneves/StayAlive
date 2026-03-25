'use client'
import { useState } from 'react'
import TagInput from './TagInput'
import type { TransactionFormData } from '@/hooks/useTransactionEdit'
import type { Database } from '@/lib/supabase/types'
import type { Account } from '@/hooks/useAccounts'
import type { TransactionTag } from '@/hooks/useTransactionTags'

type Transaction = Database['public']['Tables']['transactions']['Row']
type Category = Database['public']['Tables']['categories']['Row']

interface Props {
  transaction: Transaction
  categories: Category[]
  accounts: Account[]
  tags: TransactionTag[]
  assignedTagIds: string[]
  saving: boolean
  deleting: boolean
  confirmDelete: boolean
  onSave: (data: TransactionFormData) => Promise<void>
  onClose: () => void
  onRequestDelete: () => void
  onConfirmDelete: () => Promise<void>
  onCancelDelete: () => void
  onCreateTag: (name: string) => Promise<TransactionTag | null>
}

export default function TransactionEditModal({
  transaction,
  categories,
  accounts,
  tags,
  assignedTagIds,
  saving,
  deleting,
  confirmDelete,
  onSave,
  onClose,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
  onCreateTag,
}: Props) {
  const [date, setDate] = useState(transaction.date)
  const [amountStr, setAmountStr] = useState(
    Math.abs(transaction.amount).toFixed(2).replace('.', ',')
  )
  const [isExpense, setIsExpense] = useState(transaction.amount < 0)
  const [description, setDescription] = useState(transaction.description)
  const [accountId, setAccountId] = useState<string | null>(transaction.account_id)
  const [categoryId, setCategoryId] = useState<string | null>(transaction.category_id)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(assignedTagIds)

  const canSave = date && description.trim() && amountStr && !isNaN(parseFloat(amountStr.replace(',', '.')))

  async function handleSave() {
    if (!canSave) return
    const amount = parseFloat(amountStr.replace(',', '.'))
    await onSave({
      date,
      amount: isExpense ? -Math.abs(amount) : Math.abs(amount),
      description: description.trim(),
      account_id: accountId,
      category_id: categoryId,
      tag_ids: selectedTagIds,
    })
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl max-w-sm mx-auto overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
          <p className="font-semibold text-gray-900">Editar transação</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {/* Fields */}
        <div className="px-4 py-4 flex flex-col gap-4">
          {/* Date + Amount */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-400 uppercase font-semibold">Data</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-400 uppercase font-semibold">Montante</label>
              <div className="flex items-center gap-1 mt-1">
                <button
                  type="button"
                  onClick={() => setIsExpense(v => !v)}
                  className={`text-sm font-bold px-2 py-2 rounded-lg ${isExpense ? 'text-red-500 bg-red-50' : 'text-green-600 bg-green-50'}`}
                >
                  {isExpense ? '−' : '+'}
                </button>
                <div className="relative flex-1">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                  <input
                    value={amountStr}
                    onChange={e => setAmountStr(e.target.value.replace(/[^0-9,.]/g, ''))}
                    inputMode="decimal"
                    className="w-full pl-6 pr-2 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-gray-400 uppercase font-semibold">Descrição</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* Account */}
          <div>
            <label className="text-xs text-gray-400 uppercase font-semibold">Conta</label>
            <select
              value={accountId ?? ''}
              onChange={e => setAccountId(e.target.value || null)}
              className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Sem conta</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="text-xs text-gray-400 uppercase font-semibold">Categoria</label>
            <select
              value={categoryId ?? ''}
              onChange={e => setCategoryId(e.target.value || null)}
              className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Sem categoria</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs text-gray-400 uppercase font-semibold">Tags</label>
            <div className="mt-1">
              <TagInput
                tags={tags}
                selectedIds={selectedTagIds}
                onChange={setSelectedTagIds}
                onCreateTag={onCreateTag}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pb-5 pt-2 border-t border-gray-100">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <p className="text-sm text-red-600 flex-1">Confirmar eliminação?</p>
              <button
                onClick={onConfirmDelete}
                disabled={deleting}
                className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40"
              >
                {deleting ? '…' : 'Eliminar'}
              </button>
              <button
                onClick={onCancelDelete}
                className="text-gray-500 text-sm px-2"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={onRequestDelete}
                className="flex items-center gap-1 text-red-500 text-sm font-medium px-3 py-2 rounded-lg hover:bg-red-50"
              >
                🗑 Eliminar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !canSave}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-40"
              >
                {saving ? '…' : '✓ Guardar'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
