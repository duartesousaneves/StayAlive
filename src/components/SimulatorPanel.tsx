'use client'
import { useState, useMemo } from 'react'
import { formatCurrency, formatShortDate } from '@/lib/format'
import { computeSimulatedProjection, type ProjectionResult } from '@/lib/projection'

interface Props {
  projection: ProjectionResult
  currentBalance: number
  onRegister: (amount: number) => Promise<void>
}

export default function SimulatorPanel({ projection, currentBalance, onRegister }: Props) {
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)

  const spendAmount = parseFloat(input.replace(',', '.')) || 0
  const simulated = useMemo(
    () => spendAmount > 0 ? computeSimulatedProjection(projection, spendAmount) : null,
    [projection, spendAmount]
  )

  const resultBalance = currentBalance - spendAmount
  const safe = simulated ? simulated.criticalDay === null : true

  async function handleRegister() {
    if (spendAmount <= 0) return
    setSaving(true)
    await onRegister(spendAmount)
    setSaving(false)
    setInput('')
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Simular gasto</h1>
        <p className="text-gray-400 text-sm mt-1">Quanto queres gastar?</p>
      </div>

      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">€</span>
        <input
          autoFocus
          type="text"
          inputMode="decimal"
          value={input}
          onChange={e => setInput(e.target.value.replace(/[^0-9,.]/g, ''))}
          placeholder="0,00"
          className="w-full pl-10 pr-4 py-5 text-3xl font-bold border-2 border-gray-200 rounded-2xl focus:border-blue-600 focus:outline-none"
        />
      </div>

      {spendAmount > 0 && (
        <div className="bg-gray-50 rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Saldo resultante</span>
            <span className={`font-bold text-lg ${resultBalance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {formatCurrency(resultBalance)}
            </span>
          </div>
          {simulated && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Novo dia crítico</span>
              <span className="font-medium text-sm">
                {simulated.criticalDay ? formatShortDate(simulated.criticalDay) : '—'}
              </span>
            </div>
          )}
          {projection.criticalDay && simulated?.criticalDay && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Delta</span>
              <span className="text-sm text-orange-600">
                {Math.round(
                  (new Date(simulated.criticalDay).getTime() - new Date(projection.criticalDay).getTime()) / 86400000
                )} dias
              </span>
            </div>
          )}
          {safe ? (
            <div className="bg-green-50 text-green-700 rounded-xl px-4 py-2 text-sm font-medium text-center">
              ✅ Estás bem nos próximos 30 dias
            </div>
          ) : (
            <div className="bg-red-50 text-red-700 rounded-xl px-4 py-2 text-sm font-medium text-center">
              ⚠️ Este gasto antecipa o dia crítico
            </div>
          )}
        </div>
      )}

      <button
        onClick={handleRegister}
        disabled={spendAmount <= 0 || saving}
        className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl disabled:opacity-40 active:scale-95 transition"
      >
        {saving ? 'A registar…' : 'Registar gasto'}
      </button>
    </div>
  )
}
