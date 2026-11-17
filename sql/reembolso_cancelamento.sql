-- ════════════════════════════════════════════════════════════════════════
-- Reembolso (até 7 dias após a compra) e cancelamento da assinatura do
-- Falcon Pro, pedidos DENTRO da Falcon (Conta → Compras).   2026-11-17
--
-- Fluxo:
--   · Aluno vê as compras da Greenn (aluno.minhas_compras) e pede:
--       - reembolso  → só até 7 dias após a compra (conferido no servidor).
--         Depois de 7 dias não existe reembolso. Dentro do prazo o reembolso
--         é garantido e o ACESSO É CANCELADO NA HORA do pedido;
--       - cancelamento da assinatura (Falcon Pro) → a qualquer momento; o
--         acesso continua até o fim do período já pago.
--   · O pedido cai em vendas.pedidos_aluno e aparece no admin (Contas).
--   · A equipe faz o estorno / cancela a assinatura NA GREENN (a Greenn não
--     tem API pública para isso) e marca o pedido como feito no admin.
--   · Reembolso: quando a Greenn manda "Venda reembolsada", o trigger abaixo
--     marca o pedido como feito sozinho.
--   · Cancelamento: se mesmo assim a Greenn cobrar de novo, o pedido volta a
--     aparecer no admin como "cobrou depois de cancelar" (para estornar).
-- ════════════════════════════════════════════════════════════════════════

create table if not exists vendas.pedidos_aluno (
  id               bigserial primary key,
  tipo             text not null check (tipo in ('reembolso', 'cancelamento')),
  status           text not null default 'pendente' check (status in ('pendente', 'feito', 'recusado')),
  user_id          uuid not null,
  email            text,
  nome             text,
  greenn_sale_id   text,
  subscription_id  text,
  produto          text,
  valor            numeric,
  comprado_em      timestamptz,
  acesso_ate       timestamptz,
  motivo           text,
  criado_em        timestamptz not null default now(),
  resolvido_em     timestamptz,
  resolvido_por    uuid,
  nota             text,
  cobrado_depois   boolean not null default false
);
create unique index if not exists pedidos_aluno_reembolso_unq
  on vendas.pedidos_aluno (greenn_sale_id) where tipo = 'reembolso' and status <> 'recusado';
create unique index if not exists pedidos_aluno_cancel_unq
  on vendas.pedidos_aluno (subscription_id) where tipo = 'cancelamento' and status <> 'recusado';
create index if not exists pedidos_aluno_user_idx on vendas.pedidos_aluno (user_id);

alter table vendas.pedidos_aluno enable row level security;
drop policy if exists pedidos_aluno_sel on vendas.pedidos_aluno;
create policy pedidos_aluno_sel on vendas.pedidos_aluno for select
  using (user_id = auth.uid() or public.is_admin());
-- escrita só pelas funções abaixo (security definer)
grant select on vendas.pedidos_aluno to authenticated;

