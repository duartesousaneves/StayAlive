'use client'

interface Props {
  onParsed: (headers: string[], rows: Record<string, string>[]) => void
  onSkip: () => void
}

export default function Step2CSV({ onParsed, onSkip }: Props) {
  return (
    <div className="px-6 py-8 flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Importar histórico de transações</h2>
        <p className="mt-2 text-gray-500">
          Carrega um ficheiro CSV com o teu histórico bancário.
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
