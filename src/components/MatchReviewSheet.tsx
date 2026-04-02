'use client'
import { formatCurrency } from '@/lib/format'
import type { MatchCandidate, OccurrenceKey } from '@/lib/deduplication'
import type { Database } from '@/lib/supabase/types'

type Account = Database['public']['Tables']['accounts']['Row']

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })
}

interface Props {
  matches: MatchCandidate[]
  accounts: Account[]
  onConfirm: (key: OccurrenceKey) => void
  onDismiss: (key: OccurrenceKey) => void
  onClose: () => void
}

export default function MatchReviewSheet({ matches, accounts, onConfirm, onDismiss, onClose }: Props) {
  function getAccountName(id: string | null): string {
    if (!id) return '—'
    return accounts.find(a => a.id === id)?.name ?? '—'
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl max-w-md mx-auto max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
          <p className="font-semibold text-gray-900">Transações possivelmente realizadas</p>
          <button onClick={onClose} className="text-gray-400 text-xl">✕</button>
        </div>
        <p className="text-xs text-gray-500 px-4 pt-3 pb-1">
          Confirma se estas transações já foram pagas para as remover da projeção.
        </p>
        <div className="overflow-y-auto flex-1 px-4 py-3 flex flex-col gap-4 pb-8">
          {matches.map(({ occurrence, transaction }) => (
            <div key={occurrence.key} className="bg-gray-50 rounded-xl p-3 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white rounded-lg p-2 flex flex-col gap-0.5">
                  <p className="text-gray-400 uppercase font-semibold text-[10px] mb-1">Previsto</p>
                  <p className="text-gray-800 font-medium truncate">{occurrence.name}</p>
                  <p className="text-gray-500">{formatDate(occurrence.date)}</p>
                  <p className="text-red-500 font-semibold">{formatCurrency(occurrence.amount)}</p>
                  <p className="text-gray-400 truncate">{getAccountName(occurrence.accountId)}</p>
                </div>
                <div className="bg-white rounded-lg p-2 flex flex-col gap-0.5">
                  <p className="text-gray-400 uppercase font-semibold text-[10px] mb-1">Realizado</p>
                  <p className="text-gray-800 font-medium truncate">{transaction.description}</p>
                  <p className="text-gray-500">{formatDate(transaction.date)}</p>
                  <p className="text-red-500 font-semibold">{formatCurrency(Math.abs(transaction.amount))}</p>
                  <p className="text-gray-400 truncate">{getAccountName(transaction.account_id)}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onConfirm(occurrence.key)}
                  className="flex-1 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg"
                >
                  Sim, já foi pago
                </button>
                <button
                  onClick={() => onDismiss(occurrence.key)}
                  className="flex-1 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg"
                >
                  Manter na projeção
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
