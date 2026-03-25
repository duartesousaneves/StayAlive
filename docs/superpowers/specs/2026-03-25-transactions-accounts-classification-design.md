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
  credit_limit         NUMERIC(12,2),        -- apenas credit_card
  statement_close_day  INTEGER,              -- dia do mês, apenas credit_card
  currency             TEXT NOT NULL DEFAULT 'EUR',
  is_default           BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounts: own rows" ON accounts
  USING (user_id = auth.uid());
```

**Regra de negócio:** cada utilizador tem exatamente uma conta `is_default = true` (a conta à ordem principal, usada para projeções).

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
  USING (user_id = auth.uid());
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
  USING (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_id AND t.user_id = auth.uid()
    )
  );
```

### Alterações a tabelas existentes

#### `transactions` — adicionar `account_id`

```sql
ALTER TABLE transactions
  ADD COLUMN account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;
```

#### `profiles` — remover campos migrados

```sql
ALTER TABLE profiles
  DROP COLUMN balance,
  DROP COLUMN balance_updated_at;
```

### Migração de dados

```sql
-- 1. Criar conta à ordem default para cada utilizador
INSERT INTO accounts (user_id, name, type, balance, balance_updated_at, is_default)
SELECT id, 'Conta à ordem', 'checking', balance, balance_updated_at, true
FROM profiles;

-- 2. Atribuir account_id às transações existentes
UPDATE transactions t
SET account_id = a.id
FROM accounts a
WHERE a.user_id = t.user_id AND a.is_default = true;

-- 3. Remover colunas de profiles
ALTER TABLE profiles DROP COLUMN balance, DROP COLUMN balance_updated_at;
```

---

## 2. Múltiplas Contas

### UI: Swipe de cartões no dashboard

O topo do dashboard substitui o `BalanceCard` atual por um componente `AccountCarousel`:

- **Cartão conta à ordem:** mostra saldo atual + timestamp de atualização + nome da conta
- **Cartão de crédito:** mostra crédito disponível (`credit_limit - |balance|`) + limite total + nome do cartão
- **Cartão `+`:** abre sheet para adicionar nova conta
- Indicador de posição (dots) por baixo do carrossel
- Swipe horizontal entre cartões (touch + drag no desktop)

### Projeção

A projeção de 30 dias mantém-se ligada à **conta à ordem default** (`is_default = true`). Transações de cartão de crédito não afetam a projeção — são independentes.

### Importação CSV

Ao importar um CSV, o utilizador seleciona a conta de destino (dropdown). O `account_id` é guardado em `user_settings` como preferência para reutilização.

### Ecrã de configuração de contas

Nova secção em `/config`:
- Lista de contas com nome, tipo, saldo/limite
- Editar nome e saldo de cada conta
- Marcar como default (conta à ordem)
- Eliminar conta (com confirmação e aviso se tiver transações)

---

## 3. Edição e Eliminação de Transações

### Trigger: duplo-clique

Qualquer linha em `RecentTransactions` ou `TransactionList` responde a `onDoubleClick` (e `onTouchEnd` com duplo-toque no mobile).

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
- `✓ Guardar` faz `UPSERT` na transação e atualiza `transaction_tag_assignments`
- `🗑 Eliminar` mostra confirmação inline antes de apagar
- Campos obrigatórios: data, montante, descrição
- Montante negativo = despesa, positivo = receita (validado ao guardar)

### Hook: `useTransactionEdit`

```ts
interface UseTransactionEdit {
  open: (transaction: Transaction) => void
  close: () => void
  save: (data: TransactionFormData) => Promise<void>
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

Ao carregar transações, corre o motor de categorização existente (`lib/categorize.ts`) sobre as transações sem `category_id`. O resultado é exibido como sugestão não-confirmada (`suggested_category_id` calculado em memória, não persistido).

Ao aceitar a sugestão (click na pill âmbar):
1. Atualiza `transactions.category_id`
2. Verifica se já existe uma `category_rule` para o keyword — se não existir, cria

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
| `useProfile.ts` | Substituído por `useAccounts.ts` |
| `RecentTransactions.tsx` | Adicionar pills de categoria/tags + `onDoubleClick` |
| `TransactionList.tsx` | Idem |
| `CSVImportSheet.tsx` | Adicionar seletor de conta destino |
| `config/page.tsx` | Novas secções: gestão de contas e categorias |
| `lib/projection.ts` | Receber `account` em vez de ler `profile.balance` |
| `lib/supabase/types.ts` | Regenerar com `supabase gen types` |

### Componentes novos

| Componente | Responsabilidade |
|---|---|
| `AccountCarousel.tsx` | Swipe de cartões de conta |
| `AccountCard.tsx` | Cartão individual (checking / credit_card) |
| `TransactionEditModal.tsx` | Modal de edição completa |
| `CategoryPill.tsx` | Pill reutilizável categoria/tag/sugestão |
| `TagInput.tsx` | Input com autocomplete para tags |
| `useTransactionEdit.ts` | Estado e operações do modal |
| `useAccounts.ts` | CRUD de contas |
| `useTransactionTags.ts` | CRUD de tags e associações |

---

## 6. Fora de Âmbito (este sprint)

- Integração da fatura do cartão de crédito na projeção
- Dashboard de análise por categoria
- Notificações
- Deduplicação de transações no re-import
- ML/embeddings para categorização

---

## 7. Ordem de Implementação Sugerida

1. **Migração DB** — criar tabelas, migrar dados, regenerar tipos
2. **useAccounts + AccountCarousel** — substituir BalanceCard, garantir que dashboard funciona
3. **TransactionEditModal** — duplo-clique funcional em ambas as listas
4. **CategoryPill + visibilidade** — mostrar categorias/tags em todas as listas
5. **Sugestão automática** — integrar categorize.ts no fluxo de display
6. **Tags livres** — TagInput + transaction_tag_assignments
7. **Config expandido** — gestão de contas + categorias/regras
8. **CSV import multi-conta** — seletor de conta no CSVImportSheet
