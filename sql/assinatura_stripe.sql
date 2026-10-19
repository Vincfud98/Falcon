-- ════════════════════════════════════════════════════════════════════════
-- Assinatura recorrente — Stripe (Fase 2) — 2026-10-17
-- Tabela de tracking + função chamada pela edge function stripe-webhook.
-- O encanamento do Stripe (checkout/webhook) já está pronto; AQUI fica a regra
-- de negócio de vocês: o que a assinatura libera de acesso.
-- Rode no SQL Editor do Supabase.
-- ════════════════════════════════════════════════════════════════════════

-- 1) Tracking das assinaturas (estado atual de cada assinatura do Stripe)
create table if not exists vendas.stripe_subscriptions (
  subscription_id     text primary key,
  client_id           uuid,
  email               text,
  status              text,            -- active | trialing | past_due | canceled | unpaid ...
  current_period_end  timestamptz,
  price_id            text,
  amount              numeric,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- RLS: só admin lê pelo app (a edge function usa service role e bypassa).
alter table vendas.stripe_subscriptions enable row level security;
drop policy if exists stripe_subscriptions_admin on vendas.stripe_subscriptions;
create policy stripe_subscriptions_admin on vendas.stripe_subscriptions
  for all using (public.is_admin()) with check (public.is_admin());
grant select on vendas.stripe_subscriptions to authenticated;

-- 2) Aplica o estado da assinatura: registra sempre e, quando ativa, deve
--    liberar/estender o acesso até current_period_end.
create or replace function vendas.aplicar_assinatura_stripe(
  p_subscription_id    text,
  p_email              text,
  p_status             text,
  p_current_period_end timestamptz,
  p_price_id           text,
  p_amount             numeric
) returns jsonb
language plpgsql
security definer
set search_path = vendas, crm, public
as $$
declare
  v_client uuid;
begin
  -- liga ao cliente do CRM pelo e-mail
  select id into v_client from crm.clients where lower(email) = lower(p_email) limit 1;

  -- registra/atualiza o estado da assinatura (idempotente)
  insert into vendas.stripe_subscriptions
    (subscription_id, client_id, email, status, current_period_end, price_id, amount, updated_at)
  values
    (p_subscription_id, v_client, p_email, p_status, p_current_period_end, p_price_id, p_amount, now())
  on conflict (subscription_id) do update
    set status             = excluded.status,
        current_period_end = excluded.current_period_end,
        amount             = excluded.amount,
        price_id           = coalesce(excluded.price_id, vendas.stripe_subscriptions.price_id),
        client_id          = coalesce(vendas.stripe_subscriptions.client_id, excluded.client_id),
        updated_at         = now();

  -- ───────────────────────────────────────────────────────────────────────
  -- ACESSO (o único ponto que depende de regra de negócio de vocês)
  -- Só vocês sabem o que cada price_id da mentoria libera (matérias/turma/banco).
  -- A estrutura dos dois lados já está aqui — basta preencher as matérias e o
  -- tipo e descomentar. (dar_acesso ESTENDE o prazo de quem já tem, então a
  -- renovação mensal só empurra o current_period_end.)
  --
  -- if p_status in ('active','trialing') and p_email is not null then
  --   -- LIBERA / ESTENDE até o fim do período pago
  --   perform vendas.dar_acesso(
  --     array[p_email],
  --     array[ <ids_das_materias_da_assinatura> ],   -- conforme o p_price_id
  --     p_current_period_end,
  --     'Assinatura Stripe '||p_subscription_id,
  --     '<tipo>'                                      -- ex.: completo / banco
  --   );
  -- elsif p_status in ('canceled','unpaid','incomplete_expired') then
  --   -- ENGENHARIA REVERSA: cancelou / não pagou → encerra o acesso.
  --   -- Opção A (recomendada): não fazer nada — como o acesso foi dado só até
  --   --   current_period_end, ele EXPIRA sozinho no fim do período já pago.
  --   -- Opção B (corte imediato): encerre as matrículas da assinatura, ex.:
  --   --   update vendas.enrollments set status='cancelled',
  --   --          cancel_reason='Assinatura Stripe cancelada', ends_at=now()
  --   --    where client_id = v_client and status in ('active','paused')
  --   --      and notes like 'Assinatura Stripe '||p_subscription_id||'%';
  -- end if;
  -- ───────────────────────────────────────────────────────────────────────

  return jsonb_build_object('client_id', v_client, 'status', p_status, 'ate', p_current_period_end);
end;
$$;

-- A edge function usa a service role (bypassa RLS); o grant abaixo é só por garantia.
grant execute on function vendas.aplicar_assinatura_stripe(text,text,text,timestamptz,text,numeric) to authenticated;
