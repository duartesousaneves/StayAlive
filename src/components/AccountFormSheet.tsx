'use client'
import { useState } from 'react'
import type { Account, AccountInsert } from '@/hooks/useAccounts'

interface Props {
  account?: Account    // undefined = create mode
  onSave: (data: Omit<AccountInsert, 'user_id'>) => Promise<void>
  onClose: () => void
}

export default function AccountFormSheet({ account, onSave, onClose }: Props) {
  const [name, setName] = useState(account?.name ?? '')
  const [type, setType] = useState<'checking' | 'credit_card'>(account?.type ?? 'checking')
  const [balanceStr, setBalanceStr] = useState(
    account ? account.balance.toFixed(2).replace('.', ',') : '0,00'
  )
  const [limitStr, setLimitStr] = useState(
    account?.credit_limit?.toFixed(2).replace('.', ',') ?? ''
  )
  const [closeDay, setCloseDay] = useState(account?.statement_close_day?.toString() ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    const balance = parseFloat(balanceStr.replace(',', '.'))
    if (isNaN(balance)) return
    setSaving(true)
    await onSave({
      name: name.trim(),
      type,
      balance,
      balance_updated_at: new Date().toISOString(),
      credit_limit:
        type === 'credit_card' && limitStr
          ? parseFloat(limitStr.replace(',', '.'))
          : null,
      statement_close_day:
        type === 'credit_card' && closeDay ? parseInt(closeDay, 10) : null,
    })
    setSaving(false)
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
          <p className="font-semibold text-gray-900">
            {account ? 'Editar conta' : 'Nova conta'}
          </p>
          <button onClick={onClose} className="text-gray-400 text-xl">✕</button>
        </div>

        <div className="px-4 py-4 flex flex-col gap-4">
          <div>
            <label className="text-xs text-gray-400 uppercase font-semibold">Nome</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Conta CGD"
              className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase font-semibold">Tipo</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as 'checking' | 'credit_card')}
              disabled={!!account}
              className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
            >
              <option value="checking">Conta à ordem</option>
              <option value="credit_card">Cartão de crédito</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase font-semibold">
              {type === 'credit_card' ? 'Saldo usado (negativo = dívida)' : 'Saldo atual'}
            </label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
              <input
                value={balanceStr}
                onChange={e => setBalanceStr(e.target.value.replace(/[^0-9,.\-]/g, ''))}
                inputMode="decimal"
                className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>

          {type === 'credit_card' && (
            <>
              <div>
                <label className="text-xs text-gray-400 uppercase font-semibold">
                  Limite de crédito
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                  <input
                    value={limitStr}
                    onChange={e => setLimitStr(e.target.value.replace(/[^0-9,.]/g, ''))}
                    inputMode="decimal"
                    placeholder="0,00"
                    className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase font-semibold">
                  Dia de fecho do extrato
                </label>
                <input
                  value={closeDay}
                  onChange={e => setCloseDay(e.target.value.replace(/[^0-9]/g, ''))}
                  inputMode="numeric"
                  placeholder="Ex: 25"
                  className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </>
          )}
        </div>

        <div className="px-4 pb-8">
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl disabled:opacity-40"
          >
            {saving ? 'A guardar…' : 'Guardar'}
          </button>
        </div>
      </div>
    </>
  )
}
