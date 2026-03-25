'use client'
import { useState, useEffect } from 'react'
import Step1Balance from './_steps/Step1Balance'
import Step2CSV from './_steps/Step2CSV'
import Step3Mapping from './_steps/Step3Mapping'
import Step4Categories from './_steps/Step4Categories'
import Step5Recurring from './_steps/Step5Recurring'
import { type ColumnMapping } from '@/lib/csv'

const STEPS = 5

export interface WizardState {
  balance: string
  csvHeaders: string[]
  csvRows: Record<string, string>[]
  mapping: ColumnMapping | null
  categoriesReady: boolean
}

const STORAGE_KEY = 'stayalive_onboarding'

function loadState(): Partial<WizardState> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [state, setState] = useState<WizardState>({
    balance: '',
    csvHeaders: [],
    csvRows: [],
    mapping: null,
    categoriesReady: false,
  })

  useEffect(() => {
    const saved = loadState()
    if (Object.keys(saved).length > 0) setState(s => ({ ...s, ...saved }))
  }, [])

  function save(patch: Partial<WizardState>) {
    setState(s => {
      const next = { ...s, ...patch }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  const progress = Math.round((step / STEPS) * 100)

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Progress bar */}
      <div className="w-full h-1 bg-gray-100">
        <div
          className="h-1 bg-blue-600 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="text-sm text-gray-500">Passo {step} de {STEPS}</span>
        {step > 1 && (
          <button onClick={() => setStep(s => s - 1)} className="text-sm text-blue-600">
            ← Voltar
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {step === 1 && (
          <Step1Balance
            value={state.balance}
            onChange={balance => save({ balance })}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <Step2CSV
            onParsed={(headers, rows) => { save({ csvHeaders: headers, csvRows: rows }); setStep(3) }}
            onSkip={() => setStep(4)}
          />
        )}
        {step === 3 && (
          <Step3Mapping
            headers={state.csvHeaders}
            rows={state.csvRows}
            savedMapping={state.mapping}
            onDone={mapping => { save({ mapping }); setStep(4) }}
            onSkip={() => setStep(4)}
          />
        )}
        {step === 4 && (
          <Step4Categories
            onDone={() => { save({ categoriesReady: true }); setStep(5) }}
            onSkip={() => setStep(5)}
          />
        )}
        {step === 5 && (
          <Step5Recurring
            wizardState={state}
          />
        )}
      </div>
    </div>
  )
}
