-- ============================================================================
-- MIGRATION 2: fluxo "chat -> preview -> pagamento -> publicado"
-- O cliente não precisa criar conta: o acesso ao painel é por link com token
-- (guardamos só o hash). O acesso ao banco pelo servidor usa service_role.
-- ============================================================================

alter table public.tenants alter column owner_id drop not null;

alter table public.tenants
  add column if not exists edit_token_hash text,
  add column if not exists payer_email text,
  add column if not exists mp_preapproval_id text unique,
  add column if not exists meta_pixel_id text,
  add column if not exists google_tag_id text,
  add column if not exists published_at timestamptz;

-- draft | active | past_due | cancelled
alter table public.tenants alter column subscription_status set default 'draft';
alter table public.tenants
  drop constraint if exists tenants_subscription_status_chk;
alter table public.tenants
  add constraint tenants_subscription_status_chk
  check (subscription_status in ('draft', 'active', 'past_due', 'cancelled'));

create index if not exists idx_tenants_edit_token_hash
  on public.tenants (edit_token_hash) where edit_token_hash is not null;

-- Colunas sensíveis (hash do token, e-mail, id de pagamento) não podem ser lidas
-- com a anon key. Revogar só a coluna não funciona se existe SELECT na tabela
-- inteira, então: revoga na tabela e concede apenas as colunas seguras.
-- O servidor usa service_role (não é afetado).
drop policy if exists "Leitura pública de tenants ativos" on public.tenants;
drop policy if exists "Leitura pública de tenants publicados" on public.tenants;
create policy "Leitura pública de tenants publicados"
  on public.tenants
  for select
  using ((subscription_status = 'active' and is_active = true) or owner_id = auth.uid());

revoke select on public.tenants from anon, authenticated;
grant select (
  id, owner_id, slug, custom_domain, business_name, category, city,
  whatsapp_number, address, opening_hours, headline, description,
  primary_color, services, images, logo_url, is_active, subscription_status,
  meta_pixel_id, google_tag_id, published_at, created_at, updated_at
) on public.tenants to anon, authenticated;
