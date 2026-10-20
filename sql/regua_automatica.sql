-- ════════════════════════════════════════════════════════════════════════
-- Régua automática (follow-up por WhatsApp) — Ubique CRM
-- (2026-10-17 · migrado p/ WhatsApp 2026-10-20)
-- Motor de disparo pros segmentos (abandonou carrinho / em risco / frios).
-- Tudo DESLIGADO por padrão (ativo=false) e com trava anti-spam (cooldown).
-- Rode no SQL Editor do Supabase. O envio em si é feito pela edge function
-- regua-automatica (WhatsApp; e-mail via Resend ainda suportado por canal).
-- ⚠️ WhatsApp mira no TELEFONE do cliente (c.phone). Iniciado pela empresa
-- exige template aprovado se usar a API oficial da Meta (Cloud API); Z-API/
-- Evolution mandam texto livre. O texto abaixo é o conteúdo da mensagem.
-- ════════════════════════════════════════════════════════════════════════

-- 1) Regras da régua (editáveis) ──────────────────────────────────────────
create table if not exists crm.automacoes (
  id                serial primary key,
  nome              text not null,
  segmento          text not null,                 -- abandonou | em_risco | frios
  canal             text not null default 'whatsapp', -- whatsapp | email
  assunto           text,                              -- só e-mail (WhatsApp ignora)
  corpo             text,                              -- texto; suporta {{nome}}
  cooldown_dias     int  not null default 14,       -- não reenvia pro mesmo antes disso
  limite_por_rodada int  not null default 200,      -- teto por execução (segurança)
  ativo             boolean not null default false, -- liga/desliga a regra
  created_at        timestamptz default now()
);

-- 2) Log de envios (dedupe + histórico) ───────────────────────────────────
create table if not exists crm.automacao_envios (
  id           bigserial primary key,
  automacao_id int references crm.automacoes(id) on delete cascade,
  client_id    uuid,
  canal        text,
  status       text default 'sent',               -- sent | failed
  erro         text,
  enviado_em   timestamptz default now()
);
create index if not exists automacao_envios_idx
  on crm.automacao_envios (automacao_id, client_id, enviado_em);

-- RLS: só admin lê/edita pelo app (a edge function usa service role e bypassa).
alter table crm.automacoes enable row level security;
alter table crm.automacao_envios enable row level security;
drop policy if exists automacoes_admin on crm.automacoes;
create policy automacoes_admin on crm.automacoes for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists automacao_envios_admin on crm.automacao_envios;
create policy automacao_envios_admin on crm.automacao_envios for all using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on crm.automacoes to authenticated;
grant usage, select on sequence crm.automacoes_id_seq to authenticated;
grant select on crm.automacao_envios to authenticated;

