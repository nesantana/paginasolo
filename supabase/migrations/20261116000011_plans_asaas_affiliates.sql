-- ============================================================================
-- MIGRATION 11: planos (mensal Pix/Asaas, anual cartão/Mercado Pago) + afiliados
--  - tenants guarda o plano, a validade do acesso e os ids do Asaas
--  - afiliados: link de indicação, comissão (padrão 30%) só sobre o 1º pagamento
--    de cada indicado, carência de 30 dias, saque por Pix pago por fora
--  - tabelas sem policy: todo acesso é do servidor (service_role)
-- ============================================================================

alter table public.tenants
  add column if not exists plan text,
  add column if not exists plan_expires_at timestamptz,
  add column if not exists asaas_customer_id text,
  add column if not exists asaas_subscription_id text unique,
  add column if not exists last_payment_ref text;

alter table public.tenants drop constraint if exists tenants_plan_chk;
alter table public.tenants
  add constraint tenants_plan_chk check (plan is null or plan in ('monthly', 'annual'));

create table if not exists public.affiliates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants(id) on delete cascade,
  kind text not null default 'client' check (kind in ('client', 'influencer')),
  code text not null unique check (code ~ '^[a-z0-9-]{3,30}$'),
  rate numeric(5,2) not null default 30 check (rate >= 0 and rate <= 100),
  -- quantos pagamentos de cada indicado geram comissão (null = todos). Padrão: só o primeiro.
  max_payments int default 1 check (max_payments is null or max_payments >= 1),
  active boolean not null default true,
  pix_key text,
  pix_key_type text check (pix_key_type is null or pix_key_type in ('cpf', 'cnpj', 'email', 'telefone', 'aleatoria')),
  created_at timestamptz not null default now()
);

create table if not exists public.affiliate_referrals (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  referred_tenant_id uuid not null unique references public.tenants(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists affiliate_referrals_affiliate_idx on public.affiliate_referrals (affiliate_id);

create table if not exists public.affiliate_payouts (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  pix_key text not null,
  pix_key_type text,
  status text not null default 'solicitado' check (status in ('solicitado', 'pago', 'recusado')),
  note text,
  requested_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists affiliate_payouts_affiliate_idx on public.affiliate_payouts (affiliate_id);

create table if not exists public.affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  referral_id uuid not null references public.affiliate_referrals(id) on delete cascade,
  payment_ref text not null unique,
  payment_amount numeric(10,2) not null,
  rate numeric(5,2) not null,
  amount numeric(10,2) not null,
  cancelled boolean not null default false,
  available_at timestamptz not null,
  payout_id uuid references public.affiliate_payouts(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists affiliate_commissions_affiliate_idx on public.affiliate_commissions (affiliate_id);

alter table public.affiliates enable row level security;
alter table public.affiliate_referrals enable row level security;
alter table public.affiliate_payouts enable row level security;
alter table public.affiliate_commissions enable row level security;
revoke all on public.affiliates, public.affiliate_referrals, public.affiliate_payouts, public.affiliate_commissions from anon, authenticated;

-- Comissão: chamada só pelos webhooks. Idempotente por pagamento (payment_ref).
create or replace function public.record_affiliate_commission(p_tenant uuid, p_amount numeric, p_ref text)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.affiliate_referrals;
  a public.affiliates;
  v_count int; v_amount numeric;
begin
  if p_amount is null or p_amount <= 0 or p_ref is null then return null; end if;
  select * into r from public.affiliate_referrals where referred_tenant_id = p_tenant;
  if r.id is null then return null; end if;
  select * into a from public.affiliates where id = r.affiliate_id;
  if not a.active or a.rate <= 0 then return null; end if;
  if exists (select 1 from public.affiliate_commissions where payment_ref = p_ref) then return null; end if;
  select count(*) into v_count from public.affiliate_commissions where referral_id = r.id and not cancelled;
  if a.max_payments is not null and v_count >= a.max_payments then return null; end if;
  v_amount := round(p_amount * a.rate / 100, 2);
  if v_amount <= 0 then return null; end if;
  insert into public.affiliate_commissions (affiliate_id, referral_id, payment_ref, payment_amount, rate, amount, available_at)
  values (a.id, r.id, p_ref, p_amount, a.rate, v_amount, now() + interval '30 days')
  on conflict (payment_ref) do nothing;
  return v_amount;
end $$;

create or replace function public.cancel_affiliate_commission(p_ref text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.affiliate_commissions set cancelled = true where payment_ref = p_ref
$$;

-- Saque: soma o saldo liberado e trava as comissões no pedido (atômico).
create or replace function public.request_affiliate_payout(p_affiliate uuid, p_min numeric)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.affiliates;
  v_total numeric; pid uuid;
begin
  select * into a from public.affiliates where id = p_affiliate for update;
  if a.id is null then raise exception 'no_affiliate'; end if;
  if a.pix_key is null then raise exception 'pix_required'; end if;
  select coalesce(sum(amount), 0) into v_total from public.affiliate_commissions
   where affiliate_id = a.id and not cancelled and payout_id is null and available_at <= now();
  if v_total < p_min then raise exception 'below_minimum'; end if;
  insert into public.affiliate_payouts (affiliate_id, amount, pix_key, pix_key_type)
  values (a.id, v_total, a.pix_key, a.pix_key_type) returning id into pid;
  update public.affiliate_commissions set payout_id = pid
   where affiliate_id = a.id and not cancelled and payout_id is null and available_at <= now();
  return pid;
end $$;

-- Admin marca o saque como pago/recusado; recusado devolve as comissões ao saldo.
create or replace function public.mark_affiliate_payout(p_id uuid, p_status text, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('pago', 'recusado') then raise exception 'invalid_status'; end if;
  update public.affiliate_payouts
     set status = p_status, note = p_note, paid_at = case when p_status = 'pago' then now() else null end
   where id = p_id and status = 'solicitado';
  if not found then raise exception 'payout_not_open'; end if;
  if p_status = 'recusado' then
    update public.affiliate_commissions set payout_id = null where payout_id = p_id;
  end if;
end $$;

revoke all on function public.record_affiliate_commission(uuid, numeric, text) from public, anon, authenticated;
revoke all on function public.cancel_affiliate_commission(text) from public, anon, authenticated;
revoke all on function public.request_affiliate_payout(uuid, numeric) from public, anon, authenticated;
revoke all on function public.mark_affiliate_payout(uuid, text, text) from public, anon, authenticated;
grant execute on function public.record_affiliate_commission(uuid, numeric, text) to service_role;
grant execute on function public.cancel_affiliate_commission(text) to service_role;
grant execute on function public.request_affiliate_payout(uuid, numeric) to service_role;
grant execute on function public.mark_affiliate_payout(uuid, text, text) to service_role;
