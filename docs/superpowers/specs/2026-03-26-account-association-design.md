# Design: Account Association for Recurring & Planned Items

**Date:** 2026-03-26
**Status:** Approved

## Summary

Add an optional `account_id` field to `recurring_items` and `planned_items` so users can associate each item with a specific account (checking, credit card, or cash). The 30-day projection on the dashboard becomes per-account, driven by the account selected in the existing `AccountCarousel`.

## Requirements

- `account_id` is optional on both tables. Items without an account are treated as belonging to the default account for projection purposes.
- If an account is deleted, the item's `account_id` is set to `NULL` (not cascade-deleted).
- The projection chart updates when the user scrolls/selects a different account in the carousel.
- Items without an account appear in the projection of whichever account has `is_default = true`.

## Architecture

### 1. Database Migration

New file: `supabase/migrations/YYYYMMDD_account_id_recurring_planned.sql`

```sql
ALTER TABLE recurring_items
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

ALTER TABLE planned_items
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;
```

### 2. Types (`src/lib/supabase/types.ts`)

Add `account_id: string | null` to `Row`, `Insert`, and `Update` for both `recurring_items` and `planned_items`.

### 3. Forms

**`RecurringItemForm`** and **`PlannedItemForm`**:
- New prop: `accounts: Account[]`
- New `<select>` field with option "Sem conta específica" (value `""`) followed by each account
- `RecurringFormData` and `PlannedFormData` gain `account_id: string | null`

### 4. Config Pages

**`/config/recorrentes`** and **`/config/futuros`**:
- Import `useAccounts` and pass `accounts` to the forms
- Include `account_id` in `handleEdit` payload
- Display account name in the item metadata line:
  `Mensal · dia 1 · Despesa · Habitação · Conta à Ordem`

### 5. Dashboard & Projection

**`AccountCarousel`**:
- New props: `selectedAccountId: string | null`, `onSelectAccount: (account: Account) => void`
- Selected card is visually highlighted (existing `card-active` style)

**`Dashboard`**:
- New state: `selectedAccount` (initialized to `defaultAccount` on load)
- Passes `onSelectAccount` to `AccountCarousel`
- Filters items before calling `useProjection`:
  - Include if `item.account_id === selectedAccount.id`
  - Include if `item.account_id === null && selectedAccount.is_default`
  - Exclude otherwise

**`useProjection`**, **`projection.ts`**, **`AlertBanner`**, **`ProjectionChart`**: no changes.

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/…_account_id_recurring_planned.sql` | New migration |
| `src/lib/supabase/types.ts` | Add `account_id` to recurring_items and planned_items |
| `src/components/RecurringItemForm.tsx` | Add `accounts` prop + account select |
| `src/components/PlannedItemForm.tsx` | Add `accounts` prop + account select |
| `src/app/config/recorrentes/page.tsx` | Pass accounts to form, show account name in list |
| `src/app/config/futuros/page.tsx` | Pass accounts to form, show account name in list |
| `src/components/AccountCarousel.tsx` | Add `selectedAccountId` + `onSelectAccount` props |
| `src/app/dashboard/page.tsx` | `selectedAccount` state + item filtering |

## Out of Scope

- Projection logic (`projection.ts`) — no changes
- `useProjection` / `useRecurringItems` / `usePlannedItems` hooks — no changes
- Onboarding flow — no changes
