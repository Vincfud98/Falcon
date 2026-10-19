-- ════════════════════════════════════════════════════════════════════════
-- Tags comportamentais automáticas — Ubique CRM
-- (2026-10-17 · ampliado 2026-10-19: toda atividade rastreada vira tag)
--
-- Cria tags REAIS (crm.tags) e mantém crm.client_tag_links sincronizado a
-- partir do rastreamento (crm.web_events). TODAS as atividades que o portal
-- registra têm uma tag aqui. São aplicadas sozinhas (cron a cada 10 min ou
-- botão "Recalcular agora"):
--   · comp-lead-quente          score >= 15 (intenção de compra forte)
--   · comp-visitou-venda        clicou em comprar (buy_click)
--   · comp-abandonou-carrinho   clicou comprar, sem compra e não é cliente
--   · comp-criou-conta          criou conta pelo app/portal (vis_conta_criada)
--   · comp-respondeu-questoes   corrigiu/respondeu questões (vis_corrigiu/vis_cota)
--   · comp-bateu-bloqueio       cota/trancado/convite de login/paywall (quente p/ upgrade)
--   · comp-explorou-portal      navegou/abriu conteúdo (vis_inicio/vis_pagina/pageview/fasciculo)
--
-- ⚠️ A tag só aparece quando o evento tem client_id. A maioria da atividade
-- é anônima — rode antes/junto o sql/ligar_visitante_backfill.sql para ligar
-- visitante→cliente, senão quase nada é tageado.
--
-- O score espelha o do admin: pageview=1, buy_click=20, fasciculo/lead=5,
-- +5 se o último evento foi nos últimos 7 dias.
--
-- COMO RODAR no SQL Editor do Supabase (projeto kluqjqojxzpuiauuidwx):
--   1) PARTE 1 (função + grant + 1ª execução) — sempre funciona.
--   2) PARTE 2 (agendamento) — precisa da extensão pg_cron ligada.
-- ════════════════════════════════════════════════════════════════════════


-- ─────────────────────────── PARTE 1 ───────────────────────────
create or replace function crm.recomputar_tags_comportamentais()
returns jsonb
language plpgsql
security definer
set search_path = crm, public
as $$
declare
  v_quente     int;
  v_visitou    int;
  v_abandonou  int;
  v_conta      int;
  v_respondeu  int;
  v_bloqueio   int;
  v_explorou   int;
  res          jsonb;
