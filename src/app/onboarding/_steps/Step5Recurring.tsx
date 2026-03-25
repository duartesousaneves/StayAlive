'use client'
import { type WizardState } from '../page'

interface Props {
  wizardState: WizardState
}

export default function Step5Recurring({ wizardState }: Props) {
  return (
    <div className="px-6 py-8 flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Configurar transações recorrentes</h2>
        <p className="mt-2 text-gray-500">
          Define despesas recorrentes para simular gastos futuros.
        </p>
      </div>
      <button
        disabled
        className="w-full py-4 bg-gray-100 text-gray-900 font-semibold rounded-xl disabled:opacity-40 active:scale-95 transition"
      >
        Iniciar
      </button>
    </div>
  )
}
