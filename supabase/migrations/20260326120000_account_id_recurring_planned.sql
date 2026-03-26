BEGIN;

ALTER TABLE recurring_items
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

ALTER TABLE planned_items
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS recurring_items_account_id_idx ON recurring_items (account_id);
CREATE INDEX IF NOT EXISTS planned_items_account_id_idx ON planned_items (account_id);

COMMIT;
