-- ════════════════════════════════════════════════════════════════════════
-- Greenn → Falcon: vendas no admin, Falcoins e reembolso automático   2026-11-17
--
-- (1) ESPELHO DE VENDAS: vendas.greenn_vendas guarda cada venda como a API
--     da Greenn devolve (edge function greenn-api: "sincronizar" puxa a lista,
--     "detalhar" completa comprador e produto). Um trigger espelha cada venda
--     em crm.clients + vendas.orders + vendas.payments, pro admin (Pedidos,
--     Pagamentos, Estatísticas) enxergar o faturamento real.
--     O espelho NUNCA libera acesso: o pedido nasce com metadata.liberado_em,
--     então vendas.liberar_pedido não faz nada. Acesso continua só pelo
--     webhook (vendas.aplicar_venda_greenn).
--     Venda nova: o webhook grava vendas.greenn_eventos → o trigger pede o
--     detalhe à API (pg_net → greenn-api) → espelha.
--
-- (2) FALCOINS: venda paga de um produto em vendas.greenn_falcoins credita
--     os Falcoins na carteira de quem comprou (pelo e-mail). Sem conta ainda:
--     fica em vendas.falcoins_pendentes e cai quando a conta for criada.
--     Reembolso/chargeback: os Falcoins daquela venda saem da carteira.
--
-- (3) REEMBOLSO AUTOMÁTICO: pedido de reembolso do aluno (vendas.pedidos_aluno)
--     chama greenn-api → POST /sales/{id}/refund na Greenn, na hora.
--
-- Chamadas ao greenn-api levam vendas.greenn_config.token no header
-- x-greenn-token (a chave nunca sai do banco).
-- ════════════════════════════════════════════════════════════════════════

alter table vendas.greenn_vendas add column if not exists erro text;
alter table vendas.greenn_vendas add column if not exists espelhado_em timestamptz;

create unique index if not exists orders_greenn_sale_unq
  on vendas.orders ((metadata->>'greenn_sale_id')) where metadata ? 'greenn_sale_id';

-- chama a edge function greenn-api (assíncrono, via pg_net)
create or replace function vendas._greenn_api(p_body jsonb)
returns bigint
language sql security definer
set search_path = vendas, public
as $$
  select net.http_post(
    url := 'https://kluqjqojxzpuiauuidwx.supabase.co/functions/v1/greenn-api',
    body := p_body,
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'x-greenn-token', (select token from vendas.greenn_config where id)),
    timeout_milliseconds := 60000);
$$;
revoke all on function vendas._greenn_api(jsonb) from public, anon, authenticated;

-- marca pelo nome do produto (dá pra ajustar depois no admin)
create or replace function vendas._greenn_marca(p_nome text)
returns int language sql immutable as $$
  select case
    when p_nome ilike '%news%' then 4
    when p_nome ilike '%junior%' or p_nome ilike '%júnior%' then 3
    when p_nome ilike '%impugn%' then 2
    else 1 end;
$$;

-- ── (1) espelha uma venda em ficha + pedido + pagamento ─────────────────
create or replace function vendas.espelhar_greenn_venda(p_id bigint)
returns text
language plpgsql security definer
set search_path = vendas, crm, public
as $$
declare
  d jsonb; v_email text; v_nome text; v_tel text; v_cpf text;
  v_cli uuid; v_brand int; v_prod text; v_status text; v_pstatus text; v_paystatus text;
  v_total numeric; v_order uuid; v_method text; v_paid timestamptz; v_created timestamptz; v_ref timestamptz;
