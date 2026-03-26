'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ContaPage() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <div className="pt-4 pb-6 flex flex-col gap-6">
      <div className="px-4 flex items-center gap-3">
        <Link href="/config" className="text-blue-600 flex items-center gap-1 text-sm">
          ‹ Configurações
        </Link>
      </div>
      <h1 className="text-xl font-bold text-gray-900 px-4">Conta</h1>

      <section className="px-4">
        <div className="bg-white rounded-2xl shadow-sm">
          <button
            onClick={handleSignOut}
            className="w-full text-left px-4 py-4 text-red-500 font-medium text-sm"
          >
            Terminar sessão
          </button>
        </div>
      </section>
    </div>
  )
}
