-- Lista de espera do lançamento
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  phone text not null check (char_length(phone) between 12 and 13),
  profession text check (profession is null or char_length(profession) <= 60),
  source text,
  created_at timestamptz not null default now(),
  constraint waitlist_phone_key unique (phone)
);
create index if not exists waitlist_created_idx on public.waitlist (created_at desc);
alter table public.waitlist enable row level security;
