'use client'
import { useState, useRef } from 'react'
import { parseCSV } from '@/lib/csv'

interface Props {
  onParsed: (headers: string[], rows: Record<string, string>[]) => void
  onSkip: () => void
}

export default function Step2CSV({ onParsed, onSkip }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (file.size > 5 * 1024 * 1024) { setError('Ficheiro demasiado grande (máx. 5MB)'); return }
    setLoading(true)
    setError('')
    try {
      const { headers, rows } = await parseCSV(file)
      onParsed(headers, rows)
    } catch {
      setError('Erro ao ler o ficheiro CSV.')
    } finally {
      setLoading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="px-6 py-8 flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Importa o teu extrato</h2>
        <p className="mt-2 text-gray-500">Suporta CGD, Millennium, Santander, Novo Banco, BPI (formato CSV).</p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-blue-400 transition"
      >
        <span className="text-4xl">📂</span>
        <p className="text-gray-600 text-center">Arrasta o ficheiro aqui<br />ou clica para selecionar</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
        />
      </div>

      {loading && <p className="text-blue-600 text-sm text-center">A ler CSV...</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        onClick={onSkip}
        className="text-gray-400 text-sm text-center py-2"
      >
        Saltar por agora →
      </button>
    </div>
  )
}
