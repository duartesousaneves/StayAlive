'use client'

interface Props {
  value: string
  onChange: (val: string) => void
  onNext: () => void
}

export default function Step1Balance({ value, onChange, onNext }: Props) {
  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    // Allow digits, comma, dot, minus
    const v = e.target.value.replace(/[^0-9,.\-]/g, '')
    onChange(v)
  }

  // Reject if more than one decimal separator exists
  const hasMultipleDecimals = (value.match(/[.,]/g) ?? []).length > 1
  const numericValue = parseFloat(value.replace(',', '.'))
  const valid = !isNaN(numericValue) && !hasMultipleDecimals

  return (
    <div className="px-6 py-8 flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Qual é o teu saldo atual?</h2>
        <p className="mt-2 text-gray-500">
          Introduz o saldo atual da tua conta. Podes atualizar a qualquer momento.
        </p>
      </div>

      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">€</span>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleInput}
          placeholder="0,00"
          className="w-full pl-10 pr-4 py-4 text-2xl border-2 border-gray-200 rounded-xl focus:border-blue-600 focus:outline-none"
          autoFocus
        />
      </div>

      {value && !valid && (
        <p className="text-red-600 text-sm">Valor inválido</p>
      )}

      <button
        onClick={onNext}
        disabled={!valid}
        className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl disabled:opacity-40 active:scale-95 transition"
      >
        Continuar
      </button>
    </div>
  )
}
