# StayAlive MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first PWA that answers "If I spend X today, will I go negative in the next 30 days?" — with CSV bank import, recurring items, and a real-time spending simulator.

**Architecture:** Next.js 14 App Router with client components for interactive UI. Supabase handles Auth (Google OAuth), PostgreSQL with RLS, and type-safe queries via generated types. Projection logic runs entirely client-side (pure function, no DB writes).

**Tech Stack:** Next.js 14, Supabase JS v2, Tailwind CSS, Recharts, PapaParse, TypeScript, Vercel

**Spec:** `docs/superpowers/specs/2026-03-24-stayalive-design.html`

---

## File Map

```
src/
  app/
    layout.tsx                  # Root layout: font, metadata, bottom nav
    page.tsx                    # / → redirect to /dashboard or /onboarding
    (auth)/
      login/page.tsx            # Google OAuth login screen
      callback/route.ts         # Supabase auth callback handler
    onboarding/
      page.tsx                  # Wizard shell (reads step from localStorage)
      _steps/
        Step1Balance.tsx        # Saldo input
        Step2CSV.tsx            # CSV upload
        Step3Mapping.tsx        # Column mapping
        Step4Categories.tsx     # Default categories editor
        Step5Recurring.tsx      # Recurring items + "Concluir"
    dashboard/
      page.tsx                  # Home tab
    transactions/
      page.tsx                  # Transactions list + CSV import trigger
    simulator/
      page.tsx                  # Spending simulator tab
    config/
      page.tsx                  # Config tab (balance, categories, recurring, account)
  components/
    BottomNav.tsx               # 4-tab navigation bar
    ConditionalNav.tsx          # Suppresses BottomNav on /login and /onboarding
    BalanceCard.tsx             # Saldo card (inline edit)
    AlertBanner.tsx             # Critical day banner
    ProjectionChart.tsx         # Recharts line chart
    MonthSummary.tsx            # Month expenses vs income
    RecentTransactions.tsx      # Last 3 transactions
    CSVImportSheet.tsx          # Bottom-sheet modal for CSV import
    SimulatorPanel.tsx          # Simulator input + result
    TransactionList.tsx         # Full transaction list with filters
    RecurringItemForm.tsx       # Add/edit recurring item form
  lib/
    supabase/
      client.ts                 # Browser Supabase client (singleton)
      server.ts                 # Server Supabase client (cookies)
      types.ts                  # Generated DB types (from supabase gen types)
    projection.ts               # Pure projection calculation logic
    csv.ts                      # PapaParse wrapper + column mapping
    categorize.ts               # Apply category_rules to descriptions
    format.ts                   # Currency, date formatters
  hooks/
    useProfile.ts               # Profile + balance
    useTransactions.ts          # Transactions with filters
    useRecurringItems.ts        # Recurring items CRUD
    useCategories.ts            # Categories + rules CRUD
    useProjection.ts            # Runs projection.ts reactively
  middleware.ts                 # Auth guard: redirect unauthenticated to /login
supabase/
  migrations/
    001_initial_schema.sql      # All tables + RLS + trigger (includes onboarding_completed flag in profiles)
```

---

## Phase 1 — Project Bootstrap

### Task 1: Initialize Next.js project

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`

- [ ] **Step 1: Scaffold Next.js app**

```bash
cd C:/Dev/projects/StayAlive
npx create-next-app@14 . --typescript --tailwind --app --src-dir --import-alias "@/*" --no-git
```

Expected: project files created, `npm run dev` works on port 3000.

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr papaparse recharts
npm install -D @types/papaparse
```

- [ ] **Step 3: Create `.env.local`**

```bash
# .env.local (never commit this)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

- [ ] **Step 4: Create Supabase browser client** at `src/lib/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr'
import { Database } from './types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 5: Create Supabase server client** at `src/lib/supabase/server.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from './types'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 6: Create placeholder types file** at `src/lib/supabase/types.ts`

```typescript
// Generated by: supabase gen types typescript --local > src/lib/supabase/types.ts
// Run this after applying migrations
export type Database = {
  public: {
    Tables: {}
    Enums: {}
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: bootstrap Next.js 14 + Supabase + Tailwind + dependencies"
```

---

### Task 2: Supabase project + schema migration

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Create Supabase project**

Go to https://supabase.com → New project → name: `stayalive` → note the URL and anon key → put them in `.env.local`.

- [ ] **Step 2: Enable Google OAuth**

Supabase Dashboard → Authentication → Providers → Google → Enable → add Client ID + Secret from Google Cloud Console → set redirect URL to `http://localhost:3000/auth/callback`.

- [ ] **Step 3: Write migration** at `supabase/migrations/001_initial_schema.sql`

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  balance numeric not null default 0,
  balance_updated_at timestamptz not null default now(),
  currency text not null default 'EUR',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "Users see own profile" on public.profiles
  for all using (id = auth.uid());

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- categories
create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  color text not null default '#6b7280',
  type text not null check (type in ('expense', 'income')),
  icon text not null default '📂'
);
alter table public.categories enable row level security;
create policy "Users see own categories" on public.categories
  for all using (user_id = auth.uid());

-- category_rules
create table public.category_rules (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  keyword text not null,
  category_id uuid not null references public.categories(id) on delete cascade,
  priority int not null default 0
);
alter table public.category_rules enable row level security;
create policy "Users see own rules" on public.category_rules
  for all using (user_id = auth.uid());

-- transactions
create table public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  description text not null,
  amount numeric not null, -- negative = expense, positive = income
  category_id uuid references public.categories(id) on delete set null,
  source text not null check (source in ('csv', 'manual')),
  created_at timestamptz not null default now()
);
alter table public.transactions enable row level security;
create policy "Users see own transactions" on public.transactions
  for all using (user_id = auth.uid());
create index transactions_user_date on public.transactions(user_id, date desc);

-- recurring_items
create table public.recurring_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  amount numeric not null check (amount > 0), -- always positive; type defines direction
  type text not null check (type in ('expense', 'income')),
  frequency text not null check (frequency in ('monthly', 'weekly', 'quinzenal', 'yearly')),
  day_of_month int,
  day_of_week int,
  next_date date not null,
  active boolean not null default true
);
alter table public.recurring_items enable row level security;
create policy "Users see own recurring" on public.recurring_items
  for all using (user_id = auth.uid());

-- user_settings
create table public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  csv_column_date text,
  csv_column_description text,
  csv_column_amount text,
  csv_negative_is_expense boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.user_settings enable row level security;
create policy "Users see own settings" on public.user_settings
  for all using (user_id = auth.uid());
```

- [ ] **Step 4: Apply migration**

Option A (recommended — preserves migration history):
```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Option B (dashboard fallback — loses CLI migration history):
Supabase Dashboard → SQL Editor → paste and run the migration SQL. Note: if using Option B, track this migration manually to avoid re-applying on future `db push`.

- [ ] **Step 5: Generate TypeScript types**

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/supabase/types.ts
```

Replace `YOUR_PROJECT_ID` with the ID from your Supabase project URL.

- [ ] **Step 6: Commit**

```bash
git add supabase/ src/lib/supabase/types.ts
git commit -m "feat: add DB schema migrations + generated Supabase types"
```

---

### Task 3: Auth — login page + middleware + callback

**Files:**
- Create: `src/app/(auth)/login/page.tsx`, `src/app/auth/callback/route.ts`, `src/middleware.ts`, `src/app/page.tsx`

- [ ] **Step 1: Write login page** at `src/app/(auth)/login/page.tsx`

```typescript
'use client'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()

  async function handleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-6 bg-white">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">StayAlive</h1>
        <p className="mt-2 text-gray-500">Controla o teu dinheiro com confiança</p>
      </div>
      <button
        onClick={handleLogin}
        className="w-full max-w-xs flex items-center justify-center gap-3 py-3 px-6 rounded-xl bg-blue-600 text-white font-semibold text-base shadow hover:bg-blue-700 active:scale-95 transition"
      >
        Entrar com Google
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Write auth callback route** at `src/app/auth/callback/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }
  return NextResponse.redirect(`${origin}/`)
}
```

- [ ] **Step 3: Write middleware** at `src/middleware.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        // IMPORTANT: must set on BOTH request and response so session tokens refresh correctly
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  if (!user && !path.startsWith('/login') && !path.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
```

