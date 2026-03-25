export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

function parseLocalDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-PT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parseLocalDate(iso))
}

export function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-PT', {
    day: 'numeric',
    month: 'short',
  }).format(parseLocalDate(iso))
}
