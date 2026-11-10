-- ============================================================================
-- MIGRATION 8: agenda do profissional autônomo (plano pago)
--   * appointments: serviços marcados com o cliente (dia, hora, endereço)
--   * agenda_digests: controle do e-mail diário (1 por dono por dia, sem duplicar)
-- Acesso só pelo servidor (service_role); sem policy = anon/authenticated negados.
-- ============================================================================

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  contract_id uuid references public.contracts(id) on delete set null,
  customer_name text not null,
  customer_phone text,
  title text not null,
  address text,
  notes text,
  starts_on date not null,
  start_time time,
  status text not null default 'scheduled',
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_status_chk check (status in ('scheduled', 'done', 'cancelled'))
);

create index if not exists idx_appointments_tenant_day
  on public.appointments (tenant_id, starts_on, start_time);

drop trigger if exists trg_appointments_updated_at on public.appointments;
create trigger trg_appointments_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

create table if not exists public.agenda_digests (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  day date not null,
  sent_at timestamptz not null default now(),
  primary key (tenant_id, day)
);

alter table public.appointments enable row level security;
alter table public.agenda_digests enable row level security;
revoke all on public.appointments from anon, authenticated;
revoke all on public.agenda_digests from anon, authenticated;
