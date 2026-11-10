-- ============================================================================
-- MIGRATION 6: tema visual do site (o dono escolhe entre 5 formatos)
-- ============================================================================

alter table public.tenants
  add column if not exists theme text not null default 'moderno';

alter table public.tenants
  drop constraint if exists tenants_theme_check;
alter table public.tenants
  add constraint tenants_theme_check
  check (theme in ('moderno', 'clinica', 'restaurante', 'servicos', 'beleza'));

-- Leitura pública só das colunas seguras (ver migration 2).
grant select (theme) on public.tenants to anon, authenticated;
