'use client'
import Link from 'next/link'
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
      className="flex justify-between items-center cursor-pointer select-none"
      onDoubleClick={() => onEditTransaction(transaction)}
      onTouchEnd={handleTouchEnd}
    >
      <div className="min-w-0">
        <p className="text-sm text-gray-800 truncate max-w-[200px]">{transaction.description}</p>
        <p className="text-xs text-gray-400">{formatShortDate(transaction.date)}</p>
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

export default function RecentTransactions({ transactions, categories, suggestions, onEditTransaction, onAcceptSuggestion }: Props) {
  const recent = transactions.slice(0, 3)
  return (
    <div className="mx-4 mt-3 bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm font-semibold text-gray-700">Últimas transações</p>
        <Link href="/transactions" className="text-blue-600 text-xs">Ver todas →</Link>
      </div>
      {recent.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-4">Sem transações ainda</p>
      ) : (
        <div className="flex flex-col gap-3">
          {recent.map(t => (
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
      )}
    </div>
  )
}
