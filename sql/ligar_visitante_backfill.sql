-- ════════════════════════════════════════════════════════════════════════
-- BACKFILL retroativo: liga eventos antigos ao cliente SEM esperar o lead
-- voltar a logar. Para todo visitor_id que já tem ao menos um evento com
-- client_id (carimbado numa sessão logada), propaga esse mesmo client_id
-- para os eventos órfãos (client_id null) do mesmo visitante.
-- Não adivinha: usa a identidade que o próprio visitante já estabeleceu.
-- Rodar UMA vez no SQL Editor do Supabase.
-- ════════════════════════════════════════════════════════════════════════

with mapa as (
  select distinct on (visitor_id)
         visitor_id,
         client_id
    from crm.web_events
   where client_id is not null
     and visitor_id is not null
   order by visitor_id, created_at desc
)
update crm.web_events e
   set client_id = m.client_id
  from mapa m
 where e.visitor_id = m.visitor_id
   and e.client_id is null;
