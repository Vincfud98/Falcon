-- ════════════════════════════════════════════════════════════════════════
-- Greenn: Banco de Questões (assinatura mensal) + renovações.        2026-11-16
-- · vendas.greenn_produtos ganha `tipo` ('materia' | 'banco') e `dias_extra`
--   (folga para a renovação mensal não deixar o aluno sem acesso).
-- · aplicar_venda_greenn: libera o produto do tipo certo (curso ou banco) e,
--   se o aluno já tem matrícula Greenn ativa do MESMO produto, ESTENDE o prazo
--   (renovação) em vez de criar outra. Reembolso/chargeback cancela as
--   matrículas que tiveram aquela venda.
-- Os 3 casos: sem conta (ficha liga na criação da conta pelo e-mail), conta
-- gratuita (vale na hora) e quem já tem produto (soma; curso completo já
-- inclui o banco da matéria, aluno.meu_acesso trata isso).
-- ════════════════════════════════════════════════════════════════════════

alter table vendas.greenn_produtos add column if not exists tipo text not null default 'materia';
alter table vendas.greenn_produtos add column if not exists dias_extra integer not null default 0;

insert into vendas.greenn_produtos (greenn_product_id, nome, materias, meses, tipo, dias_extra) values
  (205028, 'Banco de Questões (Assinatura Mensal)', array[1,2,3,4,6,7,8,9,10,11,12], 1, 'banco', 5)
on conflict (greenn_product_id) do update
  set nome = excluded.nome, materias = excluded.materias, meses = excluded.meses,
      tipo = excluded.tipo, dias_extra = excluded.dias_extra, atualizado_em = now();

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
  v_banco   boolean;
  v_user uuid; v_cli uuid; v_mat integer; v_prod integer; v_ate timestamptz; v_fim timestamptz; v_exist uuid;
  n_novas int := 0; n_ja int := 0; n_ext int := 0; n_rev int := 0; v_sem int[] := '{}';
  v_res jsonb;
begin
  if v_tipo = 'contract' and v_status = 'paid' then v_sale := coalesce(p#>>'{currentSale,id}', v_sale); end if;

  select * into v_map from vendas.greenn_produtos where greenn_product_id = v_prod_g;
  v_banco := coalesce(v_map.tipo, 'materia') = 'banco';

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
        update crm.clients set phone = coalesce(nullif(phone, ''), v_fone), cpf = coalesce(nullif(cpf, ''), v_doc) where id = v_cli;
      end if;

      v_ate := now() + make_interval(months => v_map.meses, days => coalesce(v_map.dias_extra, 0));
      -- assinatura: se a Greenn mandar o fim do período pago, vale o que for mais longe (+ a folga)
      begin
        v_fim := nullif(p#>>'{contract,current_period_end}', '')::timestamptz;
        if v_fim is not null then v_ate := greatest(v_ate, v_fim + make_interval(days => coalesce(v_map.dias_extra, 0))); end if;
      exception when others then null;
      end;

      foreach v_mat in array v_map.materias loop
        v_prod := null;
        select x.id into v_prod from catalogo.products x
         where x.subject_id = v_mat
           and case when v_banco then x.kind = 'question_bank' else coalesce(x.kind, 'course') <> 'question_bank' end
         order by x.active desc, x.id limit 1;
        if v_prod is null then v_sem := v_sem || v_mat; continue; end if;
        -- a mesma venda já foi aplicada? (aviso repetido da Greenn)
        if exists (select 1 from vendas.enrollments e where e.client_id = v_cli and e.product_id = v_prod
                   and (e.metadata->>'greenn_sale_id' = v_sale or coalesce(e.metadata->'greenn_vendas', '[]'::jsonb) ? v_sale)) then
          n_ja := n_ja + 1; continue;
        end if;
        -- renovação (só no banco, que é assinatura): matrícula Greenn ativa do mesmo produto → estende o prazo.
        -- Nos preparatórios cada compra fica com a sua matrícula, para um reembolso nunca tirar o acesso de outra compra.
        v_exist := null;
        if v_banco then
        select e.id into v_exist from vendas.enrollments e
         where e.client_id = v_cli and e.product_id = v_prod and e.external_platform = 'greenn'
           and e.status = 'active' and (e.ends_at is null or e.ends_at > now())
         order by e.ends_at desc nulls first limit 1;
        end if;
        if v_exist is not null then
          update vendas.enrollments
             set ends_at = case when ends_at is null then null else greatest(ends_at, v_ate) end,
                 metadata = metadata || jsonb_build_object('greenn_sale_id', v_sale,
                              'greenn_vendas', coalesce(metadata->'greenn_vendas', '[]'::jsonb) || to_jsonb(v_sale),
                              'renovada_em', now())
           where id = v_exist;
          n_ext := n_ext + 1; continue;
        end if;
        insert into vendas.enrollments (client_id, product_id, offer_id, order_item_id, starts_at, ends_at, status,
                                        external_platform, external_enrollment_id, notes, metadata)
        values (v_cli, v_prod, null, null, now(), v_ate, 'active', 'greenn', v_sale,
                'Greenn · venda ' || coalesce(v_sale, '?') || ' · ' || v_map.nome,
                jsonb_build_object('origem', 'greenn', 'greenn_sale_id', v_sale, 'greenn_vendas', jsonb_build_array(v_sale),
                                   'greenn_product_id', v_prod_g, 'tipo', case when v_banco then 'banco' else 'materia' end));
        n_novas := n_novas + 1;
      end loop;
      v_res := jsonb_build_object('ok', true, 'acao', 'liberado', 'tipo', case when v_banco then 'banco' else 'materia' end,
                                  'cliente', v_cli, 'conta', v_user, 'matriculas_novas', n_novas, 'estendidas', n_ext,
                                  'ja_tinha', n_ja, 'materias_sem_produto', to_jsonb(v_sem), 'ate', v_ate);
    end if;
  elsif v_status in ('refunded', 'chargedback', 'chargeback') and v_sale is not null then
    update vendas.enrollments
       set status = 'cancelled', ends_at = now(),
           cancel_reason = case when v_status = 'refunded' then 'Greenn: reembolso' else 'Greenn: chargeback' end
     where (metadata->>'greenn_sale_id' = v_sale or coalesce(metadata->'greenn_vendas', '[]'::jsonb) ? v_sale)
       and status in ('active', 'paused');
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
