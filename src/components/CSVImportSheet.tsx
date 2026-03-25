'use client'
import { useState } from 'react'
import Link from 'next/link'
import { parseCSV, applyMapping, type ColumnMapping } from '@/lib/csv'
import { categorize } from '@/lib/categorize'
import { createClient } from '@/lib/supabase/client'
import { useCategories } from '@/hooks/useCategories'
import { formatCurrency, formatShortDate } from '@/lib/format'

type ImportStep = 'upload' | 'mapping' | 'preview' | 'done'

interface Props {
  onClose: () => void
  onImported: () => void
}

export default function CSVImportSheet({ onClose, onImported }: Props) {
  const { rules } = useCategories()
  const [step, setStep] = useState<ImportStep>('upload')
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<ColumnMapping | null>(null)
  const [ignoreDuplicates, setIgnoreDuplicates] = useState(true)
  const [importedCount, setImportedCount] = useState(0)
  const [loading, setLoading] = useState(false)

  async function loadSavedMapping() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await (supabase.from('user_settings').select('*').eq('user_id', user.id).single() as any)
    if ((data as any)?.csv_column_date) {
      return {
        dateCol: (data as any).csv_column_date,
        descriptionCol: (data as any).csv_column_description!,
        amountCol: (data as any).csv_column_amount!,
        negativeIsExpense: (data as any).csv_negative_is_expense,
      } as ColumnMapping
    }
    return null
  }

  async function handleFile(file: File) {
    setLoading(true)
    const { headers: h, rows } = await parseCSV(file)
    setHeaders(h)
    setRawRows(rows)

    const saved = await loadSavedMapping()
    if (saved) {
      setMapping(saved)
      setStep('preview')
    } else {
      // Initialise mapping from first 3 headers so the form is never in an uninitialised state
      setMapping({
        dateCol: h[0] ?? '',
        descriptionCol: h[1] ?? '',
        amountCol: h[2] ?? '',
        negativeIsExpense: true,
      })
      setStep('mapping')
    }
    setLoading(false)
  }

  async function handleConfirmImport() {
    if (!mapping) return
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const parsed = applyMapping(rawRows, mapping)

    let toInsert = parsed.map(row => ({
      user_id: user.id,
      date: row.date,
      description: row.description,
      amount: row.amount,
      category_id: categorize(row.description, rules),
      source: 'csv' as const,
    }))

    if (ignoreDuplicates) {
      // Fetch existing (date, description, amount) combos
      const { data: existing } = await (supabase
        .from('transactions')
        .select('date, description, amount')
        .eq('user_id', user.id) as any)

      const existingSet = new Set(
        (existing ?? []).map((t: any) => `${t.date}|${t.description}|${t.amount}`)
      )
      toInsert = toInsert.filter(
        t => !existingSet.has(`${t.date}|${t.description}|${t.amount}`)
      )
    }

    if (toInsert.length > 0) {
      await ((supabase.from('transactions') as any).insert(toInsert) as any)
    }

    // Save mapping back to user_settings so future imports auto-skip mapping step
    await ((supabase.from('user_settings') as any).upsert({
      user_id: user.id,
      csv_column_date: mapping.dateCol,
      csv_column_description: mapping.descriptionCol,
      csv_column_amount: mapping.amountCol,
      csv_negative_is_expense: mapping.negativeIsExpense,
      updated_at: new Date().toISOString(),
    }) as any)

    setImportedCount(toInsert.length)
    setStep('done')
    setLoading(false)
  }

  const preview = mapping ? applyMapping(rawRows, mapping) : []

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Importar CSV</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">✕</button>
        </div>

        <div className="px-6 py-6">
          {step === 'upload' && (
            <div className="flex flex-col gap-4">
              <div
                onClick={() => document.getElementById('csv-file-input')?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400"
              >
                <p className="text-4xl mb-2">📂</p>
                <p className="text-gray-500 text-sm">Clica para selecionar CSV</p>
                <input
                  id="csv-file-input"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
                />
              </div>
              {loading && <p className="text-blue-600 text-sm text-center">A ler…</p>}
            </div>
          )}

          {step === 'mapping' && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-gray-600">Mapeia as colunas do teu CSV:</p>
              {(['dateCol', 'descriptionCol', 'amountCol'] as const).map(field => {
                const labels = { dateCol: 'Data', descriptionCol: 'Descrição', amountCol: 'Valor' }
                return (
                  <div key={field}>
                    <label className="text-sm font-medium text-gray-700">{labels[field]}</label>
                    <select
                      value={(mapping as any)?.[field] ?? headers[0]}
                      onChange={e => setMapping(m => ({ ...(m ?? { dateCol: headers[0], descriptionCol: headers[1], amountCol: headers[2], negativeIsExpense: true }), [field]: e.target.value }))}
                      className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    >
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                )
              })}
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={mapping?.negativeIsExpense ?? true}
                  onChange={e => setMapping(m => ({ ...(m!), negativeIsExpense: e.target.checked }))}
                  className="w-4 h-4 accent-blue-600"
                />
                Valor negativo = despesa
              </label>
              <button
                onClick={() => setStep('preview')}
                disabled={!mapping}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold disabled:opacity-40"
              >
                Ver pré-visualização
              </button>
            </div>
          )}

          {step === 'preview' && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between text-sm text-gray-500">
                <span>{preview.length} transações · {preview[0]?.date} → {preview[preview.length-1]?.date}</span>
                <button onClick={() => setStep('mapping')} className="text-blue-600">Alterar mapeamento</button>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={ignoreDuplicates}
                  onChange={e => setIgnoreDuplicates(e.target.checked)}
                  className="w-4 h-4 accent-blue-600"
                />
                Ignorar duplicados
              </label>
              <div className="max-h-48 overflow-y-auto flex flex-col gap-2">
                {preview.slice(0, 20).map((row, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-600 truncate max-w-[65%]">{row.description}</span>
                    <span className={row.amount < 0 ? 'text-red-500' : 'text-green-600'}>
                      {formatCurrency(row.amount)}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={handleConfirmImport}
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold disabled:opacity-40"
              >
                {loading ? 'A importar…' : `Importar ${preview.length} transações`}
              </button>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-6 flex flex-col gap-4">
              <span className="text-5xl">✅</span>
              <p className="font-semibold text-gray-900">{importedCount} transações importadas</p>
              <Link
                href="/transactions?filter=uncategorized"
                onClick={onImported}
                className="w-full py-3 border border-blue-600 text-blue-600 rounded-xl font-semibold text-sm"
              >
                Categorizar agora →
              </Link>
              <button onClick={onImported} className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold">
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
