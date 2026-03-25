import Link from 'next/link'
import { formatCurrency, formatShortDate } from '@/lib/format'
import type { Database } from '@/lib/supabase/types'

type Transaction = Database['public']['Tables']['transactions']['Row']

interface Props {
  transactions: Transaction[]
}

export default function RecentTransactions({ transactions }: Props) {
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
            <div key={t.id} className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-800 truncate max-w-[200px]">{t.description}</p>
                <p className="text-xs text-gray-400">{formatShortDate(t.date)}</p>
              </div>
              <span className={`text-sm font-semibold ${t.amount < 0 ? 'text-red-500' : 'text-green-600'}`}>
                {formatCurrency(t.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
