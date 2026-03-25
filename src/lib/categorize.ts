import type { Database } from './supabase/types'

type CategoryRule = Database['public']['Tables']['category_rules']['Row']

export function categorize(
  description: string,
  rules: CategoryRule[]
): string | null {
  // rules are pre-sorted by priority DESC
  const lower = description.toLowerCase()
  for (const rule of rules) {
    if (lower.includes(rule.keyword.toLowerCase())) {
      return rule.category_id
    }
  }
  return null
}