begin
  select dados into d from vendas.greenn_vendas where id = p_id;
  if d is null or not (d ? 'client') then return 'sem detalhe'; end if;   -- espera o "detalhar"
  v_email := lower(nullif(trim(d->'client'->>'email'), ''));
  if v_email is null then return 'sem e-mail'; end if;
  v_nome := coalesce(nullif(trim(d->'client'->>'name'), ''), v_email);
  v_tel := nullif(coalesce(d->'client'->>'cellphone', d->'client'->>'phone'), '');
  v_cpf := nullif(coalesce(d->'client'->>'document', d->'client'->>'cpf_cnpj', d->'client'->>'cpf'), '');
  v_prod := coalesce(nullif(d->'product'->>'name', ''), nullif(d->'offer'->>'name', ''), 'Produto Greenn ' || coalesce(d->>'product_id', ''));
  v_brand := vendas._greenn_marca(v_prod);
  v_total := round(coalesce(nullif(d->>'total', '')::numeric, nullif(d->>'amount', '')::numeric, 0) / 100.0, 2);
  v_created := coalesce(nullif(d->>'created_at', '')::timestamptz, now());
  v_paid := nullif(d->>'paid_at', '')::timestamptz;
  v_status := case lower(d->>'status')
    when 'paid' then 'paid' when 'refunded' then 'refunded' when 'chargedback' then 'refunded' when 'chargeback' then 'refunded'
    when 'refused' then 'failed' when 'canceled' then 'cancelled' when 'cancelled' then 'cancelled' else 'pending' end;
  v_pstatus := case v_status when 'paid' then 'paid' when 'refunded' then 'refunded' when 'failed' then 'failed' else 'awaiting' end;
  v_paystatus := case v_status when 'paid' then 'paid' when 'refunded' then 'refunded' when 'failed' then 'failed' when 'cancelled' then 'failed' else 'pending' end;
  v_method := case upper(coalesce(d->>'method', ''))
    when 'PIX' then 'pix' when 'CREDIT_CARD' then 'credit_card' when 'TWO_CREDIT_CARDS' then 'credit_card'
    when 'BOLETO' then 'boleto' when 'DEBIT_CARD' then 'debit_card' else 'other' end;
  v_ref := case when v_status = 'refunded' then coalesce(nullif(d->>'refunded_at', '')::timestamptz, now()) end;

  -- ficha: a ligada a uma conta da Falcon vem primeiro
  select id into v_cli from crm.clients where lower(email) = v_email
   order by (app_user_id is not null) desc, created_at limit 1;
  if v_cli is null then
    insert into crm.clients (brand_id, full_name, email, phone, cpf, status, source, source_details, first_contact_at, first_purchase_at)
    values (v_brand, v_nome, v_email, v_tel, v_cpf, case when v_status = 'paid' then 'customer' else 'lead' end, 'greenn',
            jsonb_build_object('greenn_client_id', d->>'client_id'), v_created,
            case when v_status = 'paid' then coalesce(v_paid, v_created) end)
    returning id into v_cli;
  elsif v_status = 'paid' then
    update crm.clients
       set status = case when status = 'lead' then 'customer' else status end,
           first_purchase_at = case when first_purchase_at is null or first_purchase_at > coalesce(v_paid, v_created)
                                    then coalesce(v_paid, v_created) else first_purchase_at end
     where id = v_cli;
  end if;

  -- pedido (já "liberado": o espelho nunca libera acesso)
  select id into v_order from vendas.orders where metadata->>'greenn_sale_id' = p_id::text;
  if v_order is null then
    insert into vendas.orders (client_id, brand_id, subtotal, discount_amount, total, currency, status, payment_status,
                               placed_at, paid_at, cancelled_at, coupon_code_snapshot, notes, metadata)
    values (v_cli, v_brand, v_total, 0, v_total, coalesce(nullif(d->>'currency', ''), 'BRL'), v_status, v_pstatus,
            v_created, case when v_status in ('paid', 'refunded') then coalesce(v_paid, v_created) end,
            case when v_status in ('refunded', 'cancelled') then v_ref end,
            nullif(d->>'coupon_code', ''), 'Greenn · venda ' || p_id || ' · ' || v_prod,
            jsonb_build_object('origem', 'greenn', 'greenn_sale_id', p_id::text, 'produto', v_prod,
                               'greenn_product_id', d->>'product_id', 'tipo', d->>'type',
                               'liberado_em', now(), 'liberacao', jsonb_build_object('espelho_greenn', true)))
    returning id into v_order;
  else
    update vendas.orders
       set client_id = v_cli, brand_id = v_brand, subtotal = v_total, total = v_total,
           status = v_status, payment_status = v_pstatus,
           paid_at = case when v_status in ('paid', 'refunded') then coalesce(v_paid, paid_at, v_created) else null end,
           cancelled_at = case when v_status in ('refunded', 'cancelled') then coalesce(cancelled_at, v_ref) end,
           coupon_code_snapshot = coalesce(nullif(d->>'coupon_code', ''), coupon_code_snapshot),
           metadata = metadata || jsonb_build_object('produto', v_prod, 'liberado_em', coalesce(metadata->'liberado_em', to_jsonb(now())))
     where id = v_order;
  end if;

  -- pagamento (um por venda)
  insert into vendas.payments (order_id, amount, currency, method, installments, status, gateway, gateway_transaction_id,
                               gateway_status, paid_at, refunded_at, refund_amount, refund_reason, metadata)
  values (v_order, v_total, coalesce(nullif(d->>'currency', ''), 'BRL'), v_method, greatest(1, coalesce(nullif(d->>'installments', '')::int, 1)),
          v_paystatus, 'greenn', p_id::text, d->>'status',
          case when v_status in ('paid', 'refunded') then coalesce(v_paid, v_created) end,
          v_ref, case when v_status = 'refunded' then v_total end,
          case when v_status = 'refunded' then 'Greenn: ' || coalesce(d->>'status', 'refunded') end,
          jsonb_build_object('origem', 'greenn'))
  on conflict (gateway, gateway_transaction_id) do update
     set order_id = excluded.order_id, amount = excluded.amount, method = excluded.method, installments = excluded.installments,
         status = excluded.status, gateway_status = excluded.gateway_status, paid_at = excluded.paid_at,
         refunded_at = excluded.refunded_at, refund_amount = excluded.refund_amount, refund_reason = excluded.refund_reason;

  update vendas.greenn_vendas set espelhado_em = now(), erro = null where id = p_id;
  return 'ok';
