-- ════════════════════════════════════════════════════════════════════════
-- Régua automática (follow-up) — Ubique CRM — 2026-10-17
-- Motor de disparo pros segmentos (abandonou carrinho / em risco / frios).
-- Tudo DESLIGADO por padrão (ativo=false) e com trava anti-spam (cooldown).
-- Rode no SQL Editor do Supabase. O envio em si é feito pela edge function
-- regua-automatica (e-mail via Resend).
-- ════════════════════════════════════════════════════════════════════════

-- 1) Regras da régua (editáveis) ──────────────────────────────────────────
create table if not exists crm.automacoes (
  id                serial primary key,
  nome              text not null,
  segmento          text not null,                 -- abandonou | em_risco | frios
  canal             text not null default 'email', -- email (whatsapp: futuro)
  assunto           text,
  corpo             text,                           -- HTML; suporta {{nome}}
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

-- 3) Clientes elegíveis de uma regra (segmento + anti-spam + tem e-mail) ──
create or replace function crm.regua_pendentes(p_automacao_id int)
returns table (client_id uuid, email text, nome text)
language plpgsql
security definer
set search_path = crm, public
as $$
declare a crm.automacoes%rowtype;
begin
  select * into a from crm.automacoes where id = p_automacao_id and ativo;
  if not found then return; end if;

  return query
  with base as (
    select c.id, c.email, c.full_name
    from crm.clients c
    where c.email is not null and c.email <> '' and coalesce(c.status,'') <> 'blocked'
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
        else false
      end
  )
  select b.id, b.email, b.full_name
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
insert into crm.automacoes (nome, segmento, assunto, corpo, cooldown_dias)
select * from (values
  ('Recuperar carrinho', 'abandonou',
   'Faltou pouco pra começar, {{nome}} 👋',
   '<p>Oi {{nome}},</p><p>Vi que você chegou a escolher um curso da Ubique mas não concluiu. Posso te ajudar a finalizar? Qualquer dúvida sobre conteúdo, prazo ou pagamento, é só responder este e-mail.</p><p>— Equipe Ubique</p>',
   10),
  ('Reengajar cliente em risco', 'em_risco',
   '{{nome}}, sentimos sua falta nos estudos',
   '<p>Oi {{nome}},</p><p>Faz um tempo que você não aparece na plataforma. Que tal retomar de onde parou? Se precisar de um norte pro edital, respondo por aqui.</p><p>— Equipe Ubique</p>',
   21),
  ('Reativar lead frio', 'frios',
   'Ainda pensando no CACD, {{nome}}?',
   '<p>Oi {{nome}},</p><p>Você criou conta na Ubique mas ainda não explorou o conteúdo. Tem material grátis esperando por você — e qualquer dúvida sobre a preparação, é só responder.</p><p>— Equipe Ubique</p>',
   30)
) as v(nome, segmento, assunto, corpo, cooldown_dias)
where not exists (select 1 from crm.automacoes);


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
