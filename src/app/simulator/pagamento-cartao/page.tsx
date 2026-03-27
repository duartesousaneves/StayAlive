'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { useCardPayments, type CardPayment } from '@/hooks/useCardPayments'
import { useAccounts } from '@/hooks/useAccounts'
import CardPaymentForm, { type CardPaymentFormData } from '@/components/CardPaymentForm'
import { formatCurrency } from '@/lib/format'

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })
}

function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function PagamentoCartaoPage() {
  const { items, addItem, updateItem, removeItem, executePayment } = useCardPayments()
  const { accounts, refetch: refetchAccounts } = useAccounts()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingItem, setEditingItem] = useState<CardPayment | null>(null)
  const [confirmingItem, setConfirmingItem] = useState<CardPayment | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const lastTap = useRef<Record<string, number>>({})

  const today = todayISO()

  async function handleAdd(data: CardPaymentFormData) {
    await addItem(data)
    setShowAddForm(false)
  }

  async function handleEdit(data: CardPaymentFormData) {
    if (!editingItem) return
    await updateItem(editingItem.id, data)
    setEditingItem(null)
  }

  async function handleConfirmPayment(item: CardPayment) {
    const creditCard = accounts.find(a => a.id === item.credit_card_id)
    const sourceAccount = accounts.find(a => a.id === item.source_account_id)
    if (!creditCard || !sourceAccount) return
    await executePayment(item, creditCard.balance, sourceAccount.balance)
    await refetchAccounts()
    setConfirmingItem(null)
    const amount = item.amount !== null
      ? formatCurrency(item.amount)
      : `${item.percentage}%`
    setSuccessMessage(`Pagamento de ${amount} confirmado`)
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  function handleTouchEnd(item: CardPayment) {
    const now = Date.now()
    if (now - (lastTap.current[item.id] ?? 0) < 300) setEditingItem(item)
    lastTap.current[item.id] = now
  }

  function getAccountName(id: string | null): string | null {
    if (!id) return null
    return accounts.find(a => a.id === id)?.name ?? null
  }

  function getEffectiveAmount(item: CardPayment): number | null {
    if (item.amount !== null) return item.amount
    const card = accounts.find(a => a.id === item.credit_card_id)
    if (!card) return null
    const debt = Math.abs(Math.min(card.balance, 0))
    return (item.percentage! / 100) * debt
  }

  const overdueItems = items.filter(i => i.planned_date <= today)
  const upcomingItems = items.filter(i => i.planned_date > today)

  return (
    <div className="pt-4 pb-6 flex flex-col gap-6">
      {successMessage && (
        <div className="fixed top-4 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
          <div className="bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-full shadow-lg">
            {successMessage}
          </div>
        </div>
      )}

      <div className="px-4 flex items-center gap-3">
        <Link href="/simulator" className="text-blue-600 flex items-center gap-1 text-sm">
          ‹ Registar
        </Link>
      </div>
      <h1 className="text-xl font-bold text-gray-900 px-4">Pagamentos de Cartão</h1>

      {/* Overdue / due today */}
      {overdueItems.length > 0 && (
        <section className="px-4">
          <p className="text-xs text-amber-600 uppercase font-semibold mb-2">Para confirmar</p>
          <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
            {overdueItems.map(item => {
              const cardName = getAccountName(item.credit_card_id)
              const sourceName = getAccountName(item.source_account_id)
              const effectiveAmount = getEffectiveAmount(item)
              return (
                <div
                  key={item.id}
                  className="flex justify-between items-start px-4 py-3 cursor-pointer select-none"
                  onDoubleClick={() => setEditingItem(item)}
                  onTouchEnd={() => handleTouchEnd(item)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 font-medium">
                      {cardName ?? '—'} <span className="text-gray-400 font-normal">via</span> {sourceName ?? '—'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDate(item.planned_date)}
                      {item.percentage !== null ? ` · ${item.percentage}%` : ''}
                    </p>
                    {item.notes && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{item.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <div className="text-right">
                      {effectiveAmount !== null && (
                        <p className="text-sm font-semibold text-red-500">
                          {formatCurrency(effectiveAmount)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setConfirmingItem(item)}
                      className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-lg"
                    >
                      Confirmar
                    </button>
                    <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-400 text-lg">×</button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Upcoming */}
      <section className="px-4">
        {upcomingItems.length > 0 && (
          <>
            <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Agendados</p>
            <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
              {upcomingItems.map(item => {
                const cardName = getAccountName(item.credit_card_id)
                const sourceName = getAccountName(item.source_account_id)
                const effectiveAmount = getEffectiveAmount(item)
                return (
                  <div
                    key={item.id}
                    className="flex justify-between items-start px-4 py-3 cursor-pointer select-none"
                    onDoubleClick={() => setEditingItem(item)}
                    onTouchEnd={() => handleTouchEnd(item)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800">
                        {cardName ?? '—'} <span className="text-gray-400">via</span> {sourceName ?? '—'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(item.planned_date)}
                        {item.percentage !== null ? ` · ${item.percentage}%` : ''}
                      </p>
                      {item.notes && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{item.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <div className="text-right">
                        {effectiveAmount !== null && (
                          <p className="text-sm font-semibold text-red-500">
                            {formatCurrency(effectiveAmount)}
                          </p>
                        )}
                        {item.percentage !== null && effectiveAmount === null && (
                          <p className="text-sm font-semibold text-gray-400">{item.percentage}%</p>
                        )}
                      </div>
                      <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-400 text-lg">×</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
        {items.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm">
            <p className="text-gray-400 text-sm text-center py-6">Sem pagamentos agendados</p>
          </div>
        )}

        {showAddForm ? (
          <div className="mt-3">
            <CardPaymentForm
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
            + Agendar pagamento
          </button>
        )}
      </section>

      {/* Edit modal */}
      {editingItem && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setEditingItem(null)} />
          <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl max-w-md mx-auto">
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
              <p className="font-semibold text-gray-900">Editar pagamento</p>
              <button onClick={() => setEditingItem(null)} className="text-gray-400 text-xl">✕</button>
            </div>
            <div className="px-4 py-4 pb-8">
              <CardPaymentForm
                accounts={accounts}
                isEditing
                initialData={{
                  credit_card_id: editingItem.credit_card_id,
                  source_account_id: editingItem.source_account_id,
                  amount: editingItem.amount,
                  percentage: editingItem.percentage,
                  planned_date: editingItem.planned_date,
                  notes: editingItem.notes,
                }}
                onSave={handleEdit}
                onCancel={() => setEditingItem(null)}
              />
            </div>
          </div>
        </>
      )}

      {/* Confirm payment modal */}
      {confirmingItem && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setConfirmingItem(null)} />
          <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl max-w-md mx-auto px-4 pt-4 pb-8">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <p className="font-semibold text-gray-900">Confirmar pagamento</p>
              <button onClick={() => setConfirmingItem(null)} className="text-gray-400 text-xl">✕</button>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              {(() => {
                const cardName = getAccountName(confirmingItem.credit_card_id)
                const sourceName = getAccountName(confirmingItem.source_account_id)
                const effectiveAmount = getEffectiveAmount(confirmingItem)
                return (
                  <>
                    <p className="text-sm text-gray-700">
                      Isto irá debitar{' '}
                      <span className="font-semibold text-red-600">
                        {effectiveAmount !== null ? formatCurrency(effectiveAmount) : `${confirmingItem.percentage}%`}
                      </span>{' '}
                      de <span className="font-medium">{sourceName}</span> e reduzir a dívida de{' '}
                      <span className="font-medium">{cardName}</span>.
                    </p>
                    {confirmingItem.percentage !== null && effectiveAmount !== null && (
                      <p className="text-xs text-gray-400">
                        {confirmingItem.percentage}% da dívida atual = {formatCurrency(effectiveAmount)}
                      </p>
                    )}
                  </>
                )
              })()}
              <button
                onClick={() => handleConfirmPayment(confirmingItem)}
                className="w-full py-3 bg-green-600 text-white rounded-xl text-sm font-semibold"
              >
                Confirmar pagamento
              </button>
              <button
                onClick={() => setConfirmingItem(null)}
                className="w-full py-2 border border-gray-200 rounded-xl text-sm text-gray-600"
              >
                Cancelar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
