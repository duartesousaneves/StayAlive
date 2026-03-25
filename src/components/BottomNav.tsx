'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/dashboard',     icon: '🏠', label: 'Home' },
  { href: '/transactions',  icon: '📋', label: 'Transações' },
  { href: '/simulator',     icon: '➕', label: 'Simular' },
  { href: '/config',        icon: '⚙️', label: 'Config' },
]

export default function BottomNav() {
  const path = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around z-50 pb-safe">
      {tabs.map(tab => {
        const active = path.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center py-2 px-4 text-xs gap-1 transition-colors ${
              active ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className={active ? 'font-semibold' : ''}>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
