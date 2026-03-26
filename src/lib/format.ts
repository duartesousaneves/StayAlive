export function formatCurrency(amount: number): string {
  const abs = Math.abs(amount)
  const [intPart, decPart] = abs.toFixed(2).split('.')
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const formatted = `${intFormatted},${decPart} €`
  return amount < 0 ? `-${formatted}` : formatted
}

function parseLocalDate(iso: string): Date {
  const datePart = iso.split('T')[0]
  const [year, month, day] = datePart.split('-').map(Number)
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
