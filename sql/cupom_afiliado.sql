-- ════════════════════════════════════════════════════════════════════════
-- Programa de afiliados no cupom — catalogo.coupons
-- Cada cupom pode pertencer a um influencer, que ganha comissão por venda
-- (% da venda ou UbiTokens). O admin calcula vendas/receita/comissão.
-- Aditivo e idempotente. Rode no SQL Editor do Supabase.
-- ════════════════════════════════════════════════════════════════════════

alter table catalogo.coupons add column if not exists afiliado_nome    text;
alter table catalogo.coupons add column if not exists afiliado_contato text;   -- @handle ou WhatsApp
alter table catalogo.coupons add column if not exists afiliado_tipo    text default 'influencer';  -- influencer | aluno (indique e ganhe)
alter table catalogo.coupons add column if not exists comissao_tipo    text default 'nenhum';  -- nenhum | percent | ubitokens
alter table catalogo.coupons add column if not exists comissao_valor   numeric;

notify pgrst, 'reload schema';