-- ── Compras do aluno (uma linha por compra; assinatura = uma linha) ──────
create or replace function aluno.minhas_compras()
returns table (
  chave text, greenn_sale_id text, subscription_id text, produto text, assinatura boolean,
  valor numeric, comprado_em timestamptz, ultimo_pagamento timestamptz, acesso_ate timestamptz,
  acesso_ativo boolean, reembolsada boolean, pode_reembolsar boolean, reembolso_ate timestamptz,
  pedido_reembolso text, pode_cancelar boolean, pedido_cancelamento text
)
language sql stable security definer
set search_path = vendas, crm, public
as $$
  with eu as (
    select auth.uid() as uid, lower((select email from auth.users where id = auth.uid())) as email
  ),
  fichas as (
    select c.id from crm.clients c, eu
     where c.app_user_id = eu.uid or (c.app_user_id is null and lower(c.email) = eu.email)
  ),
  pagos as (
    select g.sale_id,
           coalesce(nullif(g.payload->'sale'->>'subscription_id', ''), nullif(g.payload->'currentSale'->>'subscription_id', '')) as sub,
           g.greenn_product_id,
           coalesce((g.payload->'sale'->>'paid_at')::timestamptz, g.recebido_em) as pago_em,
           coalesce(nullif(g.payload->'sale'->>'amount', '')::numeric, nullif(g.payload->'offer'->>'amount', '')::numeric) as valor,
           coalesce(p.nome, g.payload->'offer'->>'name', g.payload->>'oferta', 'Compra na Greenn') as produto,
           coalesce(p.tipo, 'materia') = 'banco' as banco
      from vendas.greenn_eventos g
      left join vendas.greenn_produtos p on p.greenn_product_id = g.greenn_product_id
     where g.status = 'paid' and g.sale_id is not null
       and g.resultado->>'acao' = 'liberado'
       and ((g.resultado->>'cliente')::uuid in (select id from fichas)
            or lower(g.email) = (select email from eu))
  ),
  -- o evento "contract" não traz subscription_id: herda do "sale" da mesma venda
  pagos2 as (
    select sale_id, max(sub) as sub, max(greenn_product_id) as greenn_product_id, min(pago_em) as pago_em,
           max(valor) as valor, max(produto) as produto, bool_or(banco) as banco
      from pagos group by sale_id
  ),
  grupos as (
    select coalesce(case when banco then sub end, sale_id) as chave,
           bool_or(banco) as banco,
           max(sub) as sub,
           (array_agg(sale_id order by pago_em))[1] as primeira_venda,
           array_agg(sale_id) as vendas,
           min(pago_em) as comprado_em, max(pago_em) as ultimo_pagamento,
           (array_agg(valor order by pago_em))[1] as valor,
           (array_agg(produto order by pago_em))[1] as produto
      from pagos2 group by 1
  ),
  mats as (
    select gr.chave,
           max(e.ends_at) filter (where e.status = 'active') as ate,
           bool_or(e.status = 'active' and (e.ends_at is null or e.ends_at > now())) as ativo,
           bool_or(e.cancel_reason like 'Greenn: reembolso%' or e.cancel_reason like 'Greenn: chargeback%'
                   or e.cancel_reason like 'Reembolso pedido na Falcon%') as reemb
      from grupos gr
      join vendas.enrollments e
        on e.metadata->>'greenn_sale_id' = any(gr.vendas)
        or coalesce(e.metadata->'greenn_vendas', '[]'::jsonb) ?| gr.vendas
     group by gr.chave
  )
  select gr.chave, gr.primeira_venda, gr.sub, gr.produto, gr.banco, gr.valor, gr.comprado_em, gr.ultimo_pagamento,
         m.ate, coalesce(m.ativo, false), coalesce(m.reemb, false),
         (gr.comprado_em > now() - interval '7 days' and not coalesce(m.reemb, false)
            and pr.status is null) as pode_reembolsar,
         gr.comprado_em + interval '7 days',
         pr.status,
         (gr.banco and gr.sub is not null and coalesce(m.ativo, false) and pc.status is null) as pode_cancelar,
         pc.status
    from grupos gr
    left join mats m on m.chave = gr.chave
    left join lateral (select status from vendas.pedidos_aluno x
                        where x.tipo = 'reembolso' and x.greenn_sale_id = gr.primeira_venda and x.status <> 'recusado'
                        order by x.id desc limit 1) pr on true
    left join lateral (select status from vendas.pedidos_aluno x
                        where x.tipo = 'cancelamento' and x.subscription_id = gr.sub and x.status <> 'recusado'
                        order by x.id desc limit 1) pc on true
   order by gr.ultimo_pagamento desc;
$$;
revoke all on function aluno.minhas_compras() from public, anon;
grant execute on function aluno.minhas_compras() to authenticated;

