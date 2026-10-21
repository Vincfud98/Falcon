-- ════════════════════════════════════════════════════════════════════════
-- Pagamentos — Mercado Pago (Fase 1) — 2026-10-17
-- Só adiciona a coluna/índice que o webhook usa pra ser idempotente.
-- O resto do modelo (vendas.orders, vendas.payments, trigger que libera
-- acesso) já existe. Rode no SQL Editor do Supabase.
-- ════════════════════════════════════════════════════════════════════════

-- Id do pagamento no gateway (ex.: id do pagamento no Mercado Pago).
alter table vendas.payments add column if not exists gateway_payment_id text;

-- Único por gateway_payment_id (NULLs são distintos no Postgres, então os
-- pagamentos manuais sem id seguem convivendo). Permite o upsert do webhook.
create unique index if not exists payments_gateway_payment_id_uidx
  on vendas.payments (gateway_payment_id);

-- Nº de parcelas (cartão). 1 = à vista / demais métodos.
alter table vendas.payments add column if not exists installments int default 1;

-- Recarrega o cache do PostgREST (senão o front reclama de coluna inexistente).
notify pgrst, 'reload schema';
