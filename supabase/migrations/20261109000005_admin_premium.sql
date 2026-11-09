-- Premium concedido pelo admin (cortesia): site ativo sem passar pelo Mercado Pago.
alter table public.tenants
  add column if not exists complimentary boolean not null default false,
  add column if not exists comp_note text;

-- Nada de grant para anon/authenticated: ficam invisíveis pela anon key.
-- Só o servidor (service_role) lê e escreve.

-- Defesa em profundidade: o navegador nunca escreve em tenants (tudo passa pelo
-- servidor com service_role), então tiramos INSERT/UPDATE/DELETE de anon/authenticated.
revoke insert, update, delete on public.tenants from anon, authenticated;