begin
  -- 1) Garante as tags (idempotente por slug) ────────────────────────────
  select id into v_quente from crm.tags where slug = 'comp-lead-quente';
  if v_quente is null then
    insert into crm.tags(name, slug, color, description, brand_id)
    values ('Lead quente', 'comp-lead-quente', '#e08a5a',
            'Automática: score alto no rastreamento (intenção de compra forte).', null)
    returning id into v_quente;
  else
    update crm.tags set name = 'Lead quente' where id = v_quente and name <> 'Lead quente';
  end if;

  select id into v_visitou from crm.tags where slug = 'comp-visitou-venda';
  if v_visitou is null then
    insert into crm.tags(name, slug, color, description, brand_id)
    values ('Visitou página de venda', 'comp-visitou-venda', '#6b8cae',
            'Automática: clicou em comprar em algum momento.', null)
    returning id into v_visitou;
  end if;

  select id into v_abandonou from crm.tags where slug = 'comp-abandonou-carrinho';
  if v_abandonou is null then
    insert into crm.tags(name, slug, color, description, brand_id)
    values ('Abandonou carrinho', 'comp-abandonou-carrinho', '#c77272',
            'Automática: clicou em comprar, sem compra e ainda não é cliente.', null)
    returning id into v_abandonou;
  end if;

  select id into v_conta from crm.tags where slug = 'comp-criou-conta';
  if v_conta is null then
    insert into crm.tags(name, slug, color, description, brand_id)
    values ('Tentou criar conta', 'comp-criou-conta', '#6aa06a',
            'Automática: tentou criar conta grátis (pré-lançamento: pode não virar conta real).', null)
    returning id into v_conta;
  else
    update crm.tags set name = 'Tentou criar conta',
           description = 'Automática: tentou criar conta grátis (pré-lançamento: pode não virar conta real).'
     where id = v_conta and name <> 'Tentou criar conta';
  end if;

  select id into v_respondeu from crm.tags where slug = 'comp-respondeu-questoes';
  if v_respondeu is null then
    insert into crm.tags(name, slug, color, description, brand_id)
    values ('Respondeu questões', 'comp-respondeu-questoes', '#7e9c8c',
            'Automática: corrigiu/respondeu questões no portal.', null)
    returning id into v_respondeu;
  end if;

  select id into v_bloqueio from crm.tags where slug = 'comp-bateu-bloqueio';
  if v_bloqueio is null then
    insert into crm.tags(name, slug, color, description, brand_id)
    values ('Bateu em bloqueio', 'comp-bateu-bloqueio', '#d19a52',
            'Automática: esbarrou em cota/conteúdo trancado/convite de login (quente p/ upgrade).', null)
    returning id into v_bloqueio;
  end if;

  select id into v_explorou from crm.tags where slug = 'comp-explorou-portal';
  if v_explorou is null then
    insert into crm.tags(name, slug, color, description, brand_id)
    values ('Explorou o portal', 'comp-explorou-portal', '#8a8f98',
            'Automática: navegou/abriu conteúdo no portal (degustação).', null)
    returning id into v_explorou;
  end if;

  -- 2) Recalcula tudo: zera e repovoa os vínculos destas tags comp-* ──────
  create temporary table _alvo on commit drop as
  with agg as (
    select e.client_id,
           e.base + case when e.last_at >= now() - interval '7 days' then 5 else 0 end as score,
           e.teve_buy, e.criou_conta, e.respondeu, e.bloqueio, e.explorou,
           c.first_purchase_at, c.status
    from (
      select client_id,
             sum(case event_type when 'pageview'  then 1
                                 when 'buy_click' then 20
                                 when 'fasciculo' then 5
                                 when 'lead'      then 5
                                 else 0 end)                                   as base,
             max(created_at)                                                   as last_at,
             bool_or(event_type = 'buy_click')                                 as teve_buy,
             bool_or(event_type = 'vis_conta_criada')                          as criou_conta,
             bool_or(event_type in ('vis_corrigiu','vis_questao'))             as respondeu,
             bool_or(event_type in ('vis_cota','vis_trancada','vis_convite','paywall')) as bloqueio,
             bool_or(event_type in ('vis_inicio','vis_pagina','pageview','fasciculo')) as explorou
      from crm.web_events
      where client_id is not null
      group by client_id
    ) e
    join crm.clients c on c.id = e.client_id
  )
  select client_id, v_quente    as tag_id from agg where score >= 15
  union all
  select client_id, v_visitou            from agg where teve_buy
  union all
  select client_id, v_abandonou          from agg
    where teve_buy and first_purchase_at is null and coalesce(status, '') <> 'customer'
  union all
  select client_id, v_conta              from agg where criou_conta
  union all
  select client_id, v_respondeu          from agg where respondeu
  union all
  select client_id, v_bloqueio           from agg where bloqueio
  union all
  select client_id, v_explorou           from agg where explorou;

  delete from crm.client_tag_links l
   where l.tag_id in (v_quente, v_visitou, v_abandonou, v_conta, v_respondeu, v_bloqueio, v_explorou)
     and not exists (select 1 from _alvo a where a.client_id = l.client_id and a.tag_id = l.tag_id);

  insert into crm.client_tag_links(client_id, tag_id)
  select a.client_id, a.tag_id from _alvo a
   where not exists (select 1 from crm.client_tag_links l
                      where l.client_id = a.client_id and l.tag_id = a.tag_id);

  select jsonb_build_object(
    'quente',    (select count(*) from crm.client_tag_links where tag_id = v_quente),
    'visitou',   (select count(*) from crm.client_tag_links where tag_id = v_visitou),
    'abandonou', (select count(*) from crm.client_tag_links where tag_id = v_abandonou),
    'criou_conta',(select count(*) from crm.client_tag_links where tag_id = v_conta),
    'respondeu', (select count(*) from crm.client_tag_links where tag_id = v_respondeu),
    'bloqueio',  (select count(*) from crm.client_tag_links where tag_id = v_bloqueio),
    'explorou',  (select count(*) from crm.client_tag_links where tag_id = v_explorou),
    'rodou_em',  now()
  ) into res;

  return res;
end;
$$;

grant execute on function crm.recomputar_tags_comportamentais() to authenticated;

-- 1ª execução (popula as tags agora)
select crm.recomputar_tags_comportamentais();


-- ─────────────────────────── PARTE 2 (pg_cron) ───────────────────────────
-- Recalcula a cada 10 minutos. Precisa da extensão pg_cron ligada.
select cron.unschedule(jobid) from cron.job where jobname = 'tags-comportamentais';
select cron.schedule('tags-comportamentais', '*/10 * * * *',
  $cron$ select crm.recomputar_tags_comportamentais(); $cron$);
