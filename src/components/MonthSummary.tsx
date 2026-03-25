import { formatCurrency } from '@/lib/format'
import type { Database } from '@/lib/supabase/types'

type Transaction = Database['public']['Tables']['transactions']['Row']

interface Props {
  transactions: Transaction[]
  onImportCSV: () => void
}

export default function MonthSummary({ transactions, onImportCSV }: Props) {
  const now = new Date()
  const monthTxns = transactions.filter(t => {
    const d = new Date(t.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  if (monthTxns.length === 0) {
    return (
      <div className="mx-4 mt-3 bg-white rounded-2xl p-4 shadow-sm text-center">
        <p className="text-gray-400 text-sm">Sem transações este mês</p>
        <button onClick={onImportCSV} className="mt-2 text-blue-600 text-sm font-medium">
          Importar extrato →
        </button>
      </div>
    )
  }

  const expenses = monthTxns.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
  const income = monthTxns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const ratio = income > 0 ? Math.min(expenses / income, 1) : 1

  return (
    <div className="mx-4 mt-3 bg-white rounded-2xl p-4 shadow-sm">
      <p className="text-sm font-semibold text-gray-700 mb-3">Resumo do mês</p>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-red-600">Despesas: {formatCurrency(expenses)}</span>
        <span className="text-green-600">Rendimento: {formatCurrency(income)}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-2 bg-red-400 rounded-full transition-all"
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
      <p className="text-xs text-gray-400 mt-1">{Math.round(ratio * 100)}% do rendimento gasto</p>
    </div>
  )
}
