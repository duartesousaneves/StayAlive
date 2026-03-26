'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

type PlannedItem = Database['public']['Tables']['planned_items']['Row']
type PlannedItemInsert = Database['public']['Tables']['planned_items']['Insert']

export type { PlannedItem }

export function usePlannedItems() {
  const [items, setItems] = useState<PlannedItem[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchItems() {
    const supabase = createClient()
    const result = await supabase
      .from('planned_items')
      .select('*')
      .eq('active', true)
      .order('planned_date', { ascending: true })
    setItems(((result as unknown as { data: PlannedItem[] | null }).data ?? []))
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [])

  async function addItem(item: Omit<PlannedItemInsert, 'user_id'>) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await (supabase.from('planned_items') as any)
      .insert({ ...item, user_id: user.id })
    await fetchItems()
  }

  async function removeItem(id: string) {
    const supabase = createClient()
    await (supabase.from('planned_items') as any)
      .update({ active: false })
      .eq('id', id)
    await fetchItems()
  }

  return { items, loading, addItem, removeItem, refetch: fetchItems }
}
