-- ============================================================================
-- MIGRATION 7: contratos e controle de pagamentos (plano pago)
--   * tenants: chave Pix e documento de quem recebe
--   * contracts: contrato com link público (aceite eletrônico simples)
--   * payments: parcelas (no início, na entrega, em data), com status
-- O sistema NÃO movimenta dinheiro: gera o Pix (copia e cola/QR) e o dono confirma o recebimento.
-- Acesso só pelo servidor (service_role); sem policy = anon/authenticated negados.
-- ============================================================================

alter table public.tenants
  add column if not exists pix_key text,
  add column if not exists pix_key_type text,
  add column if not exists owner_doc text;

alter table public.tenants drop constraint if exists tenants_pix_type_chk;
alter table public.tenants add constraint tenants_pix_type_chk
  check (pix_key_type is null or pix_key_type in ('cpf', 'cnpj', 'email', 'phone', 'random'));
-- Sem grant de leitura para anon/authenticated: só o servidor lê estas colunas.

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  quote_id uuid references public.quotes(id) on delete set null,
  code text not null unique,
  title text not null,
  scope text not null default '',
  customer_name text not null,
  customer_phone text not null,
  customer_doc text,
  customer_address text,
  total_cents integer not null default 0,
  delivery_date date,
  extra_terms text,
  status text not null default 'draft',
  sent_at timestamptz,
  viewed_at timestamptz,
  signed_at timestamptz,
  signed_name text,
  signed_ip_hash text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contracts_status_chk
    check (status in ('draft', 'sent', 'signed', 'completed', 'cancelled')),
  constraint contracts_total_chk check (total_cents >= 0)
);

create index if not exists idx_contracts_tenant_created
  on public.contracts (tenant_id, created_at desc);

drop trigger if exists trg_contracts_updated_at on public.contracts;
create trigger trg_contracts_updated_at
  before update on public.contracts
  for each row execute function public.set_updated_at();

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  position integer not null default 0,
  label text not null,
  amount_cents integer not null,
  -- upfront = no início | date = em data fixa | on_completion = na entrega do serviço
  due_kind text not null default 'date',
  due_date date,
  -- pending = a receber | informed = cliente avisou que pagou | paid = recebido | cancelled
  status text not null default 'pending',
  paid_at timestamptz,
  paid_method text,
  informed_at timestamptz,
  note text,
  last_reminder_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_kind_chk check (due_kind in ('upfront', 'date', 'on_completion')),
  constraint payments_status_chk check (status in ('pending', 'informed', 'paid', 'cancelled')),
  constraint payments_amount_chk check (amount_cents > 0)
);

create index if not exists idx_payments_contract on public.payments (contract_id, position);
create index if not exists idx_payments_tenant_due
  on public.payments (tenant_id, due_date)
  where status in ('pending', 'informed');

drop trigger if exists trg_payments_updated_at on public.payments;
create trigger trg_payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

alter table public.contracts enable row level security;
alter table public.payments enable row level security;
revoke all on public.contracts from anon, authenticated;
revoke all on public.payments from anon, authenticated;
