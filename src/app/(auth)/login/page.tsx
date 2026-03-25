'use client'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()

  async function handleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-6 bg-white">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">StayAlive</h1>
        <p className="mt-2 text-gray-500">Controla o teu dinheiro com confiança</p>
      </div>
      <button
        onClick={handleLogin}
        className="w-full max-w-xs flex items-center justify-center gap-3 py-3 px-6 rounded-xl bg-blue-600 text-white font-semibold text-base shadow hover:bg-blue-700 active:scale-95 transition"
      >
        Entrar com Google
      </button>
    </div>
  )
}
