-- ============================================================================
-- MIGRATION 4: ferramentas do empreendedor (plano pago)
--   * quotes: orçamentos enviados por link, com follow-up
--   * tenants.links: página de links (Instagram e afins)
-- Acesso a `quotes` só pelo servidor (service_role); sem policy = anon/authenticated negados.
-- ============================================================================

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null unique,
  customer_name text not null,
  customer_phone text not null,
  items jsonb not null default '[]'::jsonb,
  notes text,
  valid_until date,
  total_cents integer not null default 0,
  status text not null default 'draft',
  sent_at timestamptz,
  viewed_at timestamptz,
  decided_at timestamptz,
  followup_at date,
  followup_done_at timestamptz,
  followup_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quotes_status_chk
    check (status in ('draft', 'sent', 'viewed', 'accepted', 'declined')),
  constraint quotes_total_chk check (total_cents >= 0)
);

create index if not exists idx_quotes_tenant_created
  on public.quotes (tenant_id, created_at desc);
create index if not exists idx_quotes_followup
  on public.quotes (tenant_id, followup_at)
  where followup_done_at is null and followup_at is not null;

drop trigger if exists trg_quotes_updated_at on public.quotes;
create trigger trg_quotes_updated_at
  before update on public.quotes
  for each row execute function public.set_updated_at();

alter table public.quotes enable row level security;
revoke all on public.quotes from anon, authenticated;

-- Página de links: [{ "label": "...", "url": "https://..." }]
alter table public.tenants
  add column if not exists links jsonb not null default '[]'::jsonb;

grant select (links) on public.tenants to anon, authenticated;
