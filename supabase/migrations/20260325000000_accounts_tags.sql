-- ============================================================
-- StayAlive: accounts + transaction_tags migration
-- Run as a single transaction for safe rollback on error
-- ============================================================

BEGIN;

-- 1. Create accounts table
CREATE TABLE accounts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  type                 TEXT NOT NULL CHECK (type IN ('checking', 'credit_card')),
  balance              NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance_updated_at   TIMESTAMPTZ,
  credit_limit         NUMERIC(12,2) CHECK (credit_limit > 0),
  statement_close_day  INTEGER CHECK (statement_close_day BETWEEN 1 AND 31),
  currency             TEXT NOT NULL DEFAULT 'EUR',
  is_default           BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounts: own rows" ON accounts
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX accounts_user_id_idx ON accounts (user_id);
CREATE UNIQUE INDEX accounts_one_default_per_user ON accounts (user_id) WHERE is_default = true;

-- 2. Atomic set_default_account function
CREATE OR REPLACE FUNCTION set_default_account(p_account_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE accounts SET is_default = false WHERE user_id = auth.uid();
  UPDATE accounts SET is_default = true  WHERE id = p_account_id AND user_id = auth.uid();
END;
$$;

-- 3. Create transaction_tags table
CREATE TABLE transaction_tags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

ALTER TABLE transaction_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tags: own rows" ON transaction_tags
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX transaction_tags_user_id_idx ON transaction_tags (user_id);

-- 4. Create transaction_tag_assignments table
CREATE TABLE transaction_tag_assignments (
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  tag_id         UUID NOT NULL REFERENCES transaction_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (transaction_id, tag_id)
);

ALTER TABLE transaction_tag_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tag assignments: own rows" ON transaction_tag_assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_id AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_id AND t.user_id = auth.uid()
    )
  );

CREATE INDEX tag_assignments_transaction_id_idx ON transaction_tag_assignments (transaction_id);

-- 5. Add account_id to transactions
ALTER TABLE transactions
  ADD COLUMN account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT;

-- 6. Migrate existing data: create default checking account per user
INSERT INTO accounts (user_id, name, type, balance, balance_updated_at, is_default)
SELECT id, 'Conta à ordem', 'checking', balance, balance_updated_at, true
FROM profiles;

-- 7. Assign account_id to all existing transactions
UPDATE transactions t
SET account_id = a.id
FROM accounts a
WHERE a.user_id = t.user_id AND a.is_default = true;

-- 8. Remove balance columns from profiles
ALTER TABLE profiles
  DROP COLUMN balance,
  DROP COLUMN balance_updated_at;

COMMIT;
