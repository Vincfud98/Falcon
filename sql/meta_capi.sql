-- ════════════════════════════════════════════════════════════════════════
-- Meta Conversions API — Purchase de TODA venda (inclusive manual/offline)
-- 2026-10-19
-- Um trigger em vendas.payments: quando um pagamento vira 'paid' (seja pelo
-- botão do admin, pelo mp-webhook ou pelo stripe-webhook), chama a edge
-- function meta-capi via pg_net, que manda o Purchase pro Meta com o valor +
-- e-mail do cliente (hasheado lá). event_id = id do pagamento (dedupe).
--
-- Pré-requisitos: extensão pg_net habilitada (Dashboard › Database ›
-- Extensions). Troque <META_CAPI_PROXY_SECRET> pelo mesmo valor do secret da
-- edge function. Rode no SQL Editor do Supabase.
-- ════════════════════════════════════════════════════════════════════════

create or replace function vendas._meta_purchase()
returns trigger
language plpgsql
security definer
set search_path = vendas, crm, public
as $$
declare
  v_email text;
begin
  -- Só quando o pagamento ENTRA como pago (ou passa a pago).
  if NEW.status = 'paid' and (TG_OP = 'INSERT' or coalesce(OLD.status, '') <> 'paid') then
    select c.email into v_email
      from vendas.orders o
      join crm.clients c on c.id = o.client_id
     where o.id = NEW.order_id
     limit 1;

    perform net.http_post(
      url := 'https://kluqjqojxzpuiauuidwx.supabase.co/functions/v1/meta-capi',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-capi-secret', '<META_CAPI_PROXY_SECRET>'
      ),
      body := jsonb_build_object(
        'event_name',    'Purchase',
        'event_id',      NEW.id::text,
        'email',         v_email,
        'value',         NEW.amount,
        'currency',      coalesce(NEW.currency, 'BRL'),
        'order_id',      NEW.order_id::text,
        'action_source', 'system_generated'
      )
    );
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_meta_purchase on vendas.payments;
create trigger trg_meta_purchase
  after insert or update of status on vendas.payments
  for each row execute function vendas._meta_purchase();
