import { formatCurrency, formatDate } from '@/lib/format'
import type { Account } from '@/hooks/useAccounts'

interface Props {
  account: Account
  onEdit: (account: Account) => void
}

export default function AccountCard({ account, onEdit }: Props) {
  const isCredit = account.type === 'credit_card'
  // For credit cards, balance is negative (debt). Available = limit + balance (balance is negative).
  const displayAmount = isCredit
    ? (account.credit_limit ?? 0) + account.balance
    : account.balance

  return (
    <div
      className="bg-blue-600 text-white rounded-2xl p-5 shadow-lg cursor-pointer select-none"
      onClick={() => onEdit(account)}
    >
      <p className="text-blue-200 text-sm">{account.name}</p>
      <p className="text-4xl font-bold mt-1">{formatCurrency(displayAmount)}</p>
      {isCredit ? (
        <p className="text-blue-200 text-xs mt-2">
          Disponível · Limite: {formatCurrency(account.credit_limit ?? 0)}
        </p>
      ) : (
        <p className="text-blue-200 text-xs mt-2">
          {account.balance_updated_at
            ? `Atualizado em ${formatDate(account.balance_updated_at)}`
            : 'Saldo atual'}
        </p>
      )}
    </div>
  )
}
