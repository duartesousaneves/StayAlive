'use client'

export const DEFAULT_CATEGORIES = [
  { name: 'Supermercado',     type: 'expense' as const, icon: '🛒', color: '#16a34a', keywords: ['continente', 'pingo doce', 'lidl', 'aldi', 'mercadona'] },
  { name: 'Transportes',      type: 'expense' as const, icon: '🚗', color: '#2563eb', keywords: ['uber', 'bolt', 'cp', 'carris', 'metro'] },
  { name: 'Subscrições',      type: 'expense' as const, icon: '📺', color: '#7c3aed', keywords: ['netflix', 'spotify', 'apple', 'amazon', 'disney'] },
  { name: 'Telecomunicações', type: 'expense' as const, icon: '📱', color: '#0891b2', keywords: ['nos', 'meo', 'vodafone', 'nowo'] },
  { name: 'Rendimento',       type: 'income'  as const, icon: '💰', color: '#ca8a04', keywords: ['salário', 'vencimento', 'ordenado'] },
]

interface Props {
  onDone: () => void
  onSkip: () => void
}

export default function Step4Categories({ onDone, onSkip }: Props) {
  return (
    <div className="px-6 py-8 flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Categorias pré-definidas</h2>
        <p className="mt-2 text-gray-500">
          Criámos estas categorias automaticamente. Podes editá-las mais tarde em Config.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {DEFAULT_CATEGORIES.map(cat => (
          <div key={cat.name} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
            <span className="text-2xl">{cat.icon}</span>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{cat.name}</p>
              <p className="text-xs text-gray-400">{cat.keywords.join(', ')}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onDone}
        className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl active:scale-95 transition"
      >
        Continuar
      </button>
      <button onClick={onSkip} className="text-gray-400 text-sm text-center py-2">Saltar →</button>
    </div>
  )
}
