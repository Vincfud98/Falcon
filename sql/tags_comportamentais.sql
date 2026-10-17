-- ════════════════════════════════════════════════════════════════════════
-- Tags comportamentais automáticas — Ubique CRM (2026-10-17)
--
-- Cria 3 tags REAIS (crm.tags) e mantém crm.client_tag_links sincronizado
-- a partir do rastreamento (crm.web_events). São aplicadas sozinhas:
--   · comp-lead-quente         🔥 score >= 15 (intenção de compra forte)
--   · comp-visitou-venda       clicou em comprar (buy_click)
--   · comp-abandonou-carrinho  clicou comprar, sem compra e não é cliente
--
-- O score espelha o do admin: pageview=1, buy_click=20, fasciculo/lead=5,
-- +5 se o último evento foi nos últimos 7 dias.
--
-- COMO RODAR no SQL Editor do Supabase (projeto kluqjqojxzpuiauuidwx):
--   1) Rode a PARTE 1 (função + grant + 1ª execução) — sempre funciona.
--   2) Rode a PARTE 2 (agendamento) — precisa da extensão pg_cron ligada
--      (Dashboard › Database › Extensions › pg_cron). Se der "schema cron
--      does not exist", ligue a extensão e rode a PARTE 2 de novo.
-- Sem a PARTE 2, o botão "↻ Recalcular agora" no admin já atualiza na mão.
-- ════════════════════════════════════════════════════════════════════════


-- ─────────────────────────── PARTE 1 ───────────────────────────
create or replace function crm.recomputar_tags_comportamentais()
returns jsonb
language plpgsql
security definer
set search_path = crm, public
as $$
declare
  v_quente    int;
  v_visitou   int;
  v_abandonou int;
  n_quente    int;
  n_visitou   int;
  n_abandonou int;
begin
  -- 1) Garante as 3 tags (idempotente por slug) ──────────────────────────
  select id into v_quente from crm.tags where slug = 'comp-lead-quente';
  if v_quente is null then
    insert into crm.tags(name, slug, color, description, brand_id)
    values ('🔥 Lead quente', 'comp-lead-quente', '#e08a5a',
            'Automática: score alto no rastreamento (intenção de compra forte).', null)
    returning id into v_quente;
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

  -- 2) Remove vínculos que não valem mais (só das 3 tags comp-*) ──────────
  with scored as (
    select e.client_id,
           e.base + case when e.last_at >= now() - interval '7 days' then 5 else 0 end as score,
           e.teve_buy, c.first_purchase_at, c.status
    from (
      select client_id,
             sum(case event_type when 'pageview'  then 1
                                 when 'buy_click' then 20
                                 when 'fasciculo' then 5
                                 when 'lead'      then 5
                                 else 0 end)             as base,
             max(created_at)                             as last_at,
             bool_or(event_type = 'buy_click')           as teve_buy
      from crm.web_events
      where client_id is not null
      group by client_id
    ) e
    join crm.clients c on c.id = e.client_id
  ),
  alvo as (
    select client_id, v_quente    as tag_id from scored where score >= 15
    union all
    select client_id, v_visitou            from scored where teve_buy
    union all
    select client_id, v_abandonou          from scored
      where teve_buy and first_purchase_at is null and coalesce(status, '') <> 'customer'
  )
  delete from crm.client_tag_links l
   where l.tag_id in (v_quente, v_visitou, v_abandonou)
     and not exists (select 1 from alvo a where a.client_id = l.client_id and a.tag_id = l.tag_id);

  -- 3) Insere os vínculos novos ──────────────────────────────────────────
  with scored as (
    select e.client_id,
           e.base + case when e.last_at >= now() - interval '7 days' then 5 else 0 end as score,
           e.teve_buy, c.first_purchase_at, c.status
    from (
      select client_id,
             sum(case event_type when 'pageview'  then 1
                                 when 'buy_click' then 20
                                 when 'fasciculo' then 5
                                 when 'lead'      then 5
                                 else 0 end)             as base,
             max(created_at)                             as last_at,
             bool_or(event_type = 'buy_click')           as teve_buy
      from crm.web_events
      where client_id is not null
      group by client_id
    ) e
    join crm.clients c on c.id = e.client_id
  ),
  alvo as (
    select client_id, v_quente    as tag_id from scored where score >= 15
    union all
    select client_id, v_visitou            from scored where teve_buy
    union all
    select client_id, v_abandonou          from scored
      where teve_buy and first_purchase_at is null and coalesce(status, '') <> 'customer'
  )
  insert into crm.client_tag_links(client_id, tag_id)
  select a.client_id, a.tag_id from alvo a
   where not exists (select 1 from crm.client_tag_links l
                      where l.client_id = a.client_id and l.tag_id = a.tag_id);

  select count(*) into n_quente    from crm.client_tag_links where tag_id = v_quente;
  select count(*) into n_visitou   from crm.client_tag_links where tag_id = v_visitou;
  select count(*) into n_abandonou from crm.client_tag_links where tag_id = v_abandonou;

  return jsonb_build_object(
    'quente', n_quente, 'visitou', n_visitou, 'abandonou', n_abandonou, 'rodou_em', now()
  );
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
