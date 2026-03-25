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
  amount numeric not null,
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
  amount numeric not null check (amount > 0),
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
