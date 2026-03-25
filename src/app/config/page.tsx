'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAccounts } from '@/hooks/useAccounts'
import { useRecurringItems } from '@/hooks/useRecurringItems'
import RecurringItemForm, { type RecurringFormData } from '@/components/RecurringItemForm'
import { formatCurrency } from '@/lib/format'

export default function ConfigPage() {
  const router = useRouter()
  const { accounts, updateBalance } = useAccounts()
  const { items, addItem, removeItem } = useRecurringItems()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null)
  const [balanceInput, setBalanceInput] = useState('')

  function startEditBalance(accountId: string, currentBalance: number) {
    setEditingAccountId(accountId)
    setBalanceInput(currentBalance.toFixed(2).replace('.', ','))
  }

  async function handleBalanceSave() {
    if (!editingAccountId) return
    const n = parseFloat(balanceInput.replace(',', '.'))
    if (isNaN(n)) return
    await updateBalance(editingAccountId, n)
    setEditingAccountId(null)
  }

  async function handleAddRecurring(data: RecurringFormData) {
    await addItem(data)
    setShowAddForm(false)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <div className="pt-4 pb-6 flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900 px-4">Configurações</h1>

      {/* Accounts / balance section */}
      <section className="px-4">
        <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Contas</p>
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
          {accounts.map(account => (
            <div key={account.id} className="px-4 py-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-800">{account.name}</p>
                  <p className="text-xs text-gray-400">
                    {account.type === 'credit_card' ? 'Cartão de crédito' : 'Conta à ordem'}
                    {account.is_default ? ' · Principal' : ''}
                  </p>
                </div>
                {editingAccountId === account.id ? (
                  <div className="flex gap-2 items-center">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                      <input
                        autoFocus
                        value={balanceInput}
                        onChange={e => setBalanceInput(e.target.value.replace(/[^0-9,.\-]/g, ''))}
                        className="pl-6 pr-2 py-1 border border-gray-200 rounded-lg text-sm w-28"
                        inputMode="decimal"
                      />
                    </div>
                    <button onClick={handleBalanceSave} className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm">OK</button>
                    <button onClick={() => setEditingAccountId(null)} className="text-gray-400 text-sm">✕</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-700">
                      {formatCurrency(account.balance)}
                    </span>
                    <button
                      onClick={() => startEditBalance(account.id, account.balance)}
                      className="text-blue-600 text-sm"
                    >
                      Editar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recurring items section */}
      <section className="px-4">
        <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Despesas & Rendimentos Fixos</p>
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
          {items.map(item => (
            <div key={item.id} className="flex justify-between items-center px-4 py-3">
              <div>
                <p className="text-sm text-gray-800">{item.name}</p>
                <p className="text-xs text-gray-400">{item.frequency} · {item.type === 'expense' ? 'Despesa' : 'Rendimento'}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-semibold ${item.type === 'expense' ? 'text-red-500' : 'text-green-600'}`}>
                  {formatCurrency(item.amount)}
                </span>
                <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-400 text-lg">×</button>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-6">Sem itens fixos</p>
          )}
        </div>
        {showAddForm ? (
          <div className="mt-3">
            <RecurringItemForm onSave={handleAddRecurring} onCancel={() => setShowAddForm(false)} />
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

      {/* Sign out */}
      <section className="px-4">
        <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Conta</p>
        <div className="bg-white rounded-2xl shadow-sm">
          <button
            onClick={handleSignOut}
            className="w-full text-left px-4 py-4 text-red-500 font-medium text-sm"
          >
            Terminar sessão
          </button>
        </div>
      </section>
    </div>
  )
}
