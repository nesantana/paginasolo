-- Catálogo ligado ao site e ao pós-venda
alter table public.catalog_items add column if not exists show_on_site boolean not null default false;
alter table public.catalog_items add column if not exists revisit_days integer check (revisit_days is null or (revisit_days between 7 and 730));

-- Pós-venda e retorno: o que já foi feito em cada contrato
alter table public.contracts add column if not exists aftersale_done_at timestamptz;
alter table public.contracts add column if not exists revisit_done_at timestamptz;
