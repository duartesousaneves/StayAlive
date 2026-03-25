'use client'
import { useState } from 'react'
import type { TransactionTag } from '@/hooks/useTransactionTags'

interface Props {
  tags: TransactionTag[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  onCreateTag?: (name: string) => Promise<TransactionTag | null>
}

export default function TagInput({ tags, selectedIds, onChange, onCreateTag }: Props) {
  const [input, setInput] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  const selectedTags = tags.filter(t => selectedIds.includes(t.id))
  const filtered = tags.filter(
    t => !selectedIds.includes(t.id) && t.name.toLowerCase().includes(input.toLowerCase())
  )

  function addTag(tag: TransactionTag) {
    onChange([...selectedIds, tag.id])
    setInput('')
    setShowDropdown(false)
  }

  function removeTag(id: string) {
    onChange(selectedIds.filter(i => i !== id))
  }

  async function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault()
      const existing = tags.find(t => t.name.toLowerCase() === input.trim().toLowerCase())
      if (existing) {
        addTag(existing)
      } else if (onCreateTag) {
        const created = await onCreateTag(input.trim())
        if (created) addTag(created)
      }
    }
    if (e.key === 'Backspace' && !input && selectedIds.length > 0) {
      onChange(selectedIds.slice(0, -1))
    }
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1 border border-gray-200 rounded-lg px-3 py-2 min-h-[42px]">
        {selectedTags.map(tag => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 text-xs"
          >
            {tag.name}
            <button type="button" onClick={() => removeTag(tag.id)} className="hover:opacity-70">✕</button>
          </span>
        ))}
        <input
          value={input}
          onChange={e => { setInput(e.target.value); setShowDropdown(true) }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          placeholder={selectedTags.length === 0 ? 'Adicionar tag…' : ''}
          className="flex-1 min-w-[80px] outline-none text-sm bg-transparent"
        />
      </div>

      {showDropdown && (filtered.length > 0 || (input.trim() && onCreateTag)) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-36 overflow-y-auto">
          {filtered.map(tag => (
            <button
              key={tag.id}
              type="button"
              onMouseDown={() => addTag(tag)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
            >
              {tag.name}
            </button>
          ))}
          {input.trim() &&
            !tags.find(t => t.name.toLowerCase() === input.trim().toLowerCase()) &&
            onCreateTag && (
              <button
                type="button"
                onMouseDown={async () => {
                  const created = await onCreateTag(input.trim())
                  if (created) addTag(created)
                }}
                className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50"
              >
                + Criar &ldquo;{input.trim()}&rdquo;
              </button>
            )}
        </div>
      )}
    </div>
  )
}