-- 3) Clientes elegíveis de uma regra (segmento + anti-spam + tem contato) ──
-- canal='whatsapp' → mira c.phone; canal='email' → mira c.email. Retorna o
-- contato certo em "contato" e a "materia" (só p/ o segmento interesse_materia;
-- null nos demais) pra personalizar a mensagem com {{materia}}.
-- drop antes: o retorno mudou (ganhou "materia"), e create or replace não troca
-- o tipo de retorno de uma função existente.
drop function if exists crm.regua_pendentes(int);
create or replace function crm.regua_pendentes(p_automacao_id int)
returns table (client_id uuid, contato text, nome text, materia text)
language plpgsql
security definer
set search_path = crm, public
as $$
declare a crm.automacoes%rowtype;
begin
  select * into a from crm.automacoes where id = p_automacao_id and ativo;
  if not found then return; end if;

  -- Segmento por INTERESSE de matéria: pessoa com sinal forte numa matéria e
  -- que ainda não comprou. A matéria de maior interesse vai na mensagem.
  -- Peso dos sinais igual ao do painel: comprar 5 > fascículo/lead 4 >
  -- questões 3 > bloqueio 2 > navegou 1.
  -- Segmentos que usam a matéria de maior interesse (vai no {{materia}}):
  -- interesse_materia (score>=4), interesse_forte (score>=8) e bateu_cota
  -- (respondeu questões E bateu na cota de 10/dia). Todos só "não comprou".
  if a.segmento in ('interesse_materia','interesse_forte','bateu_cota') then
    return query
    with sinais as (
      select w.client_id, w.materia,
             sum(case w.event_type
                   when 'buy_click' then 5 when 'fasciculo' then 4 when 'lead' then 4
                   when 'vis_questao' then 3 when 'vis_trancada' then 2
                   when 'vis_cota' then 2 when 'vis_convite' then 2 else 1 end) as score
        from crm.web_events w
       where w.client_id is not null and w.materia is not null and w.materia <> ''
       group by w.client_id, w.materia
    ),
    topm as (
      select distinct on (client_id) client_id, materia, score
        from sinais order by client_id, score desc
    )
    select c.id,
           case when a.canal = 'whatsapp' then c.phone else c.email end,
           c.full_name, t.materia
      from crm.clients c
      join topm t on t.client_id = c.id
     where coalesce(c.status,'') <> 'blocked'
       and c.first_purchase_at is null and coalesce(c.status,'') <> 'customer'
       and case when a.canal = 'whatsapp'
                then (c.phone is not null and c.phone <> '')
                else (c.email is not null and c.email <> '') end
       and case a.segmento
             when 'interesse_materia' then t.score >= 4
             when 'interesse_forte'   then t.score >= 8
             when 'bateu_cota' then (
               exists (select 1 from crm.web_events w2 where w2.client_id = c.id and w2.event_type in ('vis_questao','vis_corrigiu'))
               and exists (select 1 from crm.web_events w3 where w3.client_id = c.id and w3.event_type = 'vis_cota'))
             else false end
       and not exists (
         select 1 from crm.automacao_envios e
          where e.automacao_id = p_automacao_id and e.client_id = c.id
            and e.enviado_em > now() - make_interval(days => a.cooldown_dias))
     limit a.limite_por_rodada;
    return;
  end if;

  -- Segmentos por estágio (materia null).
  return query
  with base as (
    select c.id,
           case when a.canal = 'whatsapp' then c.phone else c.email end as contato,
           c.full_name
    from crm.clients c
    where coalesce(c.status,'') <> 'blocked'
      and case when a.canal = 'whatsapp'
               then (c.phone is not null and c.phone <> '')
               else (c.email is not null and c.email <> '') end
      and case a.segmento
        when 'abandonou' then (
          c.first_purchase_at is null and coalesce(c.status,'') <> 'customer'
          and exists (select 1 from crm.web_events w where w.client_id = c.id and w.event_type = 'buy_click'))
        when 'em_risco' then (
          coalesce(c.status,'') = 'customer'
          and c.last_activity_at is not null
          and c.last_activity_at < now() - interval '45 days')
        when 'frios' then (
          coalesce(c.status,'') = 'lead'
          and not exists (select 1 from crm.web_events w where w.client_id = c.id))
        -- criou conta e sumiu: tem conta (app_user ou vis_conta_criada), não
        -- comprou e sem atividade há 2+ dias.
        when 'conta_sumiu' then (
          c.first_purchase_at is null and coalesce(c.status,'') <> 'customer'
          and (c.app_user_id is not null
               or exists (select 1 from crm.web_events w where w.client_id = c.id and w.event_type = 'vis_conta_criada'))
          and coalesce(c.last_activity_at,
                       (select max(w.created_at) from crm.web_events w where w.client_id = c.id))
              < now() - interval '2 days')
        else false
      end
  )
  select b.id, b.contato, b.full_name, null::text
  from base b
  where not exists (
    select 1 from crm.automacao_envios e
    where e.automacao_id = p_automacao_id
      and e.client_id = b.id
      and e.enviado_em > now() - make_interval(days => a.cooldown_dias))
  limit a.limite_por_rodada;
end;
$$;

grant execute on function crm.regua_pendentes(int) to authenticated;

-- 4) Regras padrão (só na primeira vez; ficam DESLIGADAS) ─────────────────
-- Texto de WhatsApp: curto, pessoal, 1 chamada pra ação, sem assunto/HTML.
insert into crm.automacoes (nome, segmento, canal, corpo, cooldown_dias)
select * from (values
  ('Recuperar carrinho', 'abandonou', 'whatsapp',
   'Oi {{nome}}, tudo bem? Vi que você começou a escolher um curso na Falcon, mas não finalizou. Posso te ajudar a concluir? Se ficou alguma dúvida sobre conteúdo, prazo ou pagamento, é só me responder por aqui que a gente resolve juntos. — Falcon',
   10),
  ('Reengajar cliente em risco', 'em_risco', 'whatsapp',
   'Oi {{nome}}, senti sua falta nos estudos. Faz um tempo que você não entra na plataforma — que tal retomar de onde parou? Se quiser, posso te enviar um roteiro rápido do edital para destravar esta semana. É só responder. — Falcon',
   21),
  ('Reativar lead frio', 'frios', 'whatsapp',
   'Oi {{nome}}, você criou conta na Falcon, mas ainda não começou a usar. Tem conteúdo liberado esperando por você: questões comentadas e a primeira unidade de cada matéria. Qualquer dúvida sobre por onde começar, é só me chamar por aqui. — Falcon',
   30)
) as v(nome, segmento, canal, corpo, cooldown_dias)
where not exists (select 1 from crm.automacoes);

