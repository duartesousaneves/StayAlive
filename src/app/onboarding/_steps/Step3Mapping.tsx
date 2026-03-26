'use client'
import { useState } from 'react'
import { applyMapping, type ColumnMapping } from '@/lib/csv'
import { formatCurrency } from '@/lib/format'

interface Props {
  headers: string[]
  rows: Record<string, string>[]
  savedMapping: ColumnMapping | null
  onDone: (mapping: ColumnMapping) => void
  onSkip: () => void
}

export default function Step3Mapping({ headers, rows, savedMapping, onDone, onSkip }: Props) {
  const [dateCol, setDateCol] = useState(savedMapping?.dateCol ?? headers[0] ?? '')
  const [descCol, setDescCol] = useState(savedMapping?.descriptionCol ?? headers[1] ?? '')
  const [amountCol, setAmountCol] = useState(savedMapping?.amountCol ?? headers[2] ?? '')
  const [negativeIsExpense, setNegativeIsExpense] = useState(savedMapping?.negativeIsExpense ?? true)

  const mapping: ColumnMapping = { dateCol, descriptionCol: descCol, amountCol, negativeIsExpense }
  const preview = applyMapping(rows.slice(0, 3), mapping)

  const sel = (value: string, set: (v: string) => void) => (
    <select
      value={value}
      onChange={e => set(e.target.value)}
      className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full"
    >
      {headers.map(h => <option key={h} value={h}>{h}</option>)}
    </select>
  )

  return (
    <div className="px-6 py-8 flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Mapeia as colunas</h2>
        <p className="mt-2 text-gray-500">Diz-nos quais colunas correspondem a quê.</p>
      </div>

      <div className="flex flex-col gap-4">
        <div><label className="text-sm font-medium text-gray-700">Data</label>{sel(dateCol, setDateCol)}</div>
        <div><label className="text-sm font-medium text-gray-700">Descrição</label>{sel(descCol, setDescCol)}</div>
        <div><label className="text-sm font-medium text-gray-700">Valor</label>{sel(amountCol, setAmountCol)}</div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={negativeIsExpense}
            onChange={e => setNegativeIsExpense(e.target.checked)}
            className="w-4 h-4 accent-blue-600"
          />
          Valor negativo = despesa
        </label>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Pré-visualização (3 linhas)</p>
        <div className="bg-gray-50 rounded-xl p-3 text-sm flex flex-col gap-2">
          {preview.map((row, i) => (
            <div key={i} className="flex justify-between">
              <span className="text-gray-600 truncate max-w-[60%]">{row.description}</span>
              <span className={row.amount < 0 ? 'text-red-600' : 'text-green-600'}>
                {formatCurrency(row.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => onDone(mapping)}
        className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl active:scale-95 transition"
      >
        Confirmar mapeamento
      </button>
      <button onClick={onSkip} className="text-gray-400 text-sm text-center py-2">Saltar →</button>
    </div>
  )
}
