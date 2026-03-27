'use client'
import Link from 'next/link'

const options = [
  {
    href: '/simulator/transacao',
    icon: '✓',
    label: 'Transação ocorrida',
    description: 'Registar uma transação já realizada',
  },
  {
    href: '/simulator/pontual',
    icon: '📅',
    label: 'Pontual futura',
    description: 'Agendar uma despesa ou rendimento pontual',
  },
  {
    href: '/simulator/recorrente',
    icon: '🔁',
    label: 'Recorrente',
    description: 'Gerir despesas e rendimentos fixos',
  },
]

export default function RegistarPage() {
  return (
    <div className="px-4 pt-4 pb-6 flex flex-col gap-4">
      <h1 className="text-xl font-bold text-gray-800">Registar</h1>
      <div className="flex flex-col gap-3">
        {options.map(opt => (
          <Link
            key={opt.href}
            href={opt.href}
            className="flex items-center gap-4 bg-white rounded-2xl shadow-sm px-4 py-4 active:bg-gray-50"
          >
            <span className="text-2xl w-8 text-center">{opt.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
              <p className="text-xs text-gray-400">{opt.description}</p>
            </div>
            <span className="text-gray-300 text-sm flex-shrink-0">›</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
