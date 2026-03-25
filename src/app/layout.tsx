import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ConditionalNav from '@/components/ConditionalNav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'StayAlive',
  description: 'Controla o teu dinheiro com confiança',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body className={`${inter.className} bg-gray-50`}>
        <main className="max-w-md mx-auto min-h-screen pb-20">
          {children}
        </main>
        <ConditionalNav />
      </body>
    </html>
  )
}
