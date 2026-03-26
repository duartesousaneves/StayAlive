import { describe, it, expect } from 'vitest'
import { filterItemsByAccount } from './filterItemsByAccount'

const item = (account_id: string | null) => ({ account_id })

const defaultAccount = { id: 'acc-1', is_default: true }
const otherAccount = { id: 'acc-2', is_default: false }

describe('filterItemsByAccount', () => {
  it('returns all items when account is null', () => {
    const items = [item('acc-1'), item('acc-2'), item(null)]
    expect(filterItemsByAccount(items, null)).toEqual(items)
  })

  it('includes items assigned to the selected account', () => {
    const items = [item('acc-1'), item('acc-2'), item(null)]
    const result = filterItemsByAccount(items, defaultAccount)
    expect(result).toContainEqual(item('acc-1'))
  })

  it('excludes items assigned to a different account', () => {
    const items = [item('acc-1'), item('acc-2'), item(null)]
    const result = filterItemsByAccount(items, defaultAccount)
    expect(result).not.toContainEqual(item('acc-2'))
  })

  it('includes null-account items when selected account is default', () => {
    const items = [item('acc-1'), item('acc-2'), item(null)]
    const result = filterItemsByAccount(items, defaultAccount)
    expect(result).toContainEqual(item(null))
  })

  it('excludes null-account items when selected account is NOT default', () => {
    const items = [item('acc-1'), item('acc-2'), item(null)]
    const result = filterItemsByAccount(items, otherAccount)
    expect(result).not.toContainEqual(item(null))
  })

  it('returns empty array when no items match', () => {
    const items = [item('acc-2'), item(null)]
    const result = filterItemsByAccount(items, otherAccount)
    expect(result).toEqual([item('acc-2')])
  })
})
