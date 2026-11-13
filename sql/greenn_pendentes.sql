-- ════════════════════════════════════════════════════════════════════════
-- Greenn: compra feita com e-mail diferente do da conta.             2026-11-13
-- O acesso (aluno.meu_acesso) junta TODAS as fichas (crm.clients) ligadas à
-- conta (app_user_id). Então "consertar" = ligar a ficha da compra à conta
-- certa; as matrículas não mudam. Só ADICIONA funções novas.
-- ════════════════════════════════════════════════════════════════════════

-- 1) Compras da Greenn cuja ficha ainda não está ligada a nenhuma conta,
--    com sugestões de conta da mesma pessoa (CPF, telefone ou nome iguais).
create or replace function vendas.greenn_pendentes()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v jsonb;
begin
  if not (public.is_admin() or public.tem_area('portaria') or public.tem_area('comercial')) then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  with fichas as (
    select c.id, c.full_name, c.email, c.phone, c.cpf,
           min(e.created_at) as comprou_em,
           array_agg(distinct coalesce(g.nome, 'Produto Greenn ' || (e.metadata->>'greenn_product_id'))) as produtos,
           regexp_replace(coalesce(c.phone, ''), '\D', '', 'g') as fone,
           regexp_replace(coalesce(c.cpf, ''), '\D', '', 'g') as doc,
           lower(btrim(coalesce(c.full_name, ''))) as nome_n
      from crm.clients c
      join vendas.enrollments e on e.client_id = c.id
      left join vendas.greenn_produtos g on g.greenn_product_id = (e.metadata->>'greenn_product_id')::bigint
     where c.app_user_id is null
       and e.external_platform = 'greenn' and e.status = 'active'
     group by c.id
  ), contas as (
    select u.id as user_id, u.email, coalesce(nullif(u.full_name, ''), u.nickname, u.email) as nome,
           lower(btrim(coalesce(u.full_name, ''))) as nome_n,
           (select string_agg(regexp_replace(coalesce(x.phone, ''), '\D', '', 'g'), ',') from crm.clients x where x.app_user_id = u.id) as fones,
           (select string_agg(regexp_replace(coalesce(x.cpf, ''), '\D', '', 'g'), ',') from crm.clients x where x.app_user_id = u.id) as docs
      from crm.app_users u
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'ficha', f.id, 'nome', f.full_name, 'email', f.email, 'telefone', f.phone,
           'comprou_em', f.comprou_em, 'produtos', to_jsonb(f.produtos),
           'sugestoes', coalesce((
              select jsonb_agg(jsonb_build_object('email', k.email, 'nome', k.nome, 'motivo', k.motivo) order by k.peso desc)
                from (
                  select ct.email, ct.nome,
                         case when length(f.doc) >= 11 and position(f.doc in coalesce(ct.docs, '')) > 0 then 'mesmo CPF'
                              when length(f.fone) >= 8 and position(right(f.fone, 8) in coalesce(ct.fones, '')) > 0 then 'mesmo telefone'
                              else 'mesmo nome' end as motivo,
                         case when length(f.doc) >= 11 and position(f.doc in coalesce(ct.docs, '')) > 0 then 3
                              when length(f.fone) >= 8 and position(right(f.fone, 8) in coalesce(ct.fones, '')) > 0 then 2
                              else 1 end as peso
                    from contas ct
                   where lower(ct.email) <> lower(coalesce(f.email, ''))
                     and ( (length(f.doc) >= 11 and position(f.doc in coalesce(ct.docs, '')) > 0)
                        or (length(f.fone) >= 8 and position(right(f.fone, 8) in coalesce(ct.fones, '')) > 0)
                        or (length(f.nome_n) >= 8 and ct.nome_n = f.nome_n) )
                   limit 5
                ) k), '[]'::jsonb)
         ) order by f.comprou_em desc), '[]'::jsonb)
    into v
    from fichas f;
  return v;
end;
$$;
revoke all on function vendas.greenn_pendentes() from public, anon;
grant execute on function vendas.greenn_pendentes() to authenticated;

-- 2) Liga a ficha da compra à conta (pelo e-mail da conta). Libera na hora.
create or replace function vendas.greenn_ligar_conta(p_ficha uuid, p_email_conta text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_user uuid; v_n int;
begin
  if not (public.is_admin() or public.tem_area('portaria') or public.tem_area('comercial')) then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  select u.id into v_user from crm.app_users u where lower(u.email) = lower(btrim(p_email_conta)) limit 1;
  if v_user is null then
    raise exception 'Não existe conta na Falcon com o e-mail %.', btrim(p_email_conta);
  end if;
  update crm.clients set app_user_id = v_user, status = 'customer'
   where id = p_ficha and app_user_id is null;
  get diagnostics v_n = row_count;
  if v_n = 0 then raise exception 'Essa ficha já está ligada a uma conta (ou não existe).'; end if;
  return jsonb_build_object('ok', true, 'ficha', p_ficha, 'conta', v_user);
end;
$$;
revoke all on function vendas.greenn_ligar_conta(uuid, text) from public, anon;
grant execute on function vendas.greenn_ligar_conta(uuid, text) to authenticated;