end;
$$;
revoke all on function vendas.espelhar_greenn_venda(bigint) from public, anon, authenticated;

-- cada venda gravada/atualizada no espelho vira pedido (erro não derruba a gravação)
create or replace function vendas._greenn_vendas_espelhar()
returns trigger
language plpgsql security definer
set search_path = vendas, public
as $$
begin
  if NEW.dados ? 'client' and (TG_OP = 'INSERT' or NEW.dados is distinct from OLD.dados) then
    begin
      perform vendas.espelhar_greenn_venda(NEW.id);
    exception when others then
      update vendas.greenn_vendas set erro = left(SQLERRM, 500) where id = NEW.id;
    end;
  end if;
  return null;
end;
$$;
drop trigger if exists trg_greenn_vendas_espelhar on vendas.greenn_vendas;
create trigger trg_greenn_vendas_espelhar
  after insert or update of dados on vendas.greenn_vendas
  for each row execute function vendas._greenn_vendas_espelhar();

-- ── (2) Falcoins ─────────────────────────────────────────────────────────
create table if not exists vendas.greenn_falcoins (
  greenn_product_id bigint primary key,
  falcoins          numeric not null check (falcoins > 0),
  nome              text
);
insert into vendas.greenn_falcoins (greenn_product_id, falcoins, nome)
values (181145, 10, '10 Falcoins')
on conflict (greenn_product_id) do update set falcoins = excluded.falcoins, nome = excluded.nome;
alter table vendas.greenn_falcoins enable row level security;
drop policy if exists greenn_falcoins_admin on vendas.greenn_falcoins;
create policy greenn_falcoins_admin on vendas.greenn_falcoins for select using (public.is_admin());

create table if not exists vendas.falcoins_pendentes (
  greenn_sale_id text primary key,
  email          text not null,
  falcoins       numeric not null,
  criado_em      timestamptz not null default now(),
  creditado_em   timestamptz,
  user_id        uuid
);
alter table vendas.falcoins_pendentes enable row level security;
drop policy if exists falcoins_pendentes_admin on vendas.falcoins_pendentes;
create policy falcoins_pendentes_admin on vendas.falcoins_pendentes for select using (public.is_admin());

create or replace function vendas._falcoins_creditar(p_user uuid, p_sale text, p_qtd numeric, p_produto text)
returns boolean
language plpgsql security definer
set search_path = vendas, carteira, public
as $$
begin
  if exists (select 1 from carteira.lancamentos l where l.user_id = p_user and l.origem = 'compra'
              and l.meta->>'greenn_sale_id' = p_sale) then
    return false;   -- já creditado (o webhook manda mais de um evento por venda)
  end if;
  perform carteira.mov(p_user, p_qtd, null, 'compra', 'Compra de Falcoins na Greenn · ' || coalesce(p_produto, 'venda ' || p_sale),
                       jsonb_build_object('greenn_sale_id', p_sale, 'origem', 'greenn'), null);
  begin
    insert into aluno.notifications (id, user_id, type, payload, read, created_at)
    values (gen_random_uuid(), p_user, 'ubitokens_creditados', jsonb_build_object('ubitokens', p_qtd, 'pedido', 'Greenn ' || p_sale), false, now());
  exception when others then null; end;
  return true;
end;
$$;
revoke all on function vendas._falcoins_creditar(uuid, text, numeric, text) from public, anon, authenticated;

-- ── trigger do webhook: Falcoins + pedir o detalhe da venda à API ───────
create or replace function vendas._greenn_evento_pos()
returns trigger
language plpgsql security definer
set search_path = vendas, carteira, public
as $$
declare
  v_f record; v_email text; v_user uuid; v_sale text; v_cred record;
