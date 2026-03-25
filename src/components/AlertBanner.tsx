import { formatShortDate } from '@/lib/format'

interface Props {
  criticalDay: string | null
}

export default function AlertBanner({ criticalDay }: Props) {
  if (!criticalDay) return null

  const daysUntil = Math.round(
    (new Date(criticalDay).getTime() - new Date().setHours(0,0,0,0)) / 86400000
  )
  const urgent = daysUntil <= 7
  const color = urgent ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'

  return (
    <div className={`mx-4 mt-3 p-3 rounded-xl border ${color} text-sm`}>
      ⚠️ <strong>Dia crítico: {formatShortDate(criticalDay)}</strong>
      {' '}— Se não gastares mais nada além das fixas
    </div>
  )
}
