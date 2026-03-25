'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAccounts } from '@/hooks/useAccounts'
import { useRecurringItems } from '@/hooks/useRecurringItems'
import { useCategories } from '@/hooks/useCategories'
import RecurringItemForm, { type RecurringFormData } from '@/components/RecurringItemForm'
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
    if (count > 0) return  // blocked — show message only
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

export default function ConfigPage() {
  const router = useRouter()
  const { accounts, updateBalance, setDefault, createAccount, deleteAccount, getTransactionCount } = useAccounts()
  const { items, addItem, removeItem } = useRecurringItems()
  const { categories, rules, refetch: refetchCategories } = useCategories()
  const [showAddForm, setShowAddForm] = useState(false)
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null)
  const [balanceInput, setBalanceInput] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [newRuleKeyword, setNewRuleKeyword] = useState('')
  const [addingRuleForCatId, setAddingRuleForCatId] = useState<string | null>(null)

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

      {/* Accounts section */}
      <section className="px-4">
        <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Contas</p>
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
          {accounts.map(account => (
            <div key={account.id} className="px-4 py-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-800">{account.name}</p>
                    {account.is_default && (
                      <span className="text-xs bg-blue-100 text-blue-600 rounded-full px-2 py-0.5">Principal</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    {account.type === 'credit_card' ? 'Cartão de crédito' : 'Conta à ordem'}
                  </p>
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

      {/* Categories and rules section */}
      <section className="px-4">
        <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Categorias & Regras</p>
        <div className="flex flex-col gap-3">
          {categories.map(cat => {
            const catRules = rules.filter(r => r.category_id === cat.id)
            return (
              <div key={cat.id} className="bg-white rounded-2xl shadow-sm p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{cat.icon}</span>
                  <p className="text-sm font-semibold text-gray-800">{cat.name}</p>
                  <span
                    className="w-3 h-3 rounded-full inline-block ml-auto"
                    style={{ backgroundColor: cat.color }}
                  />
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {catRules.map(rule => (
                    <span key={rule.id} className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 text-xs">
                      {rule.keyword}
                      <button
                        onClick={async () => {
                          const supabase = createClient()
                          await (supabase.from('category_rules') as any).delete().eq('id', rule.id)
                          refetchCategories()
                        }}
                        className="hover:text-red-500 ml-0.5"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
                {addingRuleForCatId === cat.id ? (
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      value={newRuleKeyword}
                      onChange={e => setNewRuleKeyword(e.target.value)}
                      placeholder="keyword"
                      className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-sm"
                      onKeyDown={async e => {
                        if (e.key === 'Enter' && newRuleKeyword.trim()) {
                          const supabase = createClient()
                          const { data: { user } } = await supabase.auth.getUser()
                          if (user) {
                            await (supabase.from('category_rules') as any).insert({
                              user_id: user.id,
                              keyword: newRuleKeyword.trim().toLowerCase(),
                              category_id: cat.id,
                              priority: 1,
                            })
                            refetchCategories()
                          }
                          setNewRuleKeyword('')
                          setAddingRuleForCatId(null)
                        }
                        if (e.key === 'Escape') setAddingRuleForCatId(null)
                      }}
                    />
                    <button onClick={() => setAddingRuleForCatId(null)} className="text-gray-400 text-sm">✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setAddingRuleForCatId(cat.id); setNewRuleKeyword('') }}
                    className="text-blue-600 text-xs"
                  >
                    + Regra
                  </button>
                )}
              </div>
            )
          })}
        </div>
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
