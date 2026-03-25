'use client'
import { formatCurrency, formatShortDate } from '@/lib/format'
import type { Database } from '@/lib/supabase/types'

type Transaction = Database['public']['Tables']['transactions']['Row']

interface Props {
  transactions: Transaction[]
  loading: boolean
}

export default function TransactionList({ transactions, loading }: Props) {
  if (loading) return <div className="py-10 text-center text-gray-400">A carregar…</div>

  if (transactions.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-gray-400">Sem transações</p>
      </div>
    )
  }

  // Group by date
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
              <div key={t.id} className="flex justify-between items-center px-4 py-3">
                <p className="text-sm text-gray-800 truncate max-w-[60%]">{t.description}</p>
                <span className={`text-sm font-semibold ${t.amount < 0 ? 'text-red-500' : 'text-green-600'}`}>
                  {formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
