'use client'
import { HORIZON_LABELS, type ProjectionHorizon } from '@/lib/projection'

const OPTIONS: ProjectionHorizon[] = ['30d', '90d', '180d', '365d', 'end-of-year']

interface Props {
  value: ProjectionHorizon
  onChange: (h: ProjectionHorizon) => void
}

export default function HorizonSelector({ value, onChange }: Props) {
  return (
    <div className="mx-4 mt-3 flex rounded-xl overflow-hidden shadow-sm border border-gray-200">
      {OPTIONS.map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            value === option
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          {HORIZON_LABELS[option]}
        </button>
      ))}
    </div>
  )
}
