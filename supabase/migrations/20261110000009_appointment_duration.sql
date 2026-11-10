-- ============================================================================
-- MIGRATION 9: duração do serviço (para avisar conflitos de horário na agenda)
-- ============================================================================

alter table public.appointments
  add column if not exists duration_min integer not null default 60;

alter table public.appointments drop constraint if exists appointments_duration_chk;
alter table public.appointments add constraint appointments_duration_chk
  check (duration_min between 15 and 720);
