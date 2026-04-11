# StayAlive — System Documentation

## Objetivo

App de finanças pessoais mobile-first que responde à pergunta crítica: **"Se gastar X hoje, fico a negativo antes do próximo salário?"**

Combina tracking de transações, projeções diárias de saldo, e simulação de gastos. Interface em Português de Portugal.

---

## Arquitetura

**Stack:**
- Next.js 14.2 + App Router
- React 18 + TypeScript
- Tailwind CSS 3
- Supabase (Auth + PostgreSQL + RLS)
- Recharts (gráficos)
- PapaParse (CSV)
- Vitest (testes unitários)

**Padrões chave:**
- Server/Client Component split — auth no servidor, dashboards client-side
- Custom React hooks para data fetching e state
- RLS policies em todas as tabelas (isolamento por utilizador automático)
- Soft deletes via `active: boolean`
- Atualizações otimistas com refetch fallback

**Supabase Client Bridge:**
- `lib/supabase/client.ts` — browser
- `lib/supabase/server.ts` — SSR

---

## Routing

| Route | Propósito |
|---|---|
| `/` | Redirect → `/login` ou `/dashboard` |
| `/(auth)/login` | Google OAuth entry point |
| `/auth/callback` | OAuth exchange handler |
| `/onboarding` | Wizard 5 passos |
| `/dashboard` | App principal |
| `/simulator/*` | Adicionar transações, recorrentes, planeados, pagamentos |
| `/config/*` | Configurações (contas, categorias, perfil) |
| `/transactions` | Lista de transações |

**Middleware:** `src/middleware.ts` — protege todas as rotas; redireciona não-autenticados para `/login`.

---

## Schema Supabase

### `profiles`
| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | refs `auth.users(id) ON DELETE CASCADE` |
| `currency` | text | default 'EUR' |
| `onboarding_completed` | boolean | default false |
| `created_at` | timestamptz | |

**Trigger:** `on_auth_user_created` → cria perfil automaticamente no signup.

---

### `accounts`
| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK | refs `auth.users(id)` |
| `name` | text | |
| `type` | text CHECK | 'checking' \| 'credit_card' \| 'cash' |
| `balance` | NUMERIC(12,2) | |
| `balance_updated_at` | timestamptz | nullable |
| `credit_limit` | NUMERIC(12,2) | nullable, CHECK > 0 |
| `statement_close_day` | int | nullable, CHECK 1-31 |
| `currency` | text | default 'EUR' |
| `is_default` | boolean | default false, UNIQUE por utilizador |
| `created_at` | timestamptz | |

---

### `categories`
| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK | refs `profiles(id)` |
| `name` | text | |
| `type` | text CHECK | 'expense' \| 'income' |
| `color` | text | default '#6b7280' |
| `icon` | text | default '📂' |

---

### `category_rules`
| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK | refs `profiles(id)` |
| `keyword` | text | |
| `category_id` | UUID FK | refs `categories(id) ON DELETE CASCADE` |
| `priority` | int | default 0 (maior = match primeiro) |

---

### `transactions`
| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK | refs `profiles(id)` |
| `date` | date | |
| `description` | text | |
| `amount` | numeric | negativo = despesa, positivo = receita |
| `account_id` | UUID FK | nullable, refs `accounts(id) ON DELETE RESTRICT` |
| `category_id` | UUID FK | nullable, refs `categories(id) ON DELETE SET NULL` |
| `source` | text CHECK | 'csv' \| 'manual' |
| `created_at` | timestamptz | |

**Index:** `(user_id, date DESC)`

---

### `recurring_items`
| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK | refs `profiles(id)` |
| `name` | text | |
| `amount` | numeric CHECK | > 0 |
| `type` | text CHECK | 'expense' \| 'income' |
| `frequency` | text CHECK | 'monthly' \| 'weekly' \| 'quinzenal' \| 'yearly' |
| `day_of_month` | int | nullable |
| `day_of_week` | int | nullable |
| `next_date` | date | |
| `active` | boolean | default true |
| `category_id` | UUID FK | nullable |
| `account_id` | UUID FK | nullable |
| `start_date` / `end_date` | date | nullable |

---

### `planned_items`
| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK | refs `auth.users(id)` |
| `name` | text | |
| `amount` | numeric CHECK | > 0 |
| `type` | text CHECK | 'expense' \| 'income' |
| `planned_date` | date | |
| `category_id` | UUID FK | nullable |
| `notes` | text | nullable |
| `active` | boolean | default true |
| `account_id` | UUID FK | nullable |

---

### `card_payment_schedules`
| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `credit_card_id` | UUID FK | refs `accounts(id)` |
| `source_account_id` | UUID FK | refs `accounts(id)` |
| `amount` | numeric | nullable (mutuamente exclusivo com %) |
| `percentage` | numeric | nullable (% do saldo do cartão) |
| `planned_date` | date | |
| `active` | boolean | default true |

---

### `transaction_tags` + `transaction_tag_assignments`
- `transaction_tags`: tags custom por utilizador (name, color, UNIQUE por user)
- `transaction_tag_assignments`: junção M2M (transaction_id, tag_id)

---

