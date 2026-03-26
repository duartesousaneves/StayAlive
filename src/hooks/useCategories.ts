'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

type Category = Database['public']['Tables']['categories']['Row']
type CategoryInsert = Database['public']['Tables']['categories']['Insert']
type CategoryRule = Database['public']['Tables']['category_rules']['Row']

export type { Category, CategoryRule }

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

  async function addCategory(data: Omit<CategoryInsert, 'user_id'>): Promise<void> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await (supabase.from('categories') as any).insert({ ...data, user_id: user.id })
    await fetchData()
  }

  async function updateCategory(id: string, data: Partial<Pick<Category, 'name' | 'icon' | 'type' | 'color'>>): Promise<void> {
    const supabase = createClient()
    await (supabase.from('categories') as any).update(data).eq('id', id)
    await fetchData()
  }

  async function deleteCategory(id: string): Promise<void> {
    const supabase = createClient()
    await (supabase.from('categories') as any).delete().eq('id', id)
    await fetchData()
  }

  return { categories, rules, loading, refetch: fetchData, addCategory, updateCategory, deleteCategory }
}