- [ ] **Step 4: Write root redirect** at `src/app/page.tsx`

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single()

  // Use onboarding_completed flag — NOT balance, which can legitimately be 0 or negative
  if (!profile || !profile.onboarding_completed) redirect('/onboarding')
  redirect('/dashboard')
}
```

- [ ] **Step 5: Start dev server and test auth flow manually**

```bash
npm run dev
```

Visit http://localhost:3000 → should redirect to /login → click "Entrar com Google" → completes OAuth → lands back at / → redirects to /onboarding (balance=0).

- [ ] **Step 6: Commit**

```bash
git add src/
git commit -m "feat: auth — Google OAuth login, callback route, middleware guard"
```

---

## Phase 2 — Core Utilities

### Task 4: Projection logic (pure function)

**Files:**
- Create: `src/lib/projection.ts`
- Test: manual via browser console (no test framework configured yet)

- [ ] **Step 1: Write projection utility** at `src/lib/projection.ts`

```typescript
import type { Database } from './supabase/types'

type RecurringItem = Database['public']['Tables']['recurring_items']['Row']

export interface DayProjection {
  date: string // YYYY-MM-DD
  balance: number
  cashflow: number
}

export interface ProjectionResult {
  days: DayProjection[]
  criticalDay: string | null // first day balance < 0
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function nextOccurrence(from: Date, item: RecurringItem): Date {
  const d = new Date(from)
  switch (item.frequency) {
    case 'weekly':    d.setDate(d.getDate() + 7); break
    case 'quinzenal': d.setDate(d.getDate() + 14); break
    case 'monthly':
      d.setMonth(d.getMonth() + 1)
      if (item.day_of_month) d.setDate(item.day_of_month)
      break
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1)
      break
  }
  return d
}

function expandOccurrences(item: RecurringItem, today: Date, horizon: number): Date[] {
  const end = addDays(today, horizon)
  const dates: Date[] = []
  let d = new Date(item.next_date)
  while (d <= end) {
    if (d >= today) dates.push(new Date(d))
    d = nextOccurrence(d, item)
  }
  return dates
}

export function computeProjection(
  currentBalance: number,
  recurringItems: RecurringItem[],
  horizon = 30
): ProjectionResult {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Build cashflow map: date → net cashflow
  const cashflowMap = new Map<string, number>()

  for (const item of recurringItems) {
    if (!item.active) continue
    const sign = item.type === 'income' ? 1 : -1
    const dates = expandOccurrences(item, today, horizon)
    for (const d of dates) {
      const key = toISODate(d)
      cashflowMap.set(key, (cashflowMap.get(key) ?? 0) + sign * item.amount)
    }
  }

  // Walk days and accumulate
  const days: DayProjection[] = []
  let runningBalance = currentBalance
  let criticalDay: string | null = null

  for (let i = 0; i <= horizon; i++) {
    const date = toISODate(addDays(today, i))
    const cashflow = cashflowMap.get(date) ?? 0
    runningBalance += cashflow
    days.push({ date, balance: runningBalance, cashflow })
    if (criticalDay === null && runningBalance < 0) {
      criticalDay = date
    }
  }

  return { days, criticalDay }
}

export function computeSimulatedProjection(
  projection: ProjectionResult,
  spendAmount: number
): ProjectionResult {
  const days = projection.days.map(d => ({
    ...d,
    balance: d.balance - spendAmount,
  }))
  const criticalDay = days.find(d => d.balance < 0)?.date ?? null
  return { days, criticalDay }
}
```

- [ ] **Step 2: Verify logic manually in browser console**

Open http://localhost:3000/dashboard (after login), open DevTools console and paste:

```javascript
// Quick sanity check — import from module in a test page later
const today = new Date()
console.log('projection util loaded — verify via useProjection hook in dashboard')
```

- [ ] **Step 3: Write format utilities** at `src/lib/format.ts`

```typescript
export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-PT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

export function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-PT', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(iso))
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/
git commit -m "feat: projection engine (pure), format utilities"
```

---

### Task 5: CSV parsing utility

**Files:**
- Create: `src/lib/csv.ts`

- [ ] **Step 1: Write CSV utility** at `src/lib/csv.ts`

```typescript
import Papa from 'papaparse'

export interface ColumnMapping {
  dateCol: string
  descriptionCol: string
  amountCol: string
  negativeIsExpense: boolean
}

export interface ParsedRow {
  date: string        // YYYY-MM-DD
  description: string
  amount: number      // negative = expense
  raw: Record<string, string>
}

export function parseCSV(file: File): Promise<{ headers: string[], rows: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        resolve({
          headers: result.meta.fields ?? [],
          rows: result.data as Record<string, string>[],
        })
      },
      error: reject,
    })
  })
}

function parsePortugueseDate(val: string): string {
  // Handles DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD
  const ddmmyyyy = val.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/)
  if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`
  return val // assume ISO
}

function parseAmount(val: string, negativeIsExpense: boolean): number {
  // Handle European number format: 1.234,56 → 1234.56
  const normalized = val.replace(/\./g, '').replace(',', '.')
  const n = parseFloat(normalized)
  return negativeIsExpense ? n : Math.abs(n) * (n < 0 ? -1 : 1)
}

export function applyMapping(
  rows: Record<string, string>[],
  mapping: ColumnMapping
): ParsedRow[] {
  return rows
    .map(row => {
      const rawAmount = row[mapping.amountCol] ?? ''
      const amount = parseAmount(rawAmount, mapping.negativeIsExpense)
      return {
        date: parsePortugueseDate(row[mapping.dateCol] ?? ''),
        description: (row[mapping.descriptionCol] ?? '').trim(),
        amount,
        raw: row,
      }
    })
    .filter(r => r.description && !isNaN(r.amount))
}
```

- [ ] **Step 2: Write categorization utility** at `src/lib/categorize.ts`

```typescript
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
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/
git commit -m "feat: CSV parsing + column mapping + category rule matching"
```

---

## Phase 3 — Layout & Navigation

### Task 6: Root layout + Bottom Nav

**Files:**
- Create: `src/components/BottomNav.tsx`, `src/components/ConditionalNav.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Write BottomNav** at `src/components/BottomNav.tsx`

```typescript
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/dashboard',     icon: '🏠', label: 'Home' },
  { href: '/transactions',  icon: '📋', label: 'Transações' },
  { href: '/simulator',     icon: '➕', label: 'Simular' },
  { href: '/config',        icon: '⚙️', label: 'Config' },
]

