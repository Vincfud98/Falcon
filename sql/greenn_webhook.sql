-- ════════════════════════════════════════════════════════════════════════
-- Greenn → Falcon: venda paga libera acesso; estorno/chargeback revoga.  2026-11-13
-- Chamada pela edge function greenn-webhook (service role).
-- Só ADICIONA tabelas e uma função nova: não altera nada do que já existe.
-- ════════════════════════════════════════════════════════════════════════

-- 1) Qual produto da Greenn libera quais matérias da Falcon (e por quanto tempo)
create table if not exists vendas.greenn_produtos (
  greenn_product_id bigint primary key,
  nome              text not null,
  materias          integer[] not null default '{}',   -- conteudo.subjects.id
  meses             integer not null default 24,
  ativo             boolean not null default true,
  atualizado_em     timestamptz not null default now()
);

-- 2) Registro de tudo que a Greenn manda (auditoria e diagnóstico)
create table if not exists vendas.greenn_eventos (
  id               bigserial primary key,
  recebido_em      timestamptz not null default now(),
  tipo             text,
  status           text,
  sale_id          text,
  greenn_product_id bigint,
  email            text,
  resultado        jsonb,
  payload          jsonb
);
create index if not exists greenn_eventos_sale_idx on vendas.greenn_eventos (sale_id);

alter table vendas.greenn_produtos enable row level security;
alter table vendas.greenn_eventos  enable row level security;
drop policy if exists greenn_produtos_admin on vendas.greenn_produtos;
create policy greenn_produtos_admin on vendas.greenn_produtos for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists greenn_eventos_admin on vendas.greenn_eventos;
create policy greenn_eventos_admin on vendas.greenn_eventos for select using (public.is_admin());
grant select on vendas.greenn_produtos, vendas.greenn_eventos to authenticated;

-- 3) Os 16 produtos da Black Ubique (IDs conferidos na Greenn em 13/11/2026)
--    Por matéria = curso novo + temporadas anteriores. Prazo: 24 meses.
insert into vendas.greenn_produtos (greenn_product_id, nome, materias, meses) values
  (204542, 'Preparatório Completo para o CACD 2.0 - Falcon',
           array[1,19,22,21, 4,20,23,40, 8,26,41, 2,24,27,42, 9,32,38, 6,7,34,45, 3,25,43, 10,33,35, 11,31,36, 12,30,37, 28,29], 24),
  (204533, 'Preparatório Completo de História do Brasil',          array[1,19,22,21], 24),
  (204534, 'Preparatório Completo de História Mundial',            array[4,20,23,40], 24),
  (204535, 'Preparatório Completo de Geografia',                   array[8,26,41], 24),
  (204538, 'Preparatório Completo de Economia',                    array[2,24,27,42], 24),
  (204529, 'Preparatório Completo de Língua Portuguesa',           array[9,32,38], 24),
  (204536, 'Preparatório Completo de Direito Internacional Público e Direito Interno', array[6,7,34,45], 24),
  (204539, 'Preparatório Completo de Política Internacional',      array[3,25,43], 24),
  (204551, 'Preparatório Completo de Língua Inglesa',              array[10,33,35], 24),
  (204530, 'Preparatório Completo de Língua Espanhola',            array[11,31,36], 24),
  (204528, 'Preparatório Completo de Língua Francesa',             array[12,30,37], 24),
  (83628,  'Oficial de Chancelaria (OFCHAN)',                      array[46,48,49,50,51,52,53,54,55,56,57,58], 24),
  (88025,  'Introdução à Literatura Brasileira',                   array[28], 24),
  (88034,  'Navegantes, Bandeirantes, Diplomatas - Uma Releitura', array[29], 24),
  (82617,  'Plano de Estudos Personalizado',                       '{}', 24),   -- sem matéria na Falcon: só registra
  (156087, 'Simulando CACD',                                       '{}', 24)    -- sem matéria na Falcon: só registra
on conflict (greenn_product_id) do nothing;

