'use client'
import { usePathname } from 'next/navigation'
import BottomNav from './BottomNav'

const HIDE_NAV_PATHS = ['/login', '/onboarding']

export default function ConditionalNav() {
  const path = usePathname()
  if (HIDE_NAV_PATHS.some(p => path.startsWith(p))) return null
  return <BottomNav />
}
