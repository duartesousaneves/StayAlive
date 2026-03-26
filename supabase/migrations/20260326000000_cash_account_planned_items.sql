-- ============================================================
-- StayAlive: cash account type + planned_items + recurring category
-- Run as a single transaction for safe rollback on error
-- ============================================================

BEGIN;

-- 1. Extend accounts.type to include 'cash'
-- Drop the auto-generated check constraint and recreate it with 'cash' included
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'accounts'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%checking%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE accounts DROP CONSTRAINT %I', constraint_name);
  END IF;
END;
$$;

ALTER TABLE accounts
  ADD CONSTRAINT accounts_type_check CHECK (type IN ('checking', 'credit_card', 'cash'));

-- 2. Add category_id to recurring_items
ALTER TABLE recurring_items
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- 3. Create planned_items table (one-time future expenses/income)
CREATE TABLE IF NOT EXISTS planned_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  amount       NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  type         TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  planned_date DATE NOT NULL,
  category_id  UUID REFERENCES categories(id) ON DELETE SET NULL,
  notes        TEXT,
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE planned_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "planned_items: own rows" ON planned_items
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX planned_items_user_date_idx ON planned_items (user_id, planned_date);

COMMIT;