-- 4b) Migração (idempotente): se as regras já existiam no e-mail, passa pra
-- WhatsApp e troca o texto antigo (HTML) pelo texto de WhatsApp. Só mexe nas 3
-- regras padrão por nome; não toca em regras que você tenha criado/editado.
update crm.automacoes set canal = 'whatsapp', assunto = null,
  corpo = 'Oi {{nome}}, tudo bem? Vi que você começou a escolher um curso na Falcon, mas não finalizou. Posso te ajudar a concluir? Se ficou alguma dúvida sobre conteúdo, prazo ou pagamento, é só me responder por aqui que a gente resolve juntos. — Falcon'
 where nome = 'Recuperar carrinho' and corpo like '<p>%';
update crm.automacoes set canal = 'whatsapp', assunto = null,
  corpo = 'Oi {{nome}}, senti sua falta nos estudos. Faz um tempo que você não entra na plataforma — que tal retomar de onde parou? Se quiser, posso te enviar um roteiro rápido do edital para destravar esta semana. É só responder. — Falcon'
 where nome = 'Reengajar cliente em risco' and corpo like '<p>%';
update crm.automacoes set canal = 'whatsapp', assunto = null,
  corpo = 'Oi {{nome}}, você criou conta na Falcon, mas ainda não começou a usar. Tem conteúdo liberado esperando por você: questões comentadas e a primeira unidade de cada matéria. Qualquer dúvida sobre por onde começar, é só me chamar por aqui. — Falcon'
 where nome = 'Reativar lead frio' and corpo like '<p>%';

-- 4c) Regra NOVA: oferta por interesse de matéria (idempotente por nome).
-- Dispara pra quem tem sinal forte numa matéria e não comprou. Usa {{materia}}.
insert into crm.automacoes (nome, segmento, canal, corpo, cooldown_dias)
select 'Oferta por interesse', 'interesse_materia', 'whatsapp',
  'Oi {{nome}}, vi que você andou estudando {{materia}} aqui na Falcon. Quer destravar o conteúdo completo dessa matéria — teoria, questões comentadas e o tutor de IA? É só me responder que eu te mostro como começar. — Falcon',
  14
where not exists (select 1 from crm.automacoes where nome = 'Oferta por interesse');

-- 4d) Regras NOVAS por combo de comportamento (idempotentes por nome).
insert into crm.automacoes (nome, segmento, canal, corpo, cooldown_dias)
select 'Bateu no limite grátis', 'bateu_cota', 'whatsapp',
  'Oi {{nome}}, vi que você mandou bem nas questões e esbarrou no limite de 10 por dia da versão gratuita. No plano completo, as questões são ilimitadas e todas com o comentário do professor. Quer destravar {{materia}}? É só me chamar. — Falcon', 14
where not exists (select 1 from crm.automacoes where nome = 'Bateu no limite grátis');

insert into crm.automacoes (nome, segmento, canal, corpo, cooldown_dias)
select 'Interesse forte em matéria', 'interesse_forte', 'whatsapp',
  'Oi {{nome}}, dá para ver que {{materia}} é a sua prioridade — você andou estudando bastante aqui na Falcon. Quer o pacote completo dessa matéria (teoria, questões comentadas e o tutor)? Te mostro como. — Falcon', 14
where not exists (select 1 from crm.automacoes where nome = 'Interesse forte em matéria');

insert into crm.automacoes (nome, segmento, canal, corpo, cooldown_dias)
select 'Criou conta e sumiu', 'conta_sumiu', 'whatsapp',
  'Oi {{nome}}, você criou sua conta na Falcon, mas sumiu faz alguns dias. Travou em algo para começar? Tem conteúdo liberado esperando por você — é só me chamar que eu te dou um empurrão. — Falcon', 7
where not exists (select 1 from crm.automacoes where nome = 'Criou conta e sumiu');


-- ─────────────────────────── PARTE 2 (agendamento) ───────────────────────
-- Roda a régua todo dia (precisa das extensões pg_cron E pg_net habilitadas).
-- Troque <REGUA_CRON_SECRET> pelo mesmo valor do secret da edge function.
--
-- select cron.unschedule(jobid) from cron.job where jobname = 'regua-automatica';
-- select cron.schedule('regua-automatica', '0 13 * * *',  -- ~10h BRT
--   $cron$
--   select net.http_post(
--     url := 'https://kluqjqojxzpuiauuidwx.supabase.co/functions/v1/regua-automatica',
--     headers := jsonb_build_object('Content-Type','application/json','x-regua-secret','<REGUA_CRON_SECRET>'),
--     body := '{}'::jsonb
--   );
--   $cron$);
