'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

export type TransactionTag = Database['public']['Tables']['transaction_tags']['Row']

export function useTransactionTags() {
  const [tags, setTags] = useState<TransactionTag[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchTags() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('transaction_tags')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true })
    setTags((data as unknown as TransactionTag[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchTags() }, [])

  async function createTag(name: string, color = '#3b82f6'): Promise<TransactionTag | null> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await (supabase.from('transaction_tags') as any)
      .insert({ user_id: user.id, name: name.trim(), color })
      .select()
      .single()
    await fetchTags()
    return data as TransactionTag | null
  }

  async function getOrCreateTag(name: string): Promise<TransactionTag | null> {
    const existing = tags.find(t => t.name.toLowerCase() === name.trim().toLowerCase())
    if (existing) return existing
    return createTag(name)
  }

  async function getAssignedTagIds(transactionId: string): Promise<string[]> {
    const supabase = createClient()
    const { data } = await (supabase.from('transaction_tag_assignments') as any)
      .select('tag_id')
      .eq('transaction_id', transactionId)
    return ((data as any[]) ?? []).map((r: any) => r.tag_id as string)
  }

  return { tags, loading, createTag, getOrCreateTag, getAssignedTagIds, refetch: fetchTags }
}
