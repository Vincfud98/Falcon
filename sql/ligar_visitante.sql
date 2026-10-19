-- ════════════════════════════════════════════════════════════════════════
-- Liga o visitante (ubq_vid) ao cliente do CRM quando ele cria conta / entra
-- logado. Carimba client_id em TODOS os eventos passados daquele visitor_id,
-- então o perfil na Origem de Tráfego passa a mostrar nome, e-mail e telefone.
-- Self-healing: o portal chama isto 1x por sessão de quem está logado, então
-- os anônimos que já criaram conta também são ligados no próximo acesso.
-- Rode no SQL Editor do Supabase.
-- ════════════════════════════════════════════════════════════════════════

create or replace function crm.ligar_meu_visitante(p_visitor_id text)
returns jsonb
language plpgsql
security definer
set search_path = crm, public
as $$
declare
  v_email  text;
  v_client uuid;
  n        int;
begin
  v_email := auth.email();
  if v_email is null or p_visitor_id is null or p_visitor_id = '' then
    return jsonb_build_object('ok', false, 'motivo', 'sem email/visitor');
  end if;

  -- cliente do CRM pelo e-mail da conta logada
  select id into v_client from crm.clients where lower(email) = lower(v_email) limit 1;
  if v_client is null then
    return jsonb_build_object('ok', false, 'motivo', 'sem cliente');
  end if;

  -- carimba os eventos passados deste visitante (só os ainda soltos)
  update crm.web_events
     set client_id = v_client
   where visitor_id = p_visitor_id
     and client_id is null;
  get diagnostics n = row_count;

  return jsonb_build_object('ok', true, 'client_id', v_client, 'eventos_ligados', n);
end;
$$;

grant execute on function crm.ligar_meu_visitante(text) to authenticated;