begin
  v_sale := NEW.sale_id;
  if v_sale is null then return null; end if;

  -- (2) Falcoins
  select * into v_f from vendas.greenn_falcoins where greenn_product_id = NEW.greenn_product_id;
  if found then
    v_email := lower(nullif(trim(coalesce(NEW.email, NEW.payload->'client'->>'email')), ''));
    if v_email is not null then
      select id into v_user from auth.users where lower(email) = v_email limit 1;
    end if;
    if NEW.status = 'paid' then
      if v_user is not null then
        perform vendas._falcoins_creditar(v_user, v_sale, v_f.falcoins, v_f.nome);
      elsif v_email is not null then
        insert into vendas.falcoins_pendentes (greenn_sale_id, email, falcoins)
        values (v_sale, v_email, v_f.falcoins) on conflict (greenn_sale_id) do nothing;
      end if;
    elsif NEW.status in ('refunded', 'chargedback', 'chargeback') then
      delete from vendas.falcoins_pendentes where greenn_sale_id = v_sale and creditado_em is null;
      select l.user_id, l.delta into v_cred from carteira.lancamentos l
       where l.origem = 'compra' and l.meta->>'greenn_sale_id' = v_sale limit 1;
      if found and not exists (select 1 from carteira.lancamentos l2 where l2.origem = 'estorno' and l2.meta->>'greenn_sale_id' = v_sale) then
        begin
          perform carteira.mov(v_cred.user_id, -v_cred.delta, null, 'estorno', 'Falcoins estornados · venda ' || v_sale || ' reembolsada na Greenn',
                               jsonb_build_object('greenn_sale_id', v_sale, 'origem', 'greenn'), null);
        exception when others then
          raise warning '[falcoins] estorno da venda % falhou: %', v_sale, SQLERRM;
        end;
      end if;
    end if;
  end if;

  -- (1) espelho: registra a venda e pede o detalhe (comprador/produto) à API
  begin
    insert into vendas.greenn_vendas (id, dados) values (v_sale::bigint, jsonb_build_object('id', v_sale::bigint))
    on conflict (id) do nothing;
    perform vendas._greenn_api(jsonb_build_object('acao', 'detalhar', 'ids', jsonb_build_array(v_sale::bigint)));
  exception when others then
    raise warning '[greenn espelho] venda %: %', v_sale, SQLERRM;
  end;
  return null;
end;
$$;
drop trigger if exists trg_greenn_evento_pos on vendas.greenn_eventos;
create trigger trg_greenn_evento_pos
  after insert on vendas.greenn_eventos
  for each row execute function vendas._greenn_evento_pos();

-- conta nova: credita os Falcoins comprados antes de ter conta
create or replace function vendas._falcoins_conta_nova()
returns trigger
language plpgsql security definer
set search_path = vendas, carteira, public
as $$
declare r record;
begin
  for r in select * from vendas.falcoins_pendentes
            where creditado_em is null and email = lower(NEW.email) loop
    begin
      perform vendas._falcoins_creditar(NEW.id, r.greenn_sale_id, r.falcoins, null);
      update vendas.falcoins_pendentes set creditado_em = now(), user_id = NEW.id where greenn_sale_id = r.greenn_sale_id;
    exception when others then
      raise warning '[falcoins] pendente %: %', r.greenn_sale_id, SQLERRM;
    end;
  end loop;
  return null;
end;
$$;
drop trigger if exists trg_falcoins_conta_nova on crm.app_users;
create trigger trg_falcoins_conta_nova
  after insert on crm.app_users
  for each row execute function vendas._falcoins_conta_nova();

-- ── (3) reembolso automático: pedido do aluno → estorno na Greenn ───────
create or replace function vendas._pedido_reembolso_greenn()
returns trigger
language plpgsql security definer
set search_path = vendas, public
as $$
begin
  if NEW.tipo = 'reembolso' and NEW.status = 'pendente' and NEW.greenn_sale_id is not null then
    begin
      perform vendas._greenn_api(jsonb_build_object('acao', 'reembolsar', 'pedido_id', NEW.id));
    exception when others then
      raise warning '[reembolso greenn] pedido %: %', NEW.id, SQLERRM;
    end;
  end if;
  return null;
end;
$$;
drop trigger if exists trg_pedido_reembolso_greenn on vendas.pedidos_aluno;
create trigger trg_pedido_reembolso_greenn
  after insert on vendas.pedidos_aluno
  for each row execute function vendas._pedido_reembolso_greenn();

grant select, insert, update, delete on vendas.greenn_vendas, vendas.greenn_falcoins, vendas.falcoins_pendentes to service_role;
grant select on vendas.greenn_falcoins, vendas.falcoins_pendentes to authenticated;
