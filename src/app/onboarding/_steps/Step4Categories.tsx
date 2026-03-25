'use client'

interface Props {
  onDone: () => void
  onSkip: () => void
}

export default function Step4Categories({ onDone, onSkip }: Props) {
  return (
    <div className="px-6 py-8 flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Personalizar categorias</h2>
        <p className="mt-2 text-gray-500">
          Define as tuas categorias de despesas.
        </p>
      </div>
      <button
        onClick={onSkip}
        className="w-full py-4 bg-gray-100 text-gray-900 font-semibold rounded-xl active:scale-95 transition"
      >
        Saltar este passo
      </button>
    </div>
  )
}
