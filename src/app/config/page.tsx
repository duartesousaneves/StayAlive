import Link from 'next/link'

const sections = [
  { href: '/config/contas', icon: '🏦', label: 'Contas', description: 'Gerir contas bancárias e saldos' },
  { href: '/config/recorrentes', icon: '🔁', label: 'Despesas e Rendimentos Fixos', description: 'Itens recorrentes mensais, semanais, etc.' },
  { href: '/config/futuros', icon: '📅', label: 'Despesas e Rendimentos Futuros', description: 'Eventos previstos pontuais' },
  { href: '/config/categorias', icon: '🏷️', label: 'Categorias e Regras', description: 'Categorias e regras de classificação' },
  { href: '/config/conta', icon: '👤', label: 'Conta', description: 'Sessão e definições de conta' },
]

export default function ConfigPage() {
  return (
    <div className="pt-4 pb-6 flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900 px-4">Configurações</h1>
      <div className="px-4 flex flex-col gap-3">
        {sections.map(section => (
          <Link
            key={section.href}
            href={section.href}
            className="flex items-center gap-4 bg-white rounded-2xl shadow-sm px-4 py-4"
          >
            <span className="text-2xl">{section.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">{section.label}</p>
              <p className="text-xs text-gray-400 truncate">{section.description}</p>
            </div>
            <span className="text-gray-300 text-sm flex-shrink-0">›</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
