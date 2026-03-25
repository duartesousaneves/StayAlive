'use client'
import { useRef, useState } from 'react'
import AccountCard from './AccountCard'
import type { Account } from '@/hooks/useAccounts'

interface Props {
  accounts: Account[]
  onEditAccount: (account: Account) => void
  onAddAccount: () => void
}

export default function AccountCarousel({ accounts, onEditAccount, onAddAccount }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const startX = useRef(0)
  const total = accounts.length + 1  // +1 for the "add" card

  function handleTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const delta = startX.current - e.changedTouches[0].clientX
    if (delta > 40 && activeIndex < total - 1) setActiveIndex(i => i + 1)
    if (delta < -40 && activeIndex > 0) setActiveIndex(i => i - 1)
  }

  return (
    <div className="mx-4 mt-4">
      <div
        className="overflow-hidden rounded-2xl"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex transition-transform duration-300"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {accounts.map(account => (
            <div key={account.id} className="min-w-full">
              <AccountCard account={account} onEdit={onEditAccount} />
            </div>
          ))}
          {/* Add account card */}
          <div className="min-w-full">
            <button
              onClick={onAddAccount}
              className="w-full bg-blue-50 border-2 border-dashed border-blue-200 text-blue-600 rounded-2xl p-5 h-[108px] flex items-center justify-center text-sm font-semibold"
            >
              + Nova conta
            </button>
          </div>
        </div>
      </div>

      {/* Position dots */}
      <div className="flex justify-center gap-1.5 mt-3">
        {Array.from({ length: total }).map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              i === activeIndex ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