-- ── Pedir reembolso (até 7 dias após a compra) ──────────────────────────
create or replace function aluno.pedir_reembolso(p_chave text, p_motivo text default null)
returns jsonb
language plpgsql security definer
set search_path = vendas, crm, public
as $$
declare
  c record;
  v_nome text; v_email text;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta.'; end if;
  select * into c from aluno.minhas_compras() where chave = p_chave;
  if not found then raise exception 'Compra não encontrada na sua conta.'; end if;
  if c.reembolsada then raise exception 'Esta compra já foi reembolsada.'; end if;
  if c.pedido_reembolso is not null then raise exception 'Você já pediu o reembolso desta compra.'; end if;
  if c.comprado_em <= now() - interval '7 days' then
    raise exception 'O prazo de reembolso (7 dias após a compra) terminou em %.', to_char(c.reembolso_ate at time zone 'America/Sao_Paulo', 'DD/MM/YYYY');
  end if;
  select u.email, coalesce(au.full_name, u.raw_user_meta_data->>'full_name') into v_email, v_nome
    from auth.users u left join crm.app_users au on au.id = u.id where u.id = auth.uid();
  insert into vendas.pedidos_aluno (tipo, user_id, email, nome, greenn_sale_id, subscription_id, produto, valor, comprado_em, acesso_ate, motivo)
  values ('reembolso', auth.uid(), v_email, v_nome, c.greenn_sale_id, c.subscription_id, c.produto, c.valor, c.comprado_em, c.acesso_ate,
          nullif(left(trim(coalesce(p_motivo, '')), 1000), ''));
  -- dentro do prazo o reembolso é garantido: o acesso desta compra acaba agora
  update vendas.enrollments
     set status = 'cancelled', ends_at = now(), cancel_reason = 'Reembolso pedido na Falcon (até 7 dias)'
   where (metadata->>'greenn_sale_id' = c.greenn_sale_id or coalesce(metadata->'greenn_vendas', '[]'::jsonb) ? c.greenn_sale_id)
     and status in ('active', 'paused');
  -- assinatura reembolsada também precisa parar de cobrar na Greenn
  if c.assinatura and c.subscription_id is not null and c.pedido_cancelamento is null then
    insert into vendas.pedidos_aluno (tipo, user_id, email, nome, greenn_sale_id, subscription_id, produto, valor, comprado_em, acesso_ate, motivo)
    values ('cancelamento', auth.uid(), v_email, v_nome, c.greenn_sale_id, c.subscription_id, c.produto, c.valor, c.comprado_em, now(),
            'Junto com o pedido de reembolso')
    on conflict do nothing;
  end if;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function aluno.pedir_reembolso(text, text) from public, anon;
grant execute on function aluno.pedir_reembolso(text, text) to authenticated;

-- ── Cancelar a assinatura (Falcon Pro) ───────────────────────────────────
create or replace function aluno.cancelar_assinatura(p_chave text, p_motivo text default null)
returns jsonb
language plpgsql security definer
set search_path = vendas, crm, public
as $$
declare
  c record;
  v_nome text; v_email text;
  v_ate timestamptz;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta.'; end if;
  select * into c from aluno.minhas_compras() where chave = p_chave;
  if not found then raise exception 'Assinatura não encontrada na sua conta.'; end if;
  if not c.assinatura or c.subscription_id is null then raise exception 'Esta compra não é uma assinatura.'; end if;
  if not c.acesso_ativo then raise exception 'Esta assinatura já não está ativa.'; end if;
  if c.pedido_cancelamento is not null then raise exception 'Esta assinatura já foi cancelada.'; end if;
  select u.email, coalesce(au.full_name, u.raw_user_meta_data->>'full_name') into v_email, v_nome
    from auth.users u left join crm.app_users au on au.id = u.id where u.id = auth.uid();
  -- Mensal: fica até o fim do mês já pago (último pagamento + 1 mês), sem os
  -- 5 dias de folga que a renovação dá. Depois disso perde o acesso.
  v_ate := c.ultimo_pagamento + interval '1 month';
  update vendas.enrollments
     set ends_at = least(coalesce(ends_at, v_ate), v_ate),
         metadata = metadata || jsonb_build_object('assinatura_cancelada_em', now())
   where (metadata->>'greenn_sale_id' = c.greenn_sale_id or coalesce(metadata->'greenn_vendas', '[]'::jsonb) ? c.greenn_sale_id)
     and status = 'active';
  insert into vendas.pedidos_aluno (tipo, user_id, email, nome, greenn_sale_id, subscription_id, produto, valor, comprado_em, acesso_ate, motivo)
  values ('cancelamento', auth.uid(), v_email, v_nome, c.greenn_sale_id, c.subscription_id, c.produto, c.valor, c.comprado_em, v_ate,
          nullif(left(trim(coalesce(p_motivo, '')), 1000), ''));
  return jsonb_build_object('ok', true, 'acesso_ate', v_ate);
