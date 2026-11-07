-- ============================================================================
-- MIGRATION: 20261106000001_initial_multitenant_schema.sql
-- SaaS Multitenant de Landing Pages Ultra-Rápidas (PáginaSolo / MSSolo)
-- Banco: Supabase PostgreSQL com Row Level Security (RLS)
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. TABELA: public.profiles (Vinculada ao Supabase Auth auth.users)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone_number text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Usuários podem ler o próprio perfil"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "Usuários podem inserir o próprio perfil"
  on public.profiles
  for insert
  with check (auth.uid() = id);

create policy "Usuários podem atualizar o próprio perfil"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Trigger automático para criar profile quando um usuário se cadastra no Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone_number)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone_number', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 2. TABELA: public.tenants (Landing Pages Multitenant)
-- ----------------------------------------------------------------------------
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  slug text not null unique,
  custom_domain text unique,
  business_name text not null,
  category text not null,
  city text not null default 'Campo Grande - MS',
  whatsapp_number text not null,
  address text,
  opening_hours text,
  headline text,
  description text,
  primary_color text not null default '#0f172a',
  services jsonb not null default '[]'::jsonb, -- Array de [{ title, description, price_optional }]
  images jsonb not null default '[]'::jsonb,   -- Array de URLs
  logo_url text,
  is_active boolean not null default true,
  subscription_status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenants_slug_format_chk check (slug ~ '^[a-z0-9-]+$')
);

create index if not exists idx_tenants_slug on public.tenants (slug);
create index if not exists idx_tenants_custom_domain on public.tenants (custom_domain) where custom_domain is not null;
create index if not exists idx_tenants_owner_id on public.tenants (owner_id);

-- Trigger para atualizar updated_at automaticamente
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_tenants_updated_at on public.tenants;
create trigger trg_tenants_updated_at
  before update on public.tenants
  for each row execute procedure public.set_updated_at();

alter table public.tenants enable row level security;

-- Políticas de RLS para public.tenants:
-- 1) SELECT público onde is_active = true (ou se for o próprio dono visualizando no dashboard)
create policy "Leitura pública de tenants ativos"
  on public.tenants
  for select
  using (is_active = true or owner_id = auth.uid());

-- 2) INSERT restrito ao owner_id = auth.uid()
create policy "Dono pode criar seu tenant"
  on public.tenants
  for insert
  with check (owner_id = auth.uid());

-- 3) UPDATE restrito ao owner_id = auth.uid()
create policy "Dono pode atualizar seu tenant"
  on public.tenants
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- 4) DELETE restrito ao owner_id = auth.uid()
create policy "Dono pode excluir seu tenant"
  on public.tenants
  for delete
  using (owner_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 3. TABELA: public.analytics_events (Métricas Leves de Conversão)
-- ----------------------------------------------------------------------------
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  event_type text not null check (event_type in ('pageview', 'click_whatsapp', 'click_call', 'click_maps')),
  referrer text,
  user_agent text,
  created_at timestamptz not null default now()
);

-- Índice composto exigido para consultas agregadas rápidas nos últimos 30 dias
create index if not exists idx_analytics_tenant_created_event
  on public.analytics_events (tenant_id, created_at desc, event_type);

alter table public.analytics_events enable row level security;

-- Políticas de RLS para public.analytics_events:
-- 1) INSERT público para coleta leve de métricas via API (/api/track)
create policy "Inserção pública de eventos de analytics"
  on public.analytics_events
  for insert
  with check (
    exists (
      select 1 from public.tenants t
      where t.id = analytics_events.tenant_id
        and t.is_active = true
    )
  );

-- 2) SELECT restrito ao dono do tenant correspondente
create policy "Apenas o dono do tenant pode visualizar métricas"
  on public.analytics_events
  for select
  using (
    exists (
      select 1 from public.tenants t
      where t.id = analytics_events.tenant_id
        and t.owner_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 4. STORAGE BUCKET: tenant-assets (Logos e Fotos de Serviços)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('tenant-assets', 'tenant-assets', true)
on conflict (id) do nothing;

create policy "Leitura pública de fotos e logos dos tenants"
  on storage.objects
  for select
  using (bucket_id = 'tenant-assets');

create policy "Usuários autenticados podem enviar imagens para sua pasta"
  on storage.objects
  for insert
  with check (
    bucket_id = 'tenant-assets'
    and auth.role() = 'authenticated'
  );
