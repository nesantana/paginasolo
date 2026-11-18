-- Catálogo de produtos e serviços do autônomo (preços que alimentam orçamentos e o assistente)
create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  kind text not null default 'service' check (kind in ('service', 'product')),
  name text not null check (char_length(name) between 1 and 80),
  description text,
  price_cents integer not null default 0 check (price_cents >= 0 and price_cents <= 100000000),
  unit text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists catalog_items_tenant_idx on public.catalog_items (tenant_id, active, name);
alter table public.catalog_items enable row level security;