end;
$$;
revoke all on function aluno.cancelar_assinatura(text, text) from public, anon;
grant execute on function aluno.cancelar_assinatura(text, text) to authenticated;

-- ── Admin: lista e resolve ───────────────────────────────────────────────
create or replace function vendas.pedidos_aluno_abertos()
returns setof vendas.pedidos_aluno
language sql stable security definer
set search_path = vendas, public
as $$
  select * from vendas.pedidos_aluno
   where public.is_admin() and (status = 'pendente' or cobrado_depois)
   order by criado_em;
$$;
revoke all on function vendas.pedidos_aluno_abertos() from public, anon;
grant execute on function vendas.pedidos_aluno_abertos() to authenticated;

create or replace function vendas.resolver_pedido_aluno(p_id bigint, p_status text, p_nota text default null)
returns jsonb
language plpgsql security definer
set search_path = vendas, public
as $$
begin
  if not public.is_admin() then raise exception 'Só administradores.'; end if;
  if p_status not in ('feito', 'recusado') then raise exception 'Status inválido.'; end if;
  update vendas.pedidos_aluno
     set status = p_status, resolvido_em = now(), resolvido_por = auth.uid(),
         nota = coalesce(nullif(trim(coalesce(p_nota, '')), ''), nota), cobrado_depois = false
   where id = p_id;
  if not found then raise exception 'Pedido não encontrado.'; end if;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function vendas.resolver_pedido_aluno(bigint, text, text) from public, anon;
grant execute on function vendas.resolver_pedido_aluno(bigint, text, text) to authenticated;

-- ── Webhook da Greenn ────────────────────────────────────────────────────
-- (1) Reembolso processado na Greenn → pedido de reembolso marcado como feito.
-- (2) Cobrança de uma assinatura cancelada → sinaliza no admin.
create or replace function vendas._pedidos_aluno_evento()
returns trigger
language plpgsql security definer
set search_path = vendas, public
as $$
declare v_sub text;
begin
  if NEW.status in ('refunded', 'chargedback', 'chargeback') and NEW.sale_id is not null then
    update vendas.pedidos_aluno
       set status = 'feito', resolvido_em = now(), nota = coalesce(nota, 'Reembolso confirmado pela Greenn')
     where tipo = 'reembolso' and status = 'pendente' and greenn_sale_id = NEW.sale_id;
  elsif NEW.status = 'paid' then
    v_sub := coalesce(nullif(NEW.payload->'sale'->>'subscription_id', ''), nullif(NEW.payload->'currentSale'->>'subscription_id', ''));
    if v_sub is not null then
      update vendas.pedidos_aluno
         set cobrado_depois = true
       where tipo = 'cancelamento' and status <> 'recusado' and subscription_id = v_sub
         and criado_em < coalesce((NEW.payload->'sale'->>'paid_at')::timestamptz, NEW.recebido_em)
         and NEW.sale_id is distinct from greenn_sale_id;
    end if;
  end if;
  return NEW;
end;
$$;
drop trigger if exists trg_pedidos_aluno_evento on vendas.greenn_eventos;
create trigger trg_pedidos_aluno_evento
  after insert on vendas.greenn_eventos
  for each row execute function vendas._pedidos_aluno_evento();
