'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin() {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
    if (error) {
      setError('Erro ao iniciar sessão. Tenta novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-6 bg-white">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">StayAlive</h1>
        <p className="mt-2 text-gray-500">Controla o teu dinheiro com confiança</p>
      </div>
      <button
        onClick={handleLogin}
        disabled={loading}
        className="w-full max-w-xs flex items-center justify-center gap-3 py-3 px-6 rounded-xl bg-blue-600 text-white font-semibold text-base shadow hover:bg-blue-700 active:scale-95 transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? 'A entrar...' : 'Entrar com Google'}
      </button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