-- 4) Aplica um evento da Greenn
create or replace function vendas.aplicar_venda_greenn(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tipo    text := coalesce(p->>'type', '');
  v_status  text := lower(coalesce(nullif(p->>'currentStatus', ''), nullif(p#>>'{sale,status}', ''), nullif(p#>>'{currentSale,status}', ''), ''));
  v_sale    text := coalesce(p#>>'{sale,id}', p#>>'{currentSale,id}', p#>>'{contract,id}');
  v_prod_g  bigint := nullif(coalesce(p#>>'{product,id}', p->>'product_id'), '')::bigint;
  v_email   text := lower(btrim(coalesce(p#>>'{client,email}', p#>>'{customer,email}', '')));
  v_nome    text := nullif(btrim(coalesce(p#>>'{client,name}', p#>>'{customer,name}', '')), '');
  v_fone    text := nullif(btrim(coalesce(p#>>'{client,cellphone}', p#>>'{client,phone}', '')), '');
  v_doc     text := nullif(regexp_replace(coalesce(p#>>'{client,cpf}', p#>>'{client,cpf_cnpj}', p#>>'{client,document}', p#>>'{client,document_number}', ''), '\D', '', 'g'), '');
  v_map     vendas.greenn_produtos%rowtype;
  v_marca   integer := coalesce((select x.brand_id from catalogo.products x order by x.id limit 1),
                                (select b.id from crm.brands b order by b.id limit 1));
  v_user uuid; v_cli uuid; v_mat integer; v_prod integer; v_ate timestamptz;
  n_novas int := 0; n_ja int := 0; n_rev int := 0; v_sem int[] := '{}';
  v_res jsonb;
begin
  if v_tipo = 'contract' and v_status = 'paid' then v_sale := coalesce(p#>>'{currentSale,id}', v_sale); end if;

  select * into v_map from vendas.greenn_produtos where greenn_product_id = v_prod_g;

  if v_map.greenn_product_id is null then
    v_res := jsonb_build_object('ok', true, 'acao', 'ignorado', 'motivo', 'produto da Greenn sem mapeamento');
  elsif v_status = 'paid' then
    if v_email !~ '^[^\s@]+@[^\s@]+$' then
      v_res := jsonb_build_object('ok', false, 'acao', 'erro', 'motivo', 'venda paga sem e-mail válido');
    else
      -- ficha do cliente (mesma lógica do dar_acesso)
      select u.id into v_user from crm.app_users u where lower(u.email) = v_email limit 1;
      if v_user is not null then
        select c.id into v_cli from crm.clients c where c.app_user_id = v_user order by c.created_at limit 1;
      end if;
      if v_cli is null then
        select c.id into v_cli from crm.clients c where lower(c.email) = v_email order by c.created_at limit 1;
        if v_cli is not null and v_user is not null then
          update crm.clients set app_user_id = v_user where id = v_cli and app_user_id is null;
        end if;
      end if;
      if v_cli is null then
        insert into crm.clients (brand_id, full_name, email, phone, cpf, app_user_id, status, source, first_contact_at)
        values (v_marca, coalesce(v_nome, split_part(v_email, '@', 1)), v_email, v_fone, v_doc, v_user, 'customer', 'greenn', now())
        returning id into v_cli;
      else
        update crm.clients set status = 'customer' where id = v_cli and status in ('lead', 'former_customer');
        -- guarda telefone e CPF da compra (ajudam a achar a conta certa quando o e-mail é outro)
        update crm.clients set phone = coalesce(nullif(phone, ''), v_fone), cpf = coalesce(nullif(cpf, ''), v_doc) where id = v_cli;
      end if;

      v_ate := now() + make_interval(months => v_map.meses);
      foreach v_mat in array v_map.materias loop
        v_prod := null;
        select x.id into v_prod from catalogo.products x
         where x.subject_id = v_mat and coalesce(x.kind, 'course') <> 'question_bank'
         order by x.active desc, x.id limit 1;
        if v_prod is null then v_sem := v_sem || v_mat; continue; end if;
        -- idempotente: a mesma venda não cria duas matrículas do mesmo produto
        if exists (select 1 from vendas.enrollments e where e.client_id = v_cli and e.product_id = v_prod
                   and e.metadata->>'greenn_sale_id' = v_sale) then
          n_ja := n_ja + 1; continue;
        end if;
        insert into vendas.enrollments (client_id, product_id, offer_id, order_item_id, starts_at, ends_at, status,
                                        external_platform, external_enrollment_id, notes, metadata)
        values (v_cli, v_prod, null, null, now(), v_ate, 'active', 'greenn', v_sale,
                'Greenn · venda ' || coalesce(v_sale, '?') || ' · ' || v_map.nome,
                jsonb_build_object('origem', 'greenn', 'greenn_sale_id', v_sale, 'greenn_product_id', v_prod_g, 'tipo', 'materia'));
        n_novas := n_novas + 1;
      end loop;
      v_res := jsonb_build_object('ok', true, 'acao', 'liberado', 'cliente', v_cli, 'matriculas_novas', n_novas,
                                  'ja_tinha', n_ja, 'materias_sem_produto', to_jsonb(v_sem), 'ate', v_ate);
    end if;
  elsif v_status in ('refunded', 'chargedback', 'chargeback') and v_sale is not null then
    update vendas.enrollments
       set status = 'cancelled', ends_at = now(),
           cancel_reason = case when v_status = 'refunded' then 'Greenn: reembolso' else 'Greenn: chargeback' end
     where metadata->>'greenn_sale_id' = v_sale and status in ('active', 'paused');
    get diagnostics n_rev = row_count;
    v_res := jsonb_build_object('ok', true, 'acao', 'revogado', 'matriculas_canceladas', n_rev);
  else
    v_res := jsonb_build_object('ok', true, 'acao', 'ignorado', 'motivo', 'status ' || coalesce(nullif(v_status, ''), 'vazio'));
  end if;

  insert into vendas.greenn_eventos (tipo, status, sale_id, greenn_product_id, email, resultado, payload)
  values (v_tipo, v_status, v_sale, v_prod_g, nullif(v_email, ''), v_res, p);
  return v_res;
end;
$$;

revoke all on function vendas.aplicar_venda_greenn(jsonb) from public, anon, authenticated;

-- 5) Chave secreta da URL do webhook (gerada no próprio banco; a edge function confere aqui)
create table if not exists vendas.greenn_config (
  id    boolean primary key default true check (id),
  token text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
);
insert into vendas.greenn_config (id) values (true) on conflict (id) do nothing;
alter table vendas.greenn_config enable row level security;
drop policy if exists greenn_config_admin on vendas.greenn_config;
create policy greenn_config_admin on vendas.greenn_config for select using (public.is_admin());
grant select on vendas.greenn_config to service_role;   -- a edge function lê a chave
