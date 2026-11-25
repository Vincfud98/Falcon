-- Pacotes de Falcoins na Greenn + reembolso que deixa a carteira negativa   2026-11-25
-- (1) Os 5 pacotes criados na Greenn (preços com lucro: custo real medido + ~20% taxa/imposto):
--     10 = R$ 62 · 20 = R$ 119 · 50 = R$ 289 · 100 = R$ 549 · 1000 = R$ 5.290.
--     Venda paga credita na carteira pelo e-mail (vendas._greenn_evento_pos, sql/greenn_sync.sql).
-- (2) Reembolso depois de usar: os Falcoins da compra saem mesmo sem saldo e a carteira
--     fica NEGATIVA. Com saldo negativo, todo débito de IA é recusado (SALDO_INSUFICIENTE)
--     até a pessoa comprar de novo e cobrir. Vale para o reembolso/chargeback feito na
--     Greenn (webhook) e para o pedido de reembolso feito na Falcon (Conta → Compras),
--     que agora estorna na hora do pedido.

-- (1) pacotes
insert into vendas.greenn_falcoins (greenn_product_id, falcoins, nome) values
  (207741,   10, '10 Falcoins'),
  (207743,   20, '20 Falcoins'),
  (207744,   50, '50 Falcoins'),
  (207745,  100, '100 Falcoins'),
  (207746, 1000, '1000 Falcoins')
on conflict (greenn_product_id) do update set falcoins = excluded.falcoins, nome = excluded.nome;

-- (2a) carteira.mov: estorno pode deixar o saldo negativo; o resto continua exigindo saldo
create or replace function carteira.mov(p_user uuid, p_delta numeric, p_acao text, p_origem text, p_descricao text, p_meta jsonb, p_criado_por uuid)
returns numeric
language plpgsql
security definer
set search_path to 'carteira', 'public'
as $function$
declare
  v_saldo numeric;
begin
  insert into carteira.contas(user_id) values (p_user) on conflict (user_id) do nothing;
  select saldo into v_saldo from carteira.contas where user_id = p_user for update;
  if p_delta < 0 and (v_saldo + p_delta) < 0 and coalesce(p_origem, '') <> 'estorno' then
    raise exception 'SALDO_INSUFICIENTE' using errcode = 'P0001';
  end if;
  v_saldo := v_saldo + p_delta;
  update carteira.contas set saldo = v_saldo, atualizado_em = now() where user_id = p_user;
  if p_origem = 'indicacao' and p_delta > 0 then
    update carteira.contas set saldo_resgatavel = saldo_resgatavel + p_delta where user_id = p_user;
  end if;
  insert into carteira.lancamentos(user_id, delta, saldo_apos, acao, origem, descricao, meta, criado_por)
  values (p_user, p_delta, v_saldo, p_acao, p_origem, p_descricao, coalesce(p_meta,'{}'::jsonb), p_criado_por);
  return v_saldo;
end
$function$;

-- (2b) pedido de reembolso na Falcon: compra de Falcoins estorna na hora (pode negativar)
create or replace function aluno.pedir_reembolso(p_chave text, p_motivo text default null::text)
returns jsonb
language plpgsql
security definer
set search_path to 'vendas', 'crm', 'public'
as $function$
declare
  c record; v_nome text; v_email text; v_cred record;
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
  update vendas.enrollments set status = 'cancelled', ends_at = now(), cancel_reason = 'Reembolso pedido na Falcon (até 7 dias)'
   where (metadata->>'greenn_sale_id' = c.greenn_sale_id or coalesce(metadata->'greenn_vendas', '[]'::jsonb) ? c.greenn_sale_id)
     and status in ('active', 'paused');
  -- Falcoins desta compra saem da carteira agora (mesmo que já tenham sido usados: o saldo fica negativo)
  if c.greenn_sale_id is not null then
    select l.user_id, l.delta into v_cred from carteira.lancamentos l
     where l.origem = 'compra' and l.meta->>'greenn_sale_id' = c.greenn_sale_id limit 1;
    if found and not exists (select 1 from carteira.lancamentos l2 where l2.origem = 'estorno' and l2.meta->>'greenn_sale_id' = c.greenn_sale_id) then
      perform carteira.mov(v_cred.user_id, -v_cred.delta, null, 'estorno', 'Falcoins estornados · reembolso pedido na Falcon (venda ' || c.greenn_sale_id || ')',
                           jsonb_build_object('greenn_sale_id', c.greenn_sale_id, 'origem', 'falcon'), auth.uid());
    end if;
  end if;
  if c.assinatura and c.subscription_id is not null and c.pedido_cancelamento is null then
    insert into vendas.pedidos_aluno (tipo, user_id, email, nome, greenn_sale_id, subscription_id, produto, valor, comprado_em, acesso_ate, motivo)
    values ('cancelamento', auth.uid(), v_email, v_nome, c.greenn_sale_id, c.subscription_id, c.produto, c.valor, c.comprado_em, now(), 'Junto com o pedido de reembolso')
    on conflict do nothing;
  end if;
  return jsonb_build_object('ok', true);
end;
$function$;

select greenn_product_id, falcoins, nome from vendas.greenn_falcoins order by falcoins;
