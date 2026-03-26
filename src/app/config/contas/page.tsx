'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { useAccounts, type Account } from '@/hooks/useAccounts'
import AccountFormSheet from '@/components/AccountFormSheet'
import { formatCurrency } from '@/lib/format'

function AccountDeleteButton({
  accountId,
  getCount,
  onDelete,
}: {
  accountId: string
  getCount: (id: string) => Promise<number>
  onDelete: (id: string) => Promise<void>
}) {
  const [count, setCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    if (count === null) {
      const n = await getCount(accountId)
      setCount(n)
      return
    }
    if (count > 0) return
    setLoading(true)
    await onDelete(accountId)
    setLoading(false)
  }

  if (count !== null && count > 0) {
    return <span className="text-xs text-red-400">{count} transações</span>
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40"
    >
      {loading ? '…' : count === null ? '🗑' : 'Confirmar'}
    </button>
  )
}

function accountTypeLabel(type: string) {
  if (type === 'credit_card') return 'Cartão de crédito'
  if (type === 'cash') return 'Dinheiro'
  return 'Conta à ordem'
}

export default function ContasPage() {
  const { accounts, updateBalance, updateAccount, setDefault, createAccount, deleteAccount, getTransactionCount } = useAccounts()
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null)
  const [balanceInput, setBalanceInput] = useState('')
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const lastTap = useRef<Record<string, number>>({})

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

  function handleAccountTouchEnd(account: Account) {
    const now = Date.now()
    if (now - (lastTap.current[account.id] ?? 0) < 300) setEditingAccount(account)
    lastTap.current[account.id] = now
  }

  async function handleAccountEdit(data: Parameters<typeof createAccount>[0]) {
    if (!editingAccount) return
    await updateAccount(editingAccount.id, {
      name: data.name,
      balance: data.balance,
      credit_limit: data.credit_limit ?? null,
      statement_close_day: data.statement_close_day ?? null,
    })
    setEditingAccount(null)
  }

  return (
    <div className="pt-4 pb-6 flex flex-col gap-6">
      <div className="px-4 flex items-center gap-3">
        <Link href="/config" className="text-blue-600 flex items-center gap-1 text-sm">
          ‹ Configurações
        </Link>
      </div>
      <h1 className="text-xl font-bold text-gray-900 px-4">Contas</h1>

      <section className="px-4">
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
          {accounts.map(account => (
            <div
              key={account.id}
              className="px-4 py-3 cursor-pointer select-none"
              onDoubleClick={() => setEditingAccount(account)}
              onTouchEnd={() => handleAccountTouchEnd(account)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-800">{account.name}</p>
                    {account.is_default && (
                      <span className="text-xs bg-blue-100 text-blue-600 rounded-full px-2 py-0.5">Principal</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{accountTypeLabel(account.type)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {editingAccountId === account.id ? (
                    <>
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
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-semibold text-gray-700">
                        {formatCurrency(account.balance)}
                      </span>
                      <button onClick={() => startEditBalance(account.id, account.balance)} className="text-blue-600 text-sm">Editar</button>
                      {!account.is_default && (
                        <button
                          onClick={() => setDefault(account.id)}
                          className="text-xs text-gray-500 hover:text-blue-600"
                        >
                          Principal
                        </button>
                      )}
                      <AccountDeleteButton accountId={account.id} getCount={getTransactionCount} onDelete={deleteAccount} />
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => setShowAddAccount(true)}
          className="w-full mt-3 py-3 border-2 border-dashed border-blue-200 text-blue-600 text-sm font-medium rounded-xl"
        >
          + Nova conta
        </button>
        {showAddAccount && (
          <AccountFormSheet
            onSave={createAccount}
            onClose={() => setShowAddAccount(false)}
          />
        )}
        {editingAccount && (
          <AccountFormSheet
            account={editingAccount}
            onSave={handleAccountEdit}
            onClose={() => setEditingAccount(null)}
          />
        )}
      </section>
    </div>
  )
}