export default function BottomNav() {
  const path = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around z-50 pb-safe">
      {tabs.map(tab => {
        const active = path.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center py-2 px-4 text-xs gap-1 transition-colors ${
              active ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className={active ? 'font-semibold' : ''}>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 2: Update root layout** at `src/app/layout.tsx`

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ConditionalNav from '@/components/ConditionalNav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'StayAlive',
  description: 'Controla o teu dinheiro com confiança',
  manifest: '/manifest.json',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body className={`${inter.className} bg-gray-50`}>
        <main className="max-w-md mx-auto min-h-screen pb-20">
          {children}
        </main>
        <ConditionalNav />
      </body>
    </html>
  )
}
```

Also create `src/components/ConditionalNav.tsx` (client component that reads pathname and suppresses nav on `/login` and `/onboarding`):

```typescript
'use client'
import { usePathname } from 'next/navigation'
import BottomNav from './BottomNav'

const HIDE_NAV_PATHS = ['/login', '/onboarding']

export default function ConditionalNav() {
  const path = usePathname()
  if (HIDE_NAV_PATHS.some(p => path.startsWith(p))) return null
  return <BottomNav />
}
```

Update the File Map to include `ConditionalNav.tsx`.


- [ ] **Step 3: Verify nav renders**

```bash
npm run dev
```

Visit http://localhost:3000/dashboard — bottom nav should be visible with 4 tabs.

- [ ] **Step 4: Commit**

```bash
git add src/
git commit -m "feat: root layout + bottom navigation bar"
```

---

## Phase 4 — Onboarding Wizard

### Task 7: Wizard shell + Step 1 (Balance)

**Files:**
- Create: `src/app/onboarding/page.tsx`, `src/app/onboarding/_steps/Step1Balance.tsx`

- [ ] **Step 1: Write wizard shell** at `src/app/onboarding/page.tsx`

```typescript
'use client'
import { useState, useEffect } from 'react'
import Step1Balance from './_steps/Step1Balance'
import Step2CSV from './_steps/Step2CSV'
import Step3Mapping from './_steps/Step3Mapping'
import Step4Categories from './_steps/Step4Categories'
import Step5Recurring from './_steps/Step5Recurring'
import { parseCSV, type ColumnMapping } from '@/lib/csv'

const STEPS = 5

export interface WizardState {
  balance: string
  csvHeaders: string[]
  csvRows: Record<string, string>[]
  mapping: ColumnMapping | null
  categoriesReady: boolean
}

const STORAGE_KEY = 'stayalive_onboarding'

function loadState(): Partial<WizardState> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [state, setState] = useState<WizardState>({
    balance: '',
    csvHeaders: [],
    csvRows: [],
    mapping: null,
    categoriesReady: false,
  })

  useEffect(() => {
    const saved = loadState()
    if (saved.balance) setState(s => ({ ...s, ...saved }))
  }, [])

  function save(patch: Partial<WizardState>) {
    setState(s => {
      const next = { ...s, ...patch }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  const progress = Math.round((step / STEPS) * 100)

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Progress bar */}
      <div className="w-full h-1 bg-gray-100">
        <div
          className="h-1 bg-blue-600 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="text-sm text-gray-500">Passo {step} de {STEPS}</span>
        {step > 1 && (
          <button onClick={() => setStep(s => s - 1)} className="text-sm text-blue-600">
            ← Voltar
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {step === 1 && (
          <Step1Balance
            value={state.balance}
            onChange={balance => save({ balance })}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <Step2CSV
            onParsed={(headers, rows) => { save({ csvHeaders: headers, csvRows: rows }); setStep(3) }}
            onSkip={() => setStep(4)}
          />
        )}
        {step === 3 && (
          <Step3Mapping
            headers={state.csvHeaders}
            rows={state.csvRows}
            savedMapping={state.mapping}
            onDone={mapping => { save({ mapping }); setStep(4) }}
            onSkip={() => setStep(4)}
          />
        )}
        {step === 4 && (
          <Step4Categories
            onDone={() => { save({ categoriesReady: true }); setStep(5) }}
            onSkip={() => setStep(5)}
          />
        )}
        {step === 5 && (
          <Step5Recurring
            wizardState={state}
          />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write Step1Balance** at `src/app/onboarding/_steps/Step1Balance.tsx`

```typescript
'use client'

interface Props {
  value: string
  onChange: (val: string) => void
  onNext: () => void
}

export default function Step1Balance({ value, onChange, onNext }: Props) {
  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    // Allow digits, comma, dot, minus
    const v = e.target.value.replace(/[^0-9,.\-]/g, '')
    onChange(v)
  }

  const numericValue = parseFloat(value.replace(',', '.'))
  const valid = !isNaN(numericValue)

  return (
    <div className="px-6 py-8 flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Qual é o teu saldo atual?</h2>
        <p className="mt-2 text-gray-500">
          Introduz o saldo atual da tua conta. Podes atualizar a qualquer momento.
        </p>
      </div>

      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">€</span>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleInput}
          placeholder="0,00"
          className="w-full pl-10 pr-4 py-4 text-2xl border-2 border-gray-200 rounded-xl focus:border-blue-600 focus:outline-none"
          autoFocus
        />
      </div>

      {value && !valid && (
        <p className="text-red-600 text-sm">Valor inválido</p>
      )}

      <button
        onClick={onNext}
        disabled={!valid}
        className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl disabled:opacity-40 active:scale-95 transition"
      >
        Continuar
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/onboarding/
git commit -m "feat: onboarding wizard shell + Step 1 (balance input)"
```

---

### Task 8: Onboarding Steps 2–3 (CSV upload + mapping)

**Files:**
- Create: `src/app/onboarding/_steps/Step2CSV.tsx`, `src/app/onboarding/_steps/Step3Mapping.tsx`

- [ ] **Step 1: Write Step2CSV** at `src/app/onboarding/_steps/Step2CSV.tsx`

```typescript
'use client'
import { useState, useRef } from 'react'
import { parseCSV } from '@/lib/csv'

interface Props {
  onParsed: (headers: string[], rows: Record<string, string>[]) => void
  onSkip: () => void
}

export default function Step2CSV({ onParsed, onSkip }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (file.size > 5 * 1024 * 1024) { setError('Ficheiro demasiado grande (máx. 5MB)'); return }
    setLoading(true)
    setError('')
    try {
      const { headers, rows } = await parseCSV(file)
      onParsed(headers, rows)
    } catch {
      setError('Erro ao ler o ficheiro CSV.')
    } finally {
      setLoading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="px-6 py-8 flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Importa o teu extrato</h2>
        <p className="mt-2 text-gray-500">Suporta CGD, Millennium, Santander, Novo Banco, BPI (formato CSV).</p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-blue-400 transition"
      >
        <span className="text-4xl">📂</span>
        <p className="text-gray-600 text-center">Arrasta o ficheiro aqui<br />ou clica para selecionar</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
        />
      </div>

      {loading && <p className="text-blue-600 text-sm text-center">A ler CSV...</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        onClick={onSkip}
        className="text-gray-400 text-sm text-center py-2"
      >
        Saltar por agora →
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Write Step3Mapping** at `src/app/onboarding/_steps/Step3Mapping.tsx`

```typescript
'use client'
import { useState } from 'react'
import { applyMapping, type ColumnMapping } from '@/lib/csv'

interface Props {
  headers: string[]
  rows: Record<string, string>[]
  savedMapping: ColumnMapping | null
  onDone: (mapping: ColumnMapping) => void
  onSkip: () => void
}

export default function Step3Mapping({ headers, rows, savedMapping, onDone, onSkip }: Props) {
  const [dateCol, setDateCol] = useState(savedMapping?.dateCol ?? headers[0] ?? '')
  const [descCol, setDescCol] = useState(savedMapping?.descriptionCol ?? headers[1] ?? '')
  const [amountCol, setAmountCol] = useState(savedMapping?.amountCol ?? headers[2] ?? '')
  const [negativeIsExpense, setNegativeIsExpense] = useState(savedMapping?.negativeIsExpense ?? true)

  const mapping: ColumnMapping = { dateCol, descriptionCol: descCol, amountCol, negativeIsExpense }
  const preview = applyMapping(rows.slice(0, 3), mapping)

  const sel = (value: string, set: (v: string) => void) => (
    <select
      value={value}
      onChange={e => set(e.target.value)}
      className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full"
    >
      {headers.map(h => <option key={h} value={h}>{h}</option>)}
    </select>
  )

  return (
    <div className="px-6 py-8 flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Mapeia as colunas</h2>
        <p className="mt-2 text-gray-500">Diz-nos quais colunas correspondem a quê.</p>
      </div>

      <div className="flex flex-col gap-4">
        <div><label className="text-sm font-medium text-gray-700">Data</label>{sel(dateCol, setDateCol)}</div>
        <div><label className="text-sm font-medium text-gray-700">Descrição</label>{sel(descCol, setDescCol)}</div>
        <div><label className="text-sm font-medium text-gray-700">Valor</label>{sel(amountCol, setAmountCol)}</div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={negativeIsExpense}
            onChange={e => setNegativeIsExpense(e.target.checked)}
            className="w-4 h-4 accent-blue-600"
          />
          Valor negativo = despesa
        </label>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Pré-visualização (3 linhas)</p>
        <div className="bg-gray-50 rounded-xl p-3 text-sm flex flex-col gap-2">
          {preview.map((row, i) => (
            <div key={i} className="flex justify-between">
              <span className="text-gray-600 truncate max-w-[60%]">{row.description}</span>
              <span className={row.amount < 0 ? 'text-red-600' : 'text-green-600'}>
                {row.amount.toFixed(2)} €
              </span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => onDone(mapping)}
        className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl active:scale-95 transition"
      >
        Confirmar mapeamento
      </button>
      <button onClick={onSkip} className="text-gray-400 text-sm text-center py-2">Saltar →</button>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/onboarding/_steps/
git commit -m "feat: onboarding Steps 2–3 (CSV upload + column mapping)"
```

---

### Task 9: Onboarding Steps 4–5 + Supabase commit

**Files:**
- Create: `src/app/onboarding/_steps/Step4Categories.tsx`, `src/app/onboarding/_steps/Step5Recurring.tsx`

- [ ] **Step 1: Write Step4Categories** at `src/app/onboarding/_steps/Step4Categories.tsx`

```typescript
'use client'

const DEFAULT_CATEGORIES = [
  { name: 'Supermercado',     type: 'expense' as const, icon: '🛒', color: '#16a34a', keywords: ['continente', 'pingo doce', 'lidl', 'aldi', 'mercadona'] },
  { name: 'Transportes',      type: 'expense' as const, icon: '🚗', color: '#2563eb', keywords: ['uber', 'bolt', 'cp', 'carris', 'metro'] },
  { name: 'Subscrições',      type: 'expense' as const, icon: '📺', color: '#7c3aed', keywords: ['netflix', 'spotify', 'apple', 'amazon', 'disney'] },
  { name: 'Telecomunicações', type: 'expense' as const, icon: '📱', color: '#0891b2', keywords: ['nos', 'meo', 'vodafone', 'nowo'] },
  { name: 'Rendimento',       type: 'income'  as const, icon: '💰', color: '#ca8a04', keywords: ['salário', 'vencimento', 'ordenado'] },
]

interface Props {
  onDone: () => void
  onSkip: () => void
}

export default function Step4Categories({ onDone, onSkip }: Props) {
  return (
    <div className="px-6 py-8 flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Categorias pré-definidas</h2>
        <p className="mt-2 text-gray-500">
          Criámos estas categorias automaticamente. Podes editá-las mais tarde em Config.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {DEFAULT_CATEGORIES.map(cat => (
          <div key={cat.name} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
            <span className="text-2xl">{cat.icon}</span>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{cat.name}</p>
              <p className="text-xs text-gray-400">{cat.keywords.join(', ')}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onDone}
        className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl active:scale-95 transition"
      >
        Continuar
      </button>
      <button onClick={onSkip} className="text-gray-400 text-sm text-center py-2">Saltar →</button>
    </div>
  )
}

export { DEFAULT_CATEGORIES }
```

- [ ] **Step 2: Write Step5Recurring** at `src/app/onboarding/_steps/Step5Recurring.tsx`

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { applyMapping } from '@/lib/csv'
import { categorize } from '@/lib/categorize'
import { DEFAULT_CATEGORIES } from './Step4Categories'
import type { WizardState } from '../page'
import type { Database } from '@/lib/supabase/types'

type RecurringDraft = {
  name: string
  amount: string
  type: 'expense' | 'income'
  frequency: 'monthly' | 'weekly' | 'quinzenal' | 'yearly'
}

interface Props {
  wizardState: WizardState
}

export default function Step5Recurring({ wizardState }: Props) {
  const router = useRouter()
  const [items, setItems] = useState<RecurringDraft[]>([
    { name: '', amount: '', type: 'expense', frequency: 'monthly' },
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function addItem() {
    setItems(i => [...i, { name: '', amount: '', type: 'expense', frequency: 'monthly' }])
  }

  function updateItem(i: number, patch: Partial<RecurringDraft>) {
    setItems(items => items.map((item, idx) => idx === i ? { ...item, ...patch } : item))
  }

  function removeItem(i: number) {
    setItems(items => items.filter((_, idx) => idx !== i))
  }

  async function handleConcluir() {
    setSaving(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const balance = parseFloat(wizardState.balance.replace(',', '.'))

      // 1. Update balance + mark onboarding complete
      await supabase.from('profiles').update({
        balance,
        balance_updated_at: new Date().toISOString(),
        onboarding_completed: true,
      }).eq('id', user.id)

      // 2. Create default categories + rules
      for (const cat of DEFAULT_CATEGORIES) {
        const { data: createdCat } = await supabase
          .from('categories')
          .insert({ user_id: user.id, name: cat.name, type: cat.type, icon: cat.icon, color: cat.color })
          .select('id')
          .single()
        if (createdCat) {
          await supabase.from('category_rules').insert(
            cat.keywords.map((kw, i) => ({
              user_id: user.id,
              keyword: kw,
              category_id: createdCat.id,
              priority: cat.keywords.length - i,
            }))
          )
        }
      }

      // 3. Import CSV transactions (if any)
      if (wizardState.mapping && wizardState.csvRows.length > 0) {
        const { data: rules } = await supabase
          .from('category_rules')
          .select('*')
          .eq('user_id', user.id)
          .order('priority', { ascending: false })

        const parsed = applyMapping(wizardState.csvRows, wizardState.mapping)
        // Deduplicate: onboarding can be retried if abandoned
        const { data: existing } = await supabase
          .from('transactions')
          .select('date, description, amount')
          .eq('user_id', user.id)
        const existingSet = new Set(
          (existing ?? []).map(t => `${t.date}|${t.description}|${t.amount}`)
        )
        const txns = parsed
          .filter(row => !existingSet.has(`${row.date}|${row.description}|${row.amount}`))
          .map(row => ({
            user_id: user.id,
            date: row.date,
            description: row.description,
            amount: row.amount,
            category_id: categorize(row.description, rules ?? []),
            source: 'csv' as const,
          }))
        if (txns.length > 0) {
          await supabase.from('transactions').insert(txns)
        }

        // Save CSV mapping to user_settings
        await supabase.from('user_settings').upsert({
          user_id: user.id,
          csv_column_date: wizardState.mapping.dateCol,
          csv_column_description: wizardState.mapping.descriptionCol,
          csv_column_amount: wizardState.mapping.amountCol,
          csv_negative_is_expense: wizardState.mapping.negativeIsExpense,
          updated_at: new Date().toISOString(),
        })
      }

      // 4. Create recurring items
      const today = new Date().toISOString().split('T')[0]
      const validItems = items.filter(i => i.name.trim() && parseFloat(i.amount.replace(',', '.')) > 0)
      if (validItems.length > 0) {
        await supabase.from('recurring_items').insert(
          validItems.map(item => ({
            user_id: user.id,
            name: item.name.trim(),
            amount: parseFloat(item.amount.replace(',', '.')),
            type: item.type,
            frequency: item.frequency,
            next_date: today,
            active: true,
          }))
        )
      }

      // 5. Clear localStorage
      localStorage.removeItem('stayalive_onboarding')

      router.replace('/dashboard')
    } catch (e) {
      setError('Erro ao guardar. Tenta de novo.')
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-6 py-8 flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Despesas fixas</h2>
        <p className="mt-2 text-gray-500">Renda, salário, subscrições mensais…</p>
      </div>

      <div className="flex flex-col gap-4">
        {items.map((item, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                value={item.name}
                onChange={e => updateItem(i, { name: e.target.value })}
                placeholder="Nome (ex: Renda)"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <button onClick={() => removeItem(i)} className="text-gray-300 hover:text-red-400 text-xl px-1">×</button>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                <input
                  value={item.amount}
                  onChange={e => updateItem(i, { amount: e.target.value.replace(/[^0-9,.]/g, '') })}
                  placeholder="0,00"
                  inputMode="decimal"
                  className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <select
                value={item.type}
                onChange={e => updateItem(i, { type: e.target.value as 'expense' | 'income' })}
                className="border border-gray-200 rounded-lg px-2 py-2 text-sm"
              >
                <option value="expense">Despesa</option>
                <option value="income">Rendimento</option>
              </select>
            </div>
            <select
              value={item.frequency}
              onChange={e => updateItem(i, { frequency: e.target.value as RecurringDraft['frequency'] })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="monthly">Mensal</option>
              <option value="weekly">Semanal</option>
              <option value="quinzenal">Quinzenal</option>
              <option value="yearly">Anual</option>
            </select>
          </div>
        ))}

        <button
          onClick={addItem}
          className="text-blue-600 text-sm font-medium py-2 border-2 border-dashed border-blue-200 rounded-xl"
        >
          + Adicionar
        </button>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        onClick={handleConcluir}
        disabled={saving}
        className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl disabled:opacity-40 active:scale-95 transition"
      >
        {saving ? 'A guardar…' : 'Concluir configuração'}
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Test full onboarding flow manually**

Start dev server. Complete all 5 steps with a real CSV file. Verify in Supabase Dashboard that:
- `profiles.balance` was updated
- Categories + rules were created
- Transactions were imported (if CSV provided)
- Recurring items were saved

- [ ] **Step 4: Commit**

```bash
git add src/app/onboarding/
git commit -m "feat: onboarding Steps 4–5 + Supabase commit on Concluir"
```

---

## Phase 5 — Dashboard

### Task 10: Data hooks

**Files:**
- Create: `src/hooks/useProfile.ts`, `src/hooks/useRecurringItems.ts`, `src/hooks/useProjection.ts`, `src/hooks/useTransactions.ts`, `src/hooks/useCategories.ts`

- [ ] **Step 1: Write useProfile** at `src/hooks/useProfile.ts`

```typescript
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

type Profile = Database['public']['Tables']['profiles']['Row']

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(data)
    setLoading(false)
  }

  useEffect(() => { fetchProfile() }, [])

  async function updateBalance(balance: number) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({
      balance,
      balance_updated_at: new Date().toISOString(),
    }).eq('id', user.id)
    await fetchProfile()
  }

  return { profile, loading, updateBalance, refetch: fetchProfile }
}
```

- [ ] **Step 2: Write useRecurringItems** at `src/hooks/useRecurringItems.ts`

```typescript
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

type RecurringItem = Database['public']['Tables']['recurring_items']['Row']
type InsertItem = Database['public']['Tables']['recurring_items']['Insert']

export function useRecurringItems() {
  const [items, setItems] = useState<RecurringItem[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchItems() {
    const supabase = createClient()
    const { data } = await supabase
      .from('recurring_items')
      .select('*')
      .eq('active', true)
      .order('name')
    setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [])

  async function addItem(item: Omit<InsertItem, 'user_id'>) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('recurring_items').insert({ ...item, user_id: user.id })
    await fetchItems()
  }

  async function removeItem(id: string) {
    const supabase = createClient()
    await supabase.from('recurring_items').update({ active: false }).eq('id', id)
    await fetchItems()
  }

  return { items, loading, addItem, removeItem, refetch: fetchItems }
}
```

- [ ] **Step 3: Write useProjection** at `src/hooks/useProjection.ts`

```typescript
'use client'
import { useMemo } from 'react'
import { computeProjection, computeSimulatedProjection, type ProjectionResult } from '@/lib/projection'
import type { Database } from '@/lib/supabase/types'

type RecurringItem = Database['public']['Tables']['recurring_items']['Row']

export function useProjection(
  balance: number | null,
  recurringItems: RecurringItem[]
): ProjectionResult | null {
  return useMemo(() => {
    if (balance === null) return null
    return computeProjection(balance, recurringItems)
  }, [balance, recurringItems])
}

export function useSimulatedProjection(
  projection: ProjectionResult | null,
  spendAmount: number
): ProjectionResult | null {
  return useMemo(() => {
    if (!projection) return null
    if (spendAmount === 0) return projection
    return computeSimulatedProjection(projection, spendAmount)
  }, [projection, spendAmount])
}
```

- [ ] **Step 4: Write useTransactions** at `src/hooks/useTransactions.ts`

```typescript
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

type Transaction = Database['public']['Tables']['transactions']['Row']

export function useTransactions(limit?: number) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchTransactions() {
    const supabase = createClient()
    let query = supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })
    if (limit) query = query.limit(limit)
    const { data } = await query
    setTransactions(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchTransactions() }, [limit])

  async function insertTransactions(txns: Omit<Transaction, 'id' | 'user_id' | 'created_at'>[]) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('transactions').insert(
      txns.map(t => ({ ...t, user_id: user.id }))
    )
    await fetchTransactions()
  }

  return { transactions, loading, insertTransactions, refetch: fetchTransactions }
}
```

- [ ] **Step 5: Write useCategories** at `src/hooks/useCategories.ts`

```typescript
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

type Category = Database['public']['Tables']['categories']['Row']
type CategoryRule = Database['public']['Tables']['category_rules']['Row']

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [rules, setRules] = useState<CategoryRule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const supabase = createClient()
      const [{ data: cats }, { data: rls }] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('category_rules').select('*').order('priority', { ascending: false }),
      ])
      setCategories(cats ?? [])
      setRules(rls ?? [])
      setLoading(false)
    }
    fetch()
  }, [])

  return { categories, rules, loading }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/hooks/
git commit -m "feat: data hooks (profile, transactions, recurring, categories, projection)"
```

---

### Task 11: Dashboard components + page

**Files:**
- Create: `src/components/BalanceCard.tsx`, `src/components/AlertBanner.tsx`, `src/components/ProjectionChart.tsx`, `src/components/MonthSummary.tsx`, `src/components/RecentTransactions.tsx`, `src/app/dashboard/page.tsx`

- [ ] **Step 1: Write BalanceCard** at `src/components/BalanceCard.tsx`

```typescript
'use client'
import { useState } from 'react'
import { formatCurrency, formatDate } from '@/lib/format'

interface Props {
  balance: number
  updatedAt: string
  onUpdate: (balance: number) => Promise<void>
}

export default function BalanceCard({ balance, updatedAt, onUpdate }: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  function startEdit() {
    setValue(balance.toFixed(2).replace('.', ','))
    setEditing(true)
  }

  async function save() {
    const n = parseFloat(value.replace(',', '.'))
    if (isNaN(n)) return
    setSaving(true)
    await onUpdate(n)
    setSaving(false)
    setEditing(false)
  }

  return (
    <div
      className="bg-blue-600 text-white rounded-2xl p-5 mx-4 mt-4 shadow-lg cursor-pointer"
      onClick={!editing ? startEdit : undefined}
    >
      <p className="text-blue-200 text-sm">Saldo atual</p>
      {editing ? (
        <div className="flex items-center gap-2 mt-1" onClick={e => e.stopPropagation()}>
          <span className="text-2xl">€</span>
          <input
            autoFocus
            value={value}
            onChange={e => setValue(e.target.value.replace(/[^0-9,.\-]/g, ''))}
            className="bg-blue-500 text-white text-3xl font-bold w-full rounded-lg px-2 py-1 outline-none"
            inputMode="decimal"
          />
          <button onClick={save} disabled={saving} className="bg-white text-blue-600 px-3 py-1 rounded-lg text-sm font-semibold">
            {saving ? '…' : 'OK'}
          </button>
          <button onClick={() => setEditing(false)} className="text-blue-200 text-sm">✕</button>
        </div>
      ) : (
        <p className="text-4xl font-bold mt-1">{formatCurrency(balance)}</p>
      )}
      <p className="text-blue-200 text-xs mt-2">Atualizado em {formatDate(updatedAt)}</p>
    </div>
  )
}
```

- [ ] **Step 2: Write AlertBanner** at `src/components/AlertBanner.tsx`

```typescript
import { formatShortDate } from '@/lib/format'

interface Props {
  criticalDay: string | null
}

export default function AlertBanner({ criticalDay }: Props) {
  if (!criticalDay) return null

  const daysUntil = Math.round(
    (new Date(criticalDay).getTime() - new Date().setHours(0,0,0,0)) / 86400000
  )
  const urgent = daysUntil <= 7
  const color = urgent ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'

  return (
    <div className={`mx-4 mt-3 p-3 rounded-xl border ${color} text-sm`}>
      ⚠️ <strong>Dia crítico: {formatShortDate(criticalDay)}</strong>
      {' '}— Se não gastares mais nada além das fixas
    </div>
  )
}
```

- [ ] **Step 3: Write ProjectionChart** at `src/components/ProjectionChart.tsx`

```typescript
'use client'
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Area, ComposedChart } from 'recharts'
import { formatShortDate, formatCurrency } from '@/lib/format'
import type { DayProjection } from '@/lib/projection'

interface Props {
  days: DayProjection[]
  criticalDay: string | null
}

export default function ProjectionChart({ days, criticalDay }: Props) {
  const data = days.map(d => ({
    date: d.date,
    label: formatShortDate(d.date),
    balance: Math.round(d.balance * 100) / 100,
  }))

  return (
    <div className="mx-4 mt-3 bg-white rounded-2xl p-4 shadow-sm">
      <p className="text-sm font-semibold text-gray-700 mb-3">Projeção 30 dias</p>
      <ResponsiveContainer width="100%" height={180}>
        <ComposedChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickLine={false}
            interval={6}
          />
          <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(value: number) => [formatCurrency(value), 'Saldo']}
            labelStyle={{ fontSize: 12 }}
          />
          <ReferenceLine y={0} stroke="#dc2626" strokeDasharray="3 3" />
          {criticalDay && (
            <ReferenceLine
              x={formatShortDate(criticalDay)}
              stroke="#dc2626"
              strokeWidth={2}
              label={{ value: '⚠️', position: 'top', fontSize: 14 }}
            />
          )}
          <Area
            type="monotone"
            dataKey="balance"
            stroke="#2563eb"
            strokeWidth={2}
            fill="#eff6ff"
            fillOpacity={0.6}
          />
          <Line type="monotone" dataKey="balance" stroke="#2563eb" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 4: Write MonthSummary** at `src/components/MonthSummary.tsx`

```typescript
import { formatCurrency } from '@/lib/format'
import type { Database } from '@/lib/supabase/types'

type Transaction = Database['public']['Tables']['transactions']['Row']

interface Props {
  transactions: Transaction[]
  onImportCSV: () => void
}

export default function MonthSummary({ transactions, onImportCSV }: Props) {
  const now = new Date()
  const monthTxns = transactions.filter(t => {
    const d = new Date(t.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  if (monthTxns.length === 0) {
    return (
      <div className="mx-4 mt-3 bg-white rounded-2xl p-4 shadow-sm text-center">
        <p className="text-gray-400 text-sm">Sem transações este mês</p>
        <button onClick={onImportCSV} className="mt-2 text-blue-600 text-sm font-medium">
          Importar extrato →
        </button>
      </div>
    )
  }

  const expenses = monthTxns.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
  const income = monthTxns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const ratio = income > 0 ? Math.min(expenses / income, 1) : 1

  return (
    <div className="mx-4 mt-3 bg-white rounded-2xl p-4 shadow-sm">
      <p className="text-sm font-semibold text-gray-700 mb-3">Resumo do mês</p>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-red-600">Despesas: {formatCurrency(expenses)}</span>
        <span className="text-green-600">Rendimento: {formatCurrency(income)}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-2 bg-red-400 rounded-full transition-all"
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
      <p className="text-xs text-gray-400 mt-1">{Math.round(ratio * 100)}% do rendimento gasto</p>
    </div>
  )
}
```

- [ ] **Step 5: Write RecentTransactions** at `src/components/RecentTransactions.tsx`

```typescript
import Link from 'next/link'
import { formatCurrency, formatShortDate } from '@/lib/format'
import type { Database } from '@/lib/supabase/types'

type Transaction = Database['public']['Tables']['transactions']['Row']

interface Props {
  transactions: Transaction[]
}

export default function RecentTransactions({ transactions }: Props) {
  const recent = transactions.slice(0, 3)
  return (
    <div className="mx-4 mt-3 bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm font-semibold text-gray-700">Últimas transações</p>
        <Link href="/transactions" className="text-blue-600 text-xs">Ver todas →</Link>
      </div>
      {recent.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-4">Sem transações ainda</p>
      ) : (
        <div className="flex flex-col gap-3">
          {recent.map(t => (
            <div key={t.id} className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-800 truncate max-w-[200px]">{t.description}</p>
                <p className="text-xs text-gray-400">{formatShortDate(t.date)}</p>
              </div>
              <span className={`text-sm font-semibold ${t.amount < 0 ? 'text-red-500' : 'text-green-600'}`}>
                {formatCurrency(t.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Write Dashboard page** at `src/app/dashboard/page.tsx`

```typescript
'use client'
import { useState } from 'react'
import BalanceCard from '@/components/BalanceCard'
import AlertBanner from '@/components/AlertBanner'
import ProjectionChart from '@/components/ProjectionChart'
import MonthSummary from '@/components/MonthSummary'
import RecentTransactions from '@/components/RecentTransactions'
import CSVImportSheet from '@/components/CSVImportSheet'
import { useProfile } from '@/hooks/useProfile'
import { useRecurringItems } from '@/hooks/useRecurringItems'
import { useProjection } from '@/hooks/useProjection'
import { useTransactions } from '@/hooks/useTransactions'

export default function DashboardPage() {
  const { profile, loading: profileLoading, updateBalance, refetch } = useProfile()
  const { items } = useRecurringItems()
  const { transactions, refetch: refetchTxns } = useTransactions(50)
  const projection = useProjection(profile?.balance ?? null, items)
  const [showImport, setShowImport] = useState(false)

  if (profileLoading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">A carregar…</div>
  }

  if (!profile) return null

  return (
    <div className="pb-6">
      <BalanceCard
        balance={profile.balance}
        updatedAt={profile.balance_updated_at}
        onUpdate={updateBalance}
      />
      <AlertBanner criticalDay={projection?.criticalDay ?? null} />
      {projection && (
        <ProjectionChart days={projection.days} criticalDay={projection.criticalDay} />
      )}
      <MonthSummary transactions={transactions} onImportCSV={() => setShowImport(true)} />
      <RecentTransactions transactions={transactions} />
      {showImport && (
        <CSVImportSheet
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); refetchTxns() }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 7: Test dashboard manually**

After completing onboarding, navigate to /dashboard. Verify:
- Balance card shows correct balance
- Projection chart renders
- Month summary shows transactions (or empty state)
- Recent transactions list works

- [ ] **Step 8: Commit**

```bash
git add src/
git commit -m "feat: dashboard — balance card, alert banner, projection chart, month summary, recent transactions"
```

---

## Phase 6 — Transactions Tab + CSV Import

### Task 12: TransactionList + Transactions page

**Files:**
- Create: `src/components/TransactionList.tsx`, `src/app/transactions/page.tsx`

- [ ] **Step 1: Write TransactionList** at `src/components/TransactionList.tsx`

```typescript
'use client'
import { formatCurrency, formatShortDate } from '@/lib/format'
import type { Database } from '@/lib/supabase/types'

type Transaction = Database['public']['Tables']['transactions']['Row']

interface Props {
  transactions: Transaction[]
  loading: boolean
}

export default function TransactionList({ transactions, loading }: Props) {
  if (loading) return <div className="py-10 text-center text-gray-400">A carregar…</div>

  if (transactions.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-gray-400">Sem transações</p>
      </div>
    )
  }

  // Group by date
  const groups = transactions.reduce<Record<string, Transaction[]>>((acc, t) => {
    acc[t.date] = acc[t.date] ?? []
    acc[t.date].push(t)
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-4">
      {Object.entries(groups).map(([date, txns]) => (
        <div key={date}>
          <p className="text-xs font-semibold text-gray-400 px-4 mb-2">{formatShortDate(date)}</p>
          <div className="bg-white rounded-2xl shadow-sm mx-4 divide-y divide-gray-50">
            {txns.map(t => (
              <div key={t.id} className="flex justify-between items-center px-4 py-3">
                <p className="text-sm text-gray-800 truncate max-w-[60%]">{t.description}</p>
                <span className={`text-sm font-semibold ${t.amount < 0 ? 'text-red-500' : 'text-green-600'}`}>
                  {formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Write Transactions page** at `src/app/transactions/page.tsx`

```typescript
'use client'
import { useState } from 'react'
import TransactionList from '@/components/TransactionList'
import CSVImportSheet from '@/components/CSVImportSheet'
import { useTransactions } from '@/hooks/useTransactions'

export default function TransactionsPage() {
  const { transactions, loading, refetch } = useTransactions()
  const [showImport, setShowImport] = useState(false)

  return (
    <div className="pt-4 pb-6">
      <div className="flex items-center justify-between px-4 mb-4">
        <h1 className="text-xl font-bold text-gray-900">Transações</h1>
        <button
          onClick={() => setShowImport(true)}
          className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg"
        >
          Importar CSV
        </button>
      </div>
      <TransactionList transactions={transactions} loading={loading} />
      {showImport && (
        <CSVImportSheet
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); refetch() }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/
git commit -m "feat: transactions page + grouped list component"
```

---

### Task 13: CSV Import Sheet (bottom-sheet modal)

**Files:**
- Create: `src/components/CSVImportSheet.tsx`

- [ ] **Step 1: Write CSVImportSheet** at `src/components/CSVImportSheet.tsx`

```typescript
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { parseCSV, applyMapping, type ColumnMapping } from '@/lib/csv'
import { categorize } from '@/lib/categorize'
import { createClient } from '@/lib/supabase/client'
import { useCategories } from '@/hooks/useCategories'
import { formatCurrency, formatShortDate } from '@/lib/format'

type ImportStep = 'upload' | 'mapping' | 'preview' | 'done'

interface Props {
  onClose: () => void
  onImported: () => void
}

export default function CSVImportSheet({ onClose, onImported }: Props) {
  const { rules } = useCategories()
  const [step, setStep] = useState<ImportStep>('upload')
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<ColumnMapping | null>(null)
  const [ignoreDuplicates, setIgnoreDuplicates] = useState(true)
  const [importedCount, setImportedCount] = useState(0)
  const [loading, setLoading] = useState(false)

  async function loadSavedMapping() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase.from('user_settings').select('*').eq('user_id', user.id).single()
    if (data?.csv_column_date) {
      return {
        dateCol: data.csv_column_date,
        descriptionCol: data.csv_column_description!,
        amountCol: data.csv_column_amount!,
        negativeIsExpense: data.csv_negative_is_expense,
      } as ColumnMapping
    }
    return null
  }

  async function handleFile(file: File) {
    setLoading(true)
    const { headers: h, rows } = await parseCSV(file)
    setHeaders(h)
    setRawRows(rows)

    const saved = await loadSavedMapping()
    if (saved) {
      setMapping(saved)
      setStep('preview')
    } else {
      // Initialise mapping from first 3 headers so the form is never in an uninitialised state
      setMapping({
        dateCol: h[0] ?? '',
        descriptionCol: h[1] ?? '',
        amountCol: h[2] ?? '',
        negativeIsExpense: true,
      })
      setStep('mapping')
    }
    setLoading(false)
  }

  async function handleConfirmImport() {
    if (!mapping) return
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const parsed = applyMapping(rawRows, mapping)

    let toInsert = parsed.map(row => ({
      user_id: user.id,
      date: row.date,
      description: row.description,
      amount: row.amount,
      category_id: categorize(row.description, rules),
      source: 'csv' as const,
    }))

    if (ignoreDuplicates) {
      // Fetch existing (date, description, amount) combos
      const { data: existing } = await supabase
        .from('transactions')
        .select('date, description, amount')
        .eq('user_id', user.id)

      const existingSet = new Set(
        (existing ?? []).map(t => `${t.date}|${t.description}|${t.amount}`)
      )
      toInsert = toInsert.filter(
        t => !existingSet.has(`${t.date}|${t.description}|${t.amount}`)
      )
    }

    if (toInsert.length > 0) {
      await supabase.from('transactions').insert(toInsert)
    }

    // Save mapping back to user_settings so future imports auto-skip mapping step
    await supabase.from('user_settings').upsert({
      user_id: user.id,
      csv_column_date: mapping.dateCol,
      csv_column_description: mapping.descriptionCol,
      csv_column_amount: mapping.amountCol,
      csv_negative_is_expense: mapping.negativeIsExpense,
      updated_at: new Date().toISOString(),
    })

    setImportedCount(toInsert.length)
    setStep('done')
    setLoading(false)
  }

  const preview = mapping ? applyMapping(rawRows, mapping) : []

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Importar CSV</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">✕</button>
        </div>

        <div className="px-6 py-6">
          {step === 'upload' && (
            <div className="flex flex-col gap-4">
              <div
                onClick={() => document.getElementById('csv-file-input')?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400"
              >
                <p className="text-4xl mb-2">📂</p>
                <p className="text-gray-500 text-sm">Clica para selecionar CSV</p>
                <input
                  id="csv-file-input"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
                />
              </div>
              {loading && <p className="text-blue-600 text-sm text-center">A ler…</p>}
            </div>
          )}

          {step === 'mapping' && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-gray-600">Mapeia as colunas do teu CSV:</p>
              {(['dateCol', 'descriptionCol', 'amountCol'] as const).map(field => {
                const labels = { dateCol: 'Data', descriptionCol: 'Descrição', amountCol: 'Valor' }
                return (
                  <div key={field}>
                    <label className="text-sm font-medium text-gray-700">{labels[field]}</label>
                    <select
                      value={(mapping as any)?.[field] ?? headers[0]}
                      onChange={e => setMapping(m => ({ ...(m ?? { dateCol: headers[0], descriptionCol: headers[1], amountCol: headers[2], negativeIsExpense: true }), [field]: e.target.value }))}
                      className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    >
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                )
              })}
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={mapping?.negativeIsExpense ?? true}
                  onChange={e => setMapping(m => ({ ...(m!), negativeIsExpense: e.target.checked }))}
                  className="w-4 h-4 accent-blue-600"
                />
                Valor negativo = despesa
              </label>
              <button
                onClick={() => setStep('preview')}
                disabled={!mapping}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold disabled:opacity-40"
              >
                Ver pré-visualização
              </button>
            </div>
          )}

          {step === 'preview' && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between text-sm text-gray-500">
                <span>{preview.length} transações · {preview[0]?.date} → {preview[preview.length-1]?.date}</span>
                <button onClick={() => setStep('mapping')} className="text-blue-600">Alterar mapeamento</button>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={ignoreDuplicates}
                  onChange={e => setIgnoreDuplicates(e.target.checked)}
                  className="w-4 h-4 accent-blue-600"
                />
                Ignorar duplicados
              </label>
              <div className="max-h-48 overflow-y-auto flex flex-col gap-2">
                {preview.slice(0, 20).map((row, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-600 truncate max-w-[65%]">{row.description}</span>
                    <span className={row.amount < 0 ? 'text-red-500' : 'text-green-600'}>
                      {formatCurrency(row.amount)}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={handleConfirmImport}
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold disabled:opacity-40"
              >
                {loading ? 'A importar…' : `Importar ${preview.length} transações`}
              </button>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-6 flex flex-col gap-4">
              <span className="text-5xl">✅</span>
              <p className="font-semibold text-gray-900">{importedCount} transações importadas</p>
              <Link
                href="/transactions?filter=uncategorized"
                onClick={onImported}
                className="w-full py-3 border border-blue-600 text-blue-600 rounded-xl font-semibold text-sm"
              >
                Categorizar agora →
              </Link>
              <button onClick={onImported} className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold">
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Test CSV import from Transactions tab**

Open /transactions → click "Importar CSV" → upload a real CSV file → verify import flow works end-to-end.

- [ ] **Step 3: Commit**

```bash
git add src/components/CSVImportSheet.tsx
git commit -m "feat: CSV import bottom-sheet modal (upload → mapping → preview → done)"
```

---

## Phase 7 — Simulator Tab

### Task 14: Simulator page

**Files:**
- Create: `src/app/simulator/page.tsx`, `src/components/SimulatorPanel.tsx`

- [ ] **Step 1: Write SimulatorPanel** at `src/components/SimulatorPanel.tsx`

```typescript
'use client'
import { useState, useMemo } from 'react'
import { formatCurrency, formatShortDate } from '@/lib/format'
import { computeSimulatedProjection, type ProjectionResult } from '@/lib/projection'

interface Props {
  projection: ProjectionResult
  currentBalance: number
  onRegister: (amount: number) => Promise<void>
}

export default function SimulatorPanel({ projection, currentBalance, onRegister }: Props) {
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)

  const spendAmount = parseFloat(input.replace(',', '.')) || 0
  const simulated = useMemo(
    () => spendAmount > 0 ? computeSimulatedProjection(projection, spendAmount) : null,
    [projection, spendAmount]
  )

  const resultBalance = currentBalance - spendAmount
  const safe = simulated ? simulated.criticalDay === null : true

  async function handleRegister() {
    if (spendAmount <= 0) return
    setSaving(true)
    await onRegister(spendAmount)
    setSaving(false)
    setInput('')
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Simular gasto</h1>
        <p className="text-gray-400 text-sm mt-1">Quanto queres gastar?</p>
      </div>

      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">€</span>
        <input
          autoFocus
          type="text"
          inputMode="decimal"
          value={input}
          onChange={e => setInput(e.target.value.replace(/[^0-9,.]/g, ''))}
          placeholder="0,00"
          className="w-full pl-10 pr-4 py-5 text-3xl font-bold border-2 border-gray-200 rounded-2xl focus:border-blue-600 focus:outline-none"
        />
      </div>

      {spendAmount > 0 && (
        <div className="bg-gray-50 rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Saldo resultante</span>
            <span className={`font-bold text-lg ${resultBalance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {formatCurrency(resultBalance)}
            </span>
          </div>
          {simulated && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Novo dia crítico</span>
              <span className="font-medium text-sm">
                {simulated.criticalDay ? formatShortDate(simulated.criticalDay) : '—'}
              </span>
            </div>
          )}
          {projection.criticalDay && simulated?.criticalDay && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Delta</span>
              <span className="text-sm text-orange-600">
                {Math.round(
                  (new Date(simulated.criticalDay).getTime() - new Date(projection.criticalDay).getTime()) / 86400000
                )} dias
              </span>
            </div>
          )}
          {safe ? (
            <div className="bg-green-50 text-green-700 rounded-xl px-4 py-2 text-sm font-medium text-center">
              ✅ Estás bem nos próximos 30 dias
            </div>
          ) : (
            <div className="bg-red-50 text-red-700 rounded-xl px-4 py-2 text-sm font-medium text-center">
              ⚠️ Este gasto antecipa o dia crítico
            </div>
          )}
        </div>
      )}

      <button
        onClick={handleRegister}
        disabled={spendAmount <= 0 || saving}
        className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl disabled:opacity-40 active:scale-95 transition"
      >
        {saving ? 'A registar…' : 'Registar gasto'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Write Simulator page** at `src/app/simulator/page.tsx`

```typescript
'use client'
import SimulatorPanel from '@/components/SimulatorPanel'
import { useProfile } from '@/hooks/useProfile'
import { useRecurringItems } from '@/hooks/useRecurringItems'
import { useProjection } from '@/hooks/useProjection'
import { createClient } from '@/lib/supabase/client'

export default function SimulatorPage() {
  const { profile, updateBalance, refetch } = useProfile()
  const { items } = useRecurringItems()
  const projection = useProjection(profile?.balance ?? null, items)

  async function handleRegister(amount: number) {
    if (!profile) return
    // Create manual transaction
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('transactions').insert({
      user_id: user.id,
      date: new Date().toISOString().split('T')[0],
      description: 'Gasto registado',
      amount: -amount, // negative = expense
      source: 'manual',
    })
    // Decrement balance
    await updateBalance(profile.balance - amount)
    await refetch()
  }

  if (!profile || !projection) {
    return <div className="flex items-center justify-center h-64 text-gray-400">A carregar…</div>
  }

  return (
    <SimulatorPanel
      projection={projection}
      currentBalance={profile.balance}
      onRegister={handleRegister}
    />
  )
}
```

- [ ] **Step 3: Test simulator**

Navigate to /simulator → enter an amount → verify simulation shows correct delta → tap "Registar gasto" → verify balance updates in dashboard.

- [ ] **Step 4: Commit**

```bash
git add src/
git commit -m "feat: simulator tab — real-time projection + register spend"
```

---

## Phase 8 — Config Tab

### Task 15: Config page (balance, recurring items, account)

> Note: Full category/rules editing UI is deferred (spec open question #6). This task implements balance editing, recurring items management, and sign-out.

**Files:**
- Create: `src/app/config/page.tsx`, `src/components/RecurringItemForm.tsx`

- [ ] **Step 1: Write RecurringItemForm** at `src/components/RecurringItemForm.tsx`

```typescript
'use client'
import { useState } from 'react'

export interface RecurringFormData {
  name: string
  amount: number
  type: 'expense' | 'income'
  frequency: 'monthly' | 'weekly' | 'quinzenal' | 'yearly'
  next_date: string
}

interface Props {
  onSave: (data: RecurringFormData) => Promise<void>
  onCancel: () => void
}

export default function RecurringItemForm({ onSave, onCancel }: Props) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [frequency, setFrequency] = useState<RecurringFormData['frequency']>('monthly')
  const [saving, setSaving] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  async function handleSave() {
    const n = parseFloat(amount.replace(',', '.'))
    if (!name.trim() || isNaN(n) || n <= 0) return
    setSaving(true)
    await onSave({ name: name.trim(), amount: n, type, frequency, next_date: today })
    setSaving(false)
  }

  return (
    <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-3">
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Nome (ex: Renda)"
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
          <input
            value={amount}
            onChange={e => setAmount(e.target.value.replace(/[^0-9,.]/g, ''))}
            inputMode="decimal"
            placeholder="0,00"
            className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
        <select
          value={type}
          onChange={e => setType(e.target.value as 'expense' | 'income')}
          className="border border-gray-200 rounded-lg px-2 text-sm"
        >
          <option value="expense">Despesa</option>
          <option value="income">Rendimento</option>
        </select>
      </div>
      <select
        value={frequency}
        onChange={e => setFrequency(e.target.value as RecurringFormData['frequency'])}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
      >
        <option value="monthly">Mensal</option>
        <option value="weekly">Semanal</option>
        <option value="quinzenal">Quinzenal</option>
        <option value="yearly">Anual</option>
      </select>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-40"
        >
          {saving ? 'A guardar…' : 'Guardar'}
        </button>
        <button onClick={onCancel} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">
          Cancelar
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write Config page** at `src/app/config/page.tsx`

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/useProfile'
import { useRecurringItems } from '@/hooks/useRecurringItems'
import RecurringItemForm, { type RecurringFormData } from '@/components/RecurringItemForm'
import { formatCurrency } from '@/lib/format'

export default function ConfigPage() {
  const router = useRouter()
  const { profile, updateBalance } = useProfile()
  const { items, addItem, removeItem } = useRecurringItems()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingBalance, setEditingBalance] = useState(false)
  const [balanceInput, setBalanceInput] = useState('')

  async function handleBalanceSave() {
    const n = parseFloat(balanceInput.replace(',', '.'))
    if (isNaN(n)) return
    await updateBalance(n)
    setEditingBalance(false)
  }

  async function handleAddRecurring(data: RecurringFormData) {
    await addItem(data)
    setShowAddForm(false)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <div className="pt-4 pb-6 flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900 px-4">Configurações</h1>

      {/* Balance section */}
      <section className="px-4">
        <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Saldo</p>
        <div className="bg-white rounded-2xl shadow-sm p-4">
          {editingBalance ? (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                <input
                  autoFocus
                  value={balanceInput}
                  onChange={e => setBalanceInput(e.target.value.replace(/[^0-9,.\-]/g, ''))}
                  className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
                  inputMode="decimal"
                />
              </div>
              <button onClick={handleBalanceSave} className="bg-blue-600 text-white px-4 rounded-lg text-sm font-semibold">OK</button>
              <button onClick={() => setEditingBalance(false)} className="text-gray-400 px-2">✕</button>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-gray-700">{profile ? formatCurrency(profile.balance) : '…'}</span>
              <button
                onClick={() => { setBalanceInput(profile?.balance.toFixed(2).replace('.', ',') ?? ''); setEditingBalance(true) }}
                className="text-blue-600 text-sm"
              >
                Editar
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Recurring items section */}
      <section className="px-4">
        <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Despesas & Rendimentos Fixos</p>
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
          {items.map(item => (
            <div key={item.id} className="flex justify-between items-center px-4 py-3">
              <div>
                <p className="text-sm text-gray-800">{item.name}</p>
                <p className="text-xs text-gray-400">{item.frequency} · {item.type === 'expense' ? 'Despesa' : 'Rendimento'}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-semibold ${item.type === 'expense' ? 'text-red-500' : 'text-green-600'}`}>
                  {formatCurrency(item.amount)}
                </span>
                <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-400 text-lg">×</button>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-6">Sem itens fixos</p>
          )}
        </div>

        {showAddForm ? (
          <div className="mt-3">
            <RecurringItemForm onSave={handleAddRecurring} onCancel={() => setShowAddForm(false)} />
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full mt-3 py-3 border-2 border-dashed border-blue-200 text-blue-600 text-sm font-medium rounded-xl"
          >
            + Adicionar
          </button>
        )}
      </section>

      {/* Account section */}
      <section className="px-4">
        <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Conta</p>
        <div className="bg-white rounded-2xl shadow-sm">
          <button
            onClick={handleSignOut}
            className="w-full text-left px-4 py-4 text-red-500 font-medium text-sm"
          >
            Terminar sessão
          </button>
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 3: Test Config tab**

Navigate to /config. Verify:
- Balance edit works
- Can add a new recurring item
- Can remove an item
- Sign out works

- [ ] **Step 4: Commit**

```bash
git add src/
git commit -m "feat: config tab — balance edit, recurring items CRUD, sign out"
```

---

## Phase 9 — Deploy

### Task 16: Vercel deployment

**Files:**
- Modify: `next.config.ts` (if needed)

- [ ] **Step 1: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Import project to Vercel**

Go to https://vercel.com → Import from GitHub → select `duartesousaneves/StayAlive`.

- [ ] **Step 3: Set environment variables in Vercel**

In Vercel project settings → Environment Variables → add:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

- [ ] **Step 4: Update Supabase OAuth callback URL**

In Supabase → Auth → Providers → Google → add production redirect URL:
`https://your-app.vercel.app/auth/callback`

- [ ] **Step 5: Trigger deploy and test**

Vercel auto-deploys on push. Visit the production URL and complete full onboarding flow.

- [ ] **Step 6: Commit**

```bash
git commit --allow-empty -m "chore: trigger vercel production deploy"
```

---

## Known Gaps (Not in MVP Scope)

- **Config tab — Category editing UI**: Spec open question #6 — design not done yet. Categories are created during onboarding but cannot be edited/deleted from Config in this MVP.
- **Transactions tab — uncategorized filter**: The "Categorizar agora" link passes `?filter=uncategorized` but the `TransactionList` component does not implement filtering by category. Wiring up this filter (read `searchParams`, pass to hook, filter results) is left for a follow-up task after the core flow is stable.
- **PWA manifest + service worker**: Not configured. Add `public/manifest.json` and `next-pwa` in v2.
- **Notifications**: Push notifications for critical day approaching — v2.
- **Multiple CSV merge**: Deduplication only; complex merge logic — v2.

