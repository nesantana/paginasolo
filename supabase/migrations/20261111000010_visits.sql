-- ============================================================================
-- MIGRATION 10: visita técnica (plano pago)
--   * visits: visita ao cliente com anotações, itens e retorno (follow-up)
--   * pode virar um orçamento (quote_id guarda qual)
-- Acesso só pelo servidor (service_role); sem policy = anon/authenticated negados.
-- ============================================================================

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  quote_id uuid references public.quotes(id) on delete set null,
  customer_name text not null,
  customer_phone text,
  title text not null default 'Visita técnica',
  address text,
  starts_on date not null,
  start_time time,
  duration_min integer not null default 60,
  status text not null default 'scheduled',
  -- [{ "id": "...", "text": "...", "at": "ISO" }]
  notes jsonb not null default '[]'::jsonb,
  -- [{ "title": "...", "qty": 1, "price_cents": 0 }]
  items jsonb not null default '[]'::jsonb,
  followup_at date,
  followup_done_at timestamptz,
  followup_note text,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint visits_status_chk check (status in ('scheduled', 'done', 'cancelled')),
  constraint visits_duration_chk check (duration_min between 15 and 720)
);

create index if not exists idx_visits_tenant_day on public.visits (tenant_id, starts_on, start_time);
create index if not exists idx_visits_tenant_followup on public.visits (tenant_id, followup_at) where followup_at is not null;

drop trigger if exists trg_visits_updated_at on public.visits;
create trigger trg_visits_updated_at
  before update on public.visits
  for each row execute function public.set_updated_at();

alter table public.visits enable row level security;
revoke all on public.visits from anon, authenticated;
