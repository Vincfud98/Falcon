-- Cortesia mensal de Falcoins só para quem tem CURSO ativo   2026-11-25
-- Antes: qualquer matrícula ativa dava a cortesia, inclusive a do Falcon Pro
-- (Banco de Questões, produtos kind = 'question_bank'). Regra do time: o Falcon Pro
-- compra Falcoins; a cortesia mensal é de quem compra os cursos.
-- O bônus de boas-vindas (public.bonus_boas_vindas, 5 Falcoins ao confirmar o e-mail)
-- continua igual para todo mundo.
create or replace function carteira.creditar_cortesia_conta(p_user uuid)
returns numeric
language plpgsql
security definer
set search_path to 'carteira', 'vendas', 'crm', 'conteudo', 'public'
as $function$
declare
  v_valor numeric;
  v_ultimo timestamptz;
begin
  if p_user is null then return 0; end if;
  perform pg_advisory_xact_lock(hashtext('cortesia:' || p_user::text));
  select coalesce(cortesia_mensal, 10) into v_valor from conteudo.platform_config where id = 'default';
  v_valor := coalesce(v_valor, 10);
  if v_valor <= 0 then return 0; end if;   -- desligada pelo admin
  -- precisa ter PELO MENOS UMA matrícula ativa de CURSO (Falcon Pro / banco de questões não conta)
  if not exists (
    select 1
      from vendas.enrollments e
      join crm.clients c on c.id = e.client_id
      left join catalogo.products p on p.id = e.product_id
     where c.app_user_id = p_user
       and e.status = 'active'
       and (e.ends_at is null or e.ends_at > now())
       and coalesce(p.kind, 'course') <> 'question_bank'
  ) then
    return 0;
  end if;
  -- uma cortesia por ciclo: âncora = último crédito (1º ciclo = início da matrícula)
  select max(criado_em) into v_ultimo from carteira.lancamentos where user_id = p_user and acao = 'cortesia_mensal';
  if v_ultimo is not null and v_ultimo + interval '1 month' > now() then return 0; end if;
  perform carteira.mov(p_user, v_valor, 'cortesia_mensal', 'cortesia', 'Cortesia mensal de Falcoins — curso ativo', '{}'::jsonb, null);
  -- aviso no sino (nunca derruba o crédito)
  begin
    insert into aluno.notifications (id, user_id, type, payload, read, created_at)
    values (gen_random_uuid(), p_user, 'cortesia_ubitokens', jsonb_build_object('ubitokens', v_valor), false, now());
  exception when others then null;
  end;
  return v_valor;
end
$function$;
