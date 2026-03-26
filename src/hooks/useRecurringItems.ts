'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

export type RecurringItem = Database['public']['Tables']['recurring_items']['Row']
type InsertItem = Database['public']['Tables']['recurring_items']['Insert']

export function useRecurringItems() {
  const [items, setItems] = useState<RecurringItem[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchItems() {
    const supabase = createClient()
    const result = await supabase
      .from('recurring_items')
      .select('*')
      .eq('active', true)
      .order('name')
    setItems(((result as unknown as { data: RecurringItem[] | null }).data ?? []))
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [])

  async function addItem(item: Omit<InsertItem, 'user_id'>) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await (supabase.from('recurring_items') as any)
      .insert({ ...item, user_id: user.id })
    await fetchItems()
  }

  async function updateItem(id: string, item: Omit<InsertItem, 'user_id'>) {
    const supabase = createClient()
    await (supabase.from('recurring_items') as any)
      .update(item)
      .eq('id', id)
    await fetchItems()
  }

  async function removeItem(id: string) {
    const supabase = createClient()
    await (supabase.from('recurring_items') as any)
      .update({ active: false })
      .eq('id', id)
    await fetchItems()
  }

  return { items, loading, addItem, updateItem, removeItem, refetch: fetchItems }
}
