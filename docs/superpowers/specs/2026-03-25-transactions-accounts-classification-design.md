# Design Spec: Edição de Transações, Múltiplas Contas e Classificação

**Data:** 2026-03-25
**Estado:** Aprovado
**Projeto:** StayAlive — `C:/Dev/projects/StayAlive`

---

## Âmbito

Três funcionalidades interligadas que evoluem a app de um tracker de conta única para uma plataforma multi-conta com classificação rica:

1. **Edição e eliminação de transações** — modal de duplo-clique com edição completa
2. **Múltiplas contas** — conta à ordem + cartão de crédito como entidades de primeira classe
3. **Classificação de transações** — categorias e tags visíveis, editáveis e com sugestão automática

---

## 1. Base de Dados

### Abordagem: Accounts-first

Criar uma tabela `accounts` explícita. O campo `balance` e `balance_updated_at` migram de `profiles` para `accounts`. Todas as transações passam a ter `account_id`.

### Novas tabelas

#### `accounts`

```sql
CREATE TABLE accounts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  type                 TEXT NOT NULL CHECK (type IN ('checking', 'credit_card')),
  balance              NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance_updated_at   TIMESTAMPTZ,
  credit_limit         NUMERIC(12,2) CHECK (credit_limit > 0),        -- apenas credit_card
  statement_close_day  INTEGER CHECK (statement_close_day BETWEEN 1 AND 31), -- dia do mês, apenas credit_card
  currency             TEXT NOT NULL DEFAULT 'EUR',
  is_default           BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounts: own rows" ON accounts
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Índices
CREATE INDEX accounts_user_id_idx ON accounts (user_id);

-- Garante exatamente um is_default por utilizador (enforcement em DB)
CREATE UNIQUE INDEX accounts_one_default_per_user ON accounts (user_id) WHERE is_default = true;
```

**Regra de negócio:** cada utilizador tem exatamente uma conta `is_default = true` (a conta à ordem principal, usada para projeções). O índice único parcial acima impõe esta invariante ao nível da base de dados. Em `useAccounts`, ao marcar uma conta como default, a operação deve ser atómica — dois `.update()` sequenciais do cliente Supabase não são atómicos. Implementar via função Postgres chamada por RPC:

```sql
CREATE OR REPLACE FUNCTION set_default_account(p_account_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE accounts SET is_default = false WHERE user_id = auth.uid();
  UPDATE accounts SET is_default = true  WHERE id = p_account_id AND user_id = auth.uid();
END;
$$;
```

Chamada no hook: `supabase.rpc('set_default_account', { p_account_id: id })`

#### `transaction_tags`

```sql
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
```

#### `transaction_tag_assignments`

```sql
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
```

### Alterações a tabelas existentes

#### `transactions` — adicionar `account_id`

```sql
ALTER TABLE transactions
  ADD COLUMN account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT;
```

**Nota:** `ON DELETE RESTRICT` impede eliminar uma conta que ainda tem transações — o utilizador deve primeiro reatribuir ou apagar as transações. A UI em `/config` deve mostrar o número de transações antes de permitir eliminar uma conta.

### Script de migração completo

O script é executado numa única transação para garantir rollback seguro em caso de erro:

```sql
BEGIN;

-- 1. Criar conta à ordem default para cada utilizador existente
INSERT INTO accounts (user_id, name, type, balance, balance_updated_at, is_default)
SELECT id, 'Conta à ordem', 'checking', balance, balance_updated_at, true
FROM profiles;

-- 2. Atribuir account_id a todas as transações existentes
UPDATE transactions t
SET account_id = a.id
FROM accounts a
WHERE a.user_id = t.user_id AND a.is_default = true;

-- 3. Remover colunas migradas de profiles
ALTER TABLE profiles
  DROP COLUMN balance,
  DROP COLUMN balance_updated_at;

COMMIT;
```

**Janela de migração:** durante o deploy, há um momento em que o código antigo ainda escreve em `profiles.balance` (onboarding Step1). Dado que o projeto é single-developer e não tem requisitos de zero-downtime, a abordagem recomendada é: fazer o deploy do novo código (que lê de `accounts`) e o script de migração em simultâneo. O onboarding Step1 é atualizado neste mesmo PR para escrever em `accounts` em vez de `profiles`.

---

## 2. Múltiplas Contas

### UI: Swipe de cartões no dashboard

O topo do dashboard substitui o `BalanceCard` atual por um componente `AccountCarousel`:

