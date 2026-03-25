'use client'
import { useRef } from 'react'
import { formatCurrency, formatShortDate } from '@/lib/format'
import CategoryPill from './CategoryPill'
import type { Database } from '@/lib/supabase/types'

type Transaction = Database['public']['Tables']['transactions']['Row']
type Category = Database['public']['Tables']['categories']['Row']

interface Props {
  transactions: Transaction[]
  categories: Category[]
  suggestions: Record<string, string>  // transactionId → suggested categoryId
  loading: boolean
  onEditTransaction: (t: Transaction) => void
  onAcceptSuggestion: (transactionId: string, categoryId: string) => Promise<void>
}

function TransactionRow({
  transaction,
  categories,
  suggestions,
  onEditTransaction,
  onAcceptSuggestion,
}: {
  transaction: Transaction
  categories: Category[]
  suggestions: Record<string, string>
  onEditTransaction: (t: Transaction) => void
  onAcceptSuggestion: (transactionId: string, categoryId: string) => Promise<void>
}) {
  const lastTap = useRef<number>(0)
  const category = categories.find(c => c.id === transaction.category_id)
  const suggestedCatId = !transaction.category_id ? suggestions[transaction.id] : undefined
  const suggestedCat = suggestedCatId ? categories.find(c => c.id === suggestedCatId) : undefined

  function handleTouchEnd() {
    const now = Date.now()
    if (now - lastTap.current < 300) onEditTransaction(transaction)
    lastTap.current = now
  }

  return (
    <div
      className="flex justify-between items-center px-4 py-3 cursor-pointer select-none"
      onDoubleClick={() => onEditTransaction(transaction)}
      onTouchEnd={handleTouchEnd}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-800 truncate max-w-[60%]">{transaction.description}</p>
        <div className="flex flex-wrap gap-1 mt-1">
          {category ? (
            <CategoryPill variant="category" label={category.name} icon={category.icon} color={category.color} />
          ) : suggestedCat ? (
            <CategoryPill
              variant="suggestion"
              label={`${suggestedCat.icon} ${suggestedCat.name}?`}
              onClick={() => onAcceptSuggestion(transaction.id, suggestedCatId!)}
            />
          ) : (
            <CategoryPill variant="none" label="sem categoria" />
          )}
        </div>
      </div>
      <span className={`text-sm font-semibold ml-2 shrink-0 ${transaction.amount < 0 ? 'text-red-500' : 'text-green-600'}`}>
        {formatCurrency(transaction.amount)}
      </span>
    </div>
  )
}

export default function TransactionList({ transactions, categories, suggestions, loading, onEditTransaction, onAcceptSuggestion }: Props) {
  if (loading) return <div className="py-10 text-center text-gray-400">A carregar…</div>

  if (transactions.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-gray-400">Sem transações</p>
      </div>
    )
  }

  const groups = transactions.reduce<Record<string, Transaction[]>>((acc, t) => {
    acc[t.date] = acc[t.date] ?? []
    acc[t.date].push(t)
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-4">
      {Object.entries(groups).map(([date, txns]) => (
        <div key={date}>
          <p className="text-xs font-semibold text-gray-400 px-4 mb-2">{formatShortDate(date)}</p>
          <div className="bg-white rounded-2xl shadow-sm mx-4 divide-y divide-gray-50">
            {txns.map(t => (
              <TransactionRow
                key={t.id}
                transaction={t}
                categories={categories}
                suggestions={suggestions}
                onEditTransaction={onEditTransaction}
                onAcceptSuggestion={onAcceptSuggestion}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
