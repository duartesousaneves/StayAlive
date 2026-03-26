interface ItemWithAccount {
  account_id: string | null
}

interface AccountRef {
  id: string
  is_default: boolean
}

export function filterItemsByAccount<T extends ItemWithAccount>(
  items: T[],
  account: AccountRef | null
): T[] {
  if (!account) return items
  return items.filter(
    item =>
      item.account_id === account.id ||
      (item.account_id === null && account.is_default)
  )
}