- **Cartão conta à ordem:** mostra saldo atual + timestamp de atualização + nome da conta
- **Cartão de crédito:** mostra crédito disponível (`credit_limit - |balance|`) + limite total + nome do cartão
- **Cartão `+`:** abre `AccountFormSheet` para adicionar nova conta
- Indicador de posição (dots) por baixo do carrossel
- Swipe horizontal entre cartões (touch + drag no desktop, via `onTouchStart`/`onTouchEnd` com cálculo de delta)

### Projeção

A projeção de 30 dias mantém-se ligada à **conta à ordem default** (`is_default = true`). Transações de cartão de crédito não afetam a projeção — são independentes. `useProjection` recebe `account.balance` (da conta default) em vez de `profile.balance`.

### Importação CSV

Ao importar um CSV, o utilizador seleciona a conta de destino (dropdown). O `account_id` é guardado em `user_settings` como preferência para reutilização.

### Ecrã de configuração de contas

Nova secção em `/config`:
- Lista de contas com nome, tipo, saldo/limite e número de transações
- Editar nome e saldo de cada conta
- Marcar como default (conta à ordem) — atualiza `is_default` atomicamente
- Eliminar conta: só permitido se `COUNT(transactions WHERE account_id = id) = 0`; caso contrário, mostrar bloqueio com número de transações

---

## 3. Edição e Eliminação de Transações

### Trigger: duplo-clique

Qualquer linha em `RecentTransactions` ou `TransactionList` responde a `onDoubleClick` no desktop. No mobile (iOS Safari não dispara `dblclick` em elementos não-input), implementar com `onTouchEnd` manual:

```ts
// Padrão a seguir em cada linha de transação
const lastTap = useRef<number>(0)
const handleTouchEnd = () => {
  const now = Date.now()
  if (now - lastTap.current < 300) onDoubleClick()
  lastTap.current = now
}
```

### Tipos de dados do formulário

```ts
interface TransactionFormData {
  date: string          // ISO 8601: "2025-03-15"
  amount: number        // positivo = receita, negativo = despesa
  description: string
  account_id: string | null
  category_id: string | null
  tag_ids: string[]     // UUIDs de transaction_tags
}
```

### Modal de edição

Componente `TransactionEditModal`:

```
┌─────────────────────────────────┐
│  Editar transação             ✕ │
├─────────────────────────────────┤
│  DATA          │  MONTANTE      │
│  [15 mar 2025] │  [-€42,50]     │
├─────────────────────────────────┤
│  DESCRIÇÃO                      │
│  [CONTINENTE MODELO LX        ] │
├─────────────────────────────────┤
│  CONTA                          │
│  [Conta CGD ▼                 ] │
├─────────────────────────────────┤
│  CATEGORIA                      │
│  [🛒 Supermercado ▼           ] │
├─────────────────────────────────┤
│  TAGS                           │
│  [férias ✕] [trabalho ✕] [+ ]   │
├─────────────────────────────────┤
│  [🗑 Eliminar]   [✓ Guardar]    │
└─────────────────────────────────┘
```

**Comportamento:**
- Overlay escuro (`bg-black/60`) fecha o modal ao clicar fora
- `✕` cancela sem guardar
- `✓ Guardar` faz `UPDATE` na transação (nunca INSERT — a transação já existe) e sincroniza `transaction_tag_assignments` (apaga as antigas, insere as novas)
- `🗑 Eliminar` mostra confirmação inline antes de apagar
- Campos obrigatórios: data, montante, descrição
- Montante negativo = despesa, positivo = receita (validado ao guardar)

### Hook: `useTransactionEdit`

```ts
interface UseTransactionEdit {
  open: (transaction: Transaction) => void
  close: () => void
  save: (data: TransactionFormData) => Promise<void>  // UPDATE, nunca UPSERT
  remove: (id: string) => Promise<void>
  state: { isOpen: boolean; transaction: Transaction | null; saving: boolean }
}
```

---

## 4. Classificação de Transações

### Visibilidade nas listas

Cada linha de transação exibe:
- **Categoria** como pill colorida com emoji + nome (ex: `🛒 Supermercado`)
- **Tags** como pills azuis (ex: `férias`)
- Transação sem categoria: pill cinzenta `sem categoria` + sugestão automática a âmbar se existir match de keyword

### Sugestão automática

Ao carregar transações, corre o motor de categorização existente (`lib/categorize.ts`) sobre as transações sem `category_id`. O resultado é exibido como sugestão não-confirmada (calculada em memória via `useMemo`, não persistida).

