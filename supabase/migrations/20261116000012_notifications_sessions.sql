-- ============================================================================
-- MIGRATION 12: notificações (sino + navegador) e sessões longas
--  - notifications: histórico do sino do painel
--  - push_subscriptions: aparelhos que aceitaram notificação do navegador (Web Push)
--  - tenant_sessions: um token por aparelho. Antes, entrar em um aparelho trocava o
--    token único do site e derrubava o login dos outros.
--  Só o servidor (service_role) acessa: sem policy.
-- ============================================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null default '',
  url text not null default '/dashboard',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_tenant_idx on public.notifications (tenant_id, created_at desc);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_tenant_idx on public.push_subscriptions (tenant_id);

create table if not exists public.tenant_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists tenant_sessions_tenant_idx on public.tenant_sessions (tenant_id);

alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.tenant_sessions enable row level security;
revoke all on public.notifications, public.push_subscriptions, public.tenant_sessions from anon, authenticated;
