'use client'
import { type ColumnMapping } from '@/lib/csv'

interface Props {
  headers: string[]
  rows: Record<string, string>[]
  savedMapping: ColumnMapping | null
  onDone: (mapping: ColumnMapping) => void
  onSkip: () => void
}

export default function Step3Mapping({ headers, rows, savedMapping, onDone, onSkip }: Props) {
  return (
    <div className="px-6 py-8 flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Mapear colunas</h2>
        <p className="mt-2 text-gray-500">
          Identifica as colunas da tua importação.
        </p>
      </div>
      <button
        onClick={onSkip}
        className="w-full py-4 bg-gray-100 text-gray-900 font-semibold rounded-xl active:scale-95 transition"
      >
        Saltar este passo
      </button>
    </div>
  )
}