Ao aceitar a sugestão (click na pill âmbar):
1. Atualiza `transactions.category_id`
2. Extrai uma keyword da descrição: pega a primeira palavra com mais de 3 caracteres que não seja uma data ou número (ex: `"CONTINENTE MODELO LX 14-03"` → keyword `"CONTINENTE"`). Verifica se já existe uma `category_rule` com esse keyword para essa categoria. Se não existir, cria com `priority = 1`. O utilizador pode editar/remover estas regras auto-criadas em `/config`.

### Inline category assignment

No popup de edição (campo CATEGORIA):
- Dropdown com todas as categorias do utilizador
- Opção `+ Nova categoria` abre sub-form inline (nome + emoji + cor)

### Tags livres

- Campo TAGS no popup de edição
- Input com autocomplete das tags existentes do utilizador
- Enter ou vírgula cria nova tag (se não existir, cria em `transaction_tags`)
- Pill com `✕` remove a associação

### Config: gestão de categorias e regras

Secção existente em `/config` é expandida:
- Lista de categorias com emoji, nome, cor
- Por categoria: lista de keywords (regras) editáveis
- Adicionar / remover categorias e regras

---

## 5. Componentes Afetados

| Componente / Hook | Alteração |
|---|---|
| `BalanceCard.tsx` | Substituído por `AccountCarousel.tsx` |
| `useProfile.ts` | Substituído por `useAccounts.ts` (balance lido de accounts) |
| `useProjection.ts` | Receber `account.balance` em vez de `profile.balance` |
| `useTransactions.ts` | `insertTransactions` aceita `account_id` obrigatório |
| `RecentTransactions.tsx` | Adicionar pills de categoria/tags + `onDoubleClick` / duplo-toque |
| `TransactionList.tsx` | Idem |
| `MonthSummary.tsx` | Continua a somar todas as contas — adicionar nota visual "todas as contas" |
| `CSVImportSheet.tsx` | Adicionar seletor de conta destino |
| `config/page.tsx` | Secção de edição de saldo migra para `useAccounts`; novas secções: contas e categorias |
| `dashboard/page.tsx` | Usar `useAccounts` em vez de `useProfile` para passar balance à projeção |
| `onboarding/page.tsx` | Criar conta à ordem em `accounts` em vez de escrever em `profiles.balance` |
| `onboarding/_steps/Step1Balance.tsx` | Escrever saldo inicial em `accounts` (conta default criada no passo de conclusão do onboarding) |
| `lib/projection.ts` | Receber `balance: number` explícito em vez de ler de profile |
| `lib/supabase/types.ts` | Regenerar com `supabase gen types typescript` |

### Componentes novos

| Componente | Responsabilidade |
|---|---|
| `AccountCarousel.tsx` | Swipe de cartões de conta com dots de posição |
| `AccountCard.tsx` | Cartão individual (checking mostra saldo; credit_card mostra disponível/limite) |
| `AccountFormSheet.tsx` | Sheet para criar/editar conta (nome, tipo, saldo inicial, limite, dia de fecho) |
| `TransactionEditModal.tsx` | Modal de edição completa de transação |
| `CategoryPill.tsx` | Pill reutilizável: categoria / tag / sugestão (variantes visuais por prop) |
| `TagInput.tsx` | Input com autocomplete para adicionar/remover tags |
| `useTransactionEdit.ts` | Estado e operações do modal de edição |
| `useAccounts.ts` | CRUD de contas + lógica de default atómica |
| `useTransactionTags.ts` | CRUD de tags e gestão de `transaction_tag_assignments` |

---

## 6. Fora de Âmbito (este sprint)

- Integração da fatura do cartão de crédito na projeção
- Dashboard de análise por categoria
- Notificações
- Deduplicação de transações no re-import
- ML/embeddings para categorização
- Filtro `?filter=uncategorized` na página de transações

---

## 7. Ordem de Implementação Sugerida

1. **Migração DB** — criar tabelas + índices, script de migração em transação, regenerar tipos
2. **useAccounts + AccountCarousel** — substituir BalanceCard + Step1Balance + config balance
3. **useProjection + dashboard** — ligar projeção à conta default de `useAccounts`
4. **TransactionEditModal + useTransactionEdit** — duplo-clique funcional em ambas as listas
5. **CategoryPill + visibilidade** — mostrar categorias/tags em todas as listas
6. **Sugestão automática** — integrar `categorize.ts` no fluxo de display + aceitar sugestão cria rule
7. **Tags livres** — TagInput + `useTransactionTags` + `transaction_tag_assignments`
8. **Config expandido** — gestão de contas (`AccountFormSheet`) + categorias/regras
9. **CSV import multi-conta** — seletor de conta no `CSVImportSheet`