### `user_settings`
- Mapeamento de colunas CSV por utilizador (csv_column_date, csv_column_description, csv_column_amount, csv_negative_is_expense)

---

### RPC Functions
- **`set_default_account(p_account_id UUID)`** — define conta default atomicamente (previne race conditions)

---

## Fluxo Principal

### Onboarding (5 passos, estado em localStorage)
1. **Step1** — Saldo inicial (amount + currency)
2. **Step2** — Upload CSV do banco
3. **Step3** — Mapeamento de colunas (date, description, amount)
4. **Step4** — Revisão/criação de categorias
5. **Step5** — Itens recorrentes → cria conta, marca `onboarding_completed = true`, insere transações

### Uso diário
1. Dashboard → Account Carousel (seleciona conta)
2. Gráfico de projeção 30 dias
3. Transações recentes com sugestões de categoria
4. Simulator → adicionar transações, recorrentes, planeados
5. Match Review → confirmar ocorrências de itens recorrentes

### Fluxo CSV → Projeção
```
Upload CSV
  → parseCSV() (PapaParse)
  → mapeamento de colunas (Step3)
  → applyMapping() → ParsedRow[]
  → categorias criadas (Step4)
  → transações inseridas em batch (Step5)
  → useTransactions fetches
  → computeProjection() (pure fn)
  → expandOccurrences() (30 dias)
  → ProjectionChart renderizado
```

---

## Hooks Chave

| Hook | Propósito |
|---|---|
| `useAccounts` | CRUD contas, balance updates, set default |
| `useCategories` | Categorias + regras keyword |
| `useTransactions` | Fetch/insert transações |
| `useRecurringItems` | Itens recorrentes |
| `usePlannedItems` | Itens planeados (one-off) |
| `useCardPayments` | Pagamentos cartão crédito |
| `useProjection` | Projeção de saldo (memoized) |
| `useSimulatedProjection` | What-if spending simulation |
| `useTransactionEdit` | CRUD transação + reconciliação de saldo |
| `useMatchReview` | Deteção de ocorrências + localStorage |
| `useTransactionTags` | Tags M2M |
| `useProfile` | Perfil utilizador |

---

## Funções de Biblioteca Chave

| Módulo | Funções | Propósito |
|---|---|---|
| `lib/projection.ts` | `computeProjection()`, `expandOccurrences()` | Projeção diária de saldo (pure fn, sem deps externas) |
| `lib/csv.ts` | `parseCSV()`, `applyMapping()` | Parsing CSV + mapeamento colunas |
| `lib/categorize.ts` | `categorize()` | Auto-categorização por keyword rules |
| `lib/deduplication.ts` | `buildOccurrences()`, `findMatchCandidates()` | Match recorrentes/planeados a transações reais |
| `lib/keywords.ts` | `extractKeyword()` | Extrai keyword de descrição de transação |
| `lib/format.ts` | `formatCurrency()`, `formatDate()` | Formatação pt-PT / EUR |
| `lib/filterItemsByAccount.ts` | `filterItemsByAccount()` | Filtra itens por conta selecionada |

---

## Componentes UI Principais

- `AccountCarousel` — Seletor horizontal de contas
- `ProjectionChart` — Gráfico Recharts 30 dias
- `MonthSummary` — Resumo receitas/despesas do mês
- `RecentTransactions` — Lista com sugestões de categoria
- `TransactionEditModal` — Editor completo com tags
- `CSVImportSheet` — Upload + processamento CSV
- `MatchReviewSheet` — Confirmar/descartar matches recorrentes
- `HorizonSelector` — 30d / 90d / 180d / 365d / fim do ano

---

## Decisões Técnicas

| Decisão | Razão |
|---|---|
| Supabase (vs Firebase) | PostgreSQL para projeções complexas; RLS nativo; SDK TypeScript |
| Next.js App Router | Server Components para auth; edge functions futuras |
| Custom hooks (vs Redux/Zustand) | App single-user, sem sync complexo |
| localStorage para onboarding | Persistência multi-step sem backend session |
| Soft deletes (`active`) | Recuperação de dados, audit trail financeiro |
| Projeção granularidade diária | "Fico negativo amanhã?" vs. média mensal |
| Match Review com localStorage | Evita double-counting; persiste decisões na sessão |
| `computeProjection()` pure fn | Testável sem mocks; sem deps externas |

---

## Testes

- **Framework:** Vitest
- **Cobertura:** Lógica de negócio em `lib/*.test.ts` (deduplication, keywords, projection)
- **Sem E2E** por agora

---

## Migrações

| Ficheiro | Conteúdo |
|---|---|
| `001_initial_schema.sql` | Tabelas base, RLS, triggers |
| `20260325000000_accounts_tags.sql` | Tabela accounts, tags, assignments |
| `20260326000000_cash_account_planned_items.sql` | Tipo 'cash', planned_items |
| `20260326120000_account_id_recurring_planned.sql` | FK account_id em recorrentes/planeados |

---

## Autenticação e Segurança

- Supabase Auth com Google OAuth
- RLS em todas as tabelas (`auth.uid()`)
- Sessão server-side via SSR + cookies
- `NEXT_PUBLIC_ANON_KEY` seguro porque RLS isola por utilizador
