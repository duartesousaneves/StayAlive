'use client'
import { useState } from 'react'
import type { Database } from '@/lib/supabase/types'

type Account = Database['public']['Tables']['accounts']['Row']

export interface CardPaymentFormData {
  credit_card_id: string
  source_account_id: string
  amount: number | null
  percentage: number | null
  planned_date: string
  notes: string | null
}

interface Props {
  accounts: Account[]
  initialData?: CardPaymentFormData
  isEditing?: boolean
  onSave: (data: CardPaymentFormData) => Promise<void>
  onCancel: () => void
}

export default function CardPaymentForm({ accounts, initialData, isEditing, onSave, onCancel }: Props) {
  const creditCards = accounts.filter(a => a.type === 'credit_card')
  const sourceAccounts = accounts.filter(a => a.type !== 'credit_card')

  const [creditCardId, setCreditCardId] = useState(initialData?.credit_card_id ?? creditCards[0]?.id ?? '')
  const [sourceAccountId, setSourceAccountId] = useState(
    initialData?.source_account_id ?? sourceAccounts[0]?.id ?? ''
  )
  const [valueMode, setValueMode] = useState<'amount' | 'percentage'>(
    initialData?.percentage !== null && initialData?.percentage !== undefined ? 'percentage' : 'amount'
  )
  const [amountInput, setAmountInput] = useState(
    initialData?.amount !== null && initialData?.amount !== undefined
      ? initialData.amount.toFixed(2).replace('.', ',')
      : ''
  )
  const [percentageInput, setPercentageInput] = useState(
    initialData?.percentage !== null && initialData?.percentage !== undefined
      ? String(initialData.percentage)
      : ''
  )
  const [plannedDate, setPlannedDate] = useState(initialData?.planned_date ?? '')
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [saving, setSaving] = useState(false)

  const selectedCard = creditCards.find(a => a.id === creditCardId)
  const cardDebt = selectedCard ? Math.abs(Math.min(selectedCard.balance, 0)) : 0
  const estimatedAmount = valueMode === 'percentage' && percentageInput
    ? (parseFloat(percentageInput) / 100) * cardDebt
    : null

  function isValid(): boolean {
    if (!creditCardId || !sourceAccountId) return false
    if (creditCardId === sourceAccountId) return false
    if (!plannedDate) return false
    if (valueMode === 'amount') {
      const n = parseFloat(amountInput.replace(',', '.'))
      return !isNaN(n) && n > 0
    }
    const p = parseFloat(percentageInput)
    return !isNaN(p) && p > 0 && p <= 100
  }

  async function handleSave() {
    if (!isValid()) return
    setSaving(true)
    const data: CardPaymentFormData = {
      credit_card_id: creditCardId,
      source_account_id: sourceAccountId,
      amount: valueMode === 'amount' ? parseFloat(amountInput.replace(',', '.')) : null,
      percentage: valueMode === 'percentage' ? parseFloat(percentageInput) : null,
      planned_date: plannedDate,
      notes: notes.trim() || null,
    }
    await onSave(data)
    setSaving(false)
  }

  if (creditCards.length === 0) {
    return (
      <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-3">
        <p className="text-sm text-gray-500 text-center">
          Não tens cartões de crédito configurados.
        </p>
        <a
          href="/config/contas"
          className="text-center text-sm text-blue-600 font-medium py-2 border border-blue-200 rounded-lg"
        >
          Configurar contas
        </a>
        <button onClick={onCancel} className="py-2 border border-gray-200 rounded-lg text-sm text-gray-600">
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-3">
      {/* Credit card selector */}
      <div>
        <label className="text-xs text-gray-400 uppercase font-semibold">Cartão a pagar</label>
        <select
          value={creditCardId}
          onChange={e => setCreditCardId(e.target.value)}
          className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
        >
          {creditCards.map(a => (
            <option key={a.id} value={a.id}>
              {a.name}{a.balance < 0 ? ` (dívida: ${Math.abs(a.balance).toFixed(2).replace('.', ',')} €)` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Source account selector */}
      <div>
        <label className="text-xs text-gray-400 uppercase font-semibold">Pagar com</label>
        <select
          value={sourceAccountId}
          onChange={e => setSourceAccountId(e.target.value)}
          className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
        >
          {sourceAccounts.length === 0 && (
            <option value="">Sem contas disponíveis</option>
          )}
          {sourceAccounts.map(a => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.balance.toFixed(2).replace('.', ',')} €)
            </option>
          ))}
        </select>
      </div>

      {/* Value mode toggle */}
      <div>
        <label className="text-xs text-gray-400 uppercase font-semibold">Valor a pagar</label>
        <div className="flex mt-1 rounded-lg overflow-hidden border border-gray-200">
          <button
            type="button"
            onClick={() => setValueMode('amount')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              valueMode === 'amount' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'
            }`}
          >
            Montante fixo
          </button>
          <button
            type="button"
            onClick={() => setValueMode('percentage')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              valueMode === 'percentage' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'
            }`}
          >
            Percentagem
          </button>
        </div>
      </div>

      {valueMode === 'amount' ? (
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
          <input
            value={amountInput}
            onChange={e => setAmountInput(e.target.value.replace(/[^0-9,.]/g, ''))}
            inputMode="decimal"
            placeholder="0,00"
            className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <div className="relative">
            <input
              value={percentageInput}
              onChange={e => setPercentageInput(e.target.value.replace(/[^0-9.]/g, ''))}
              inputMode="decimal"
              placeholder="ex: 50"
              className="w-full pr-8 pl-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
          </div>
          {estimatedAmount !== null && estimatedAmount > 0 && (
            <p className="text-xs text-gray-500 pl-1">
              ≈ {estimatedAmount.toFixed(2).replace('.', ',')} € com base na dívida atual
            </p>
          )}
          {cardDebt === 0 && (
            <p className="text-xs text-amber-600 pl-1">Este cartão não tem dívida registada.</p>
          )}
        </div>
      )}

      {/* Date picker */}
      <div>
        <label className="text-xs text-gray-400 uppercase font-semibold">Data do pagamento</label>
        <input
          type="date"
          value={plannedDate}
          onChange={e => setPlannedDate(e.target.value)}
          className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {/* Notes */}
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
          disabled={saving || !isValid()}
          className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-40"
        >
          {saving ? 'A guardar…' : isEditing ? 'Atualizar' : 'Agendar pagamento'}
        </button>
        <button onClick={onCancel} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">
          Cancelar
        </button>
      </div>
    </div>
  )
}
