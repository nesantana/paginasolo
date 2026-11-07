-- ============================================================================
-- MIGRATION 3: recursos extras do site (galeria, depoimentos, FAQ, oferta)
-- `images` já existe (jsonb). Aqui entram os demais campos editáveis pelo dono.
-- ============================================================================

alter table public.tenants
  add column if not exists faq jsonb not null default '[]'::jsonb,
  add column if not exists testimonials jsonb not null default '[]'::jsonb,
  add column if not exists offer_text text,
  add column if not exists google_reviews_url text;

-- Leitura pública só das colunas seguras (ver migration 2).
grant select (faq, testimonials, offer_text, google_reviews_url)
  on public.tenants to anon, authenticated;
