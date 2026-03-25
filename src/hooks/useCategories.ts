'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

type Category = Database['public']['Tables']['categories']['Row']
type CategoryRule = Database['public']['Tables']['category_rules']['Row']

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [rules, setRules] = useState<CategoryRule[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const [catsResult, rlsResult] = await Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('category_rules').select('*').order('priority', { ascending: false }),
    ])
    setCategories(((catsResult as unknown as { data: Category[] | null }).data ?? []))
    setRules(((rlsResult as unknown as { data: CategoryRule[] | null }).data ?? []))
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  return { categories, rules, loading, refetch: fetchData }
}
