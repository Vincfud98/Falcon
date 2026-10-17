// ════════════════════════════════════════════════════════════════════════
// Edge Function: stripe-webhook
// Recebe eventos do Stripe (assinatura), valida a assinatura do webhook e
// aplica o estado via vendas.aplicar_assinatura_stripe (que registra e libera/
// estende o acesso até o fim do período pago).
//
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET.
// verify_jwt = false (é o Stripe que chama) — ver supabase/config.toml.
// ════════════════════════════════════════════════════════════════════════
import Stripe from "https://esm.sh/stripe@16.12.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const stripe = new Stripe(STRIPE_KEY, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();
  if (!sig) return new Response("sem assinatura", { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, WEBHOOK_SECRET, undefined, cryptoProvider);
  } catch (e) {
    return new Response("assinatura inválida: " + String((e as Error)?.message || e), { status: 400 });
  }

  const db = createClient(SUPABASE_URL, SERVICE, { db: { schema: "vendas" } });

  // Aplica o estado de uma assinatura: registra + (na função SQL) libera/estende acesso.
  async function applySub(sub: Stripe.Subscription) {
    const item = sub.items?.data?.[0];
    const priceId = item?.price?.id ?? null;
    const amount = (item?.price?.unit_amount ?? 0) / 100;

    let email: string | null = null;
    try {
      if (typeof sub.customer === "string") {
        const c = await stripe.customers.retrieve(sub.customer);
        if (c && !(c as any).deleted) email = (c as Stripe.Customer).email ?? null;
      }
    } catch (_) { /* segue sem e-mail */ }
    if (!email) email = (sub.metadata?.email as string) || null;

    await db.rpc("aplicar_assinatura_stripe", {
      p_subscription_id: sub.id,
      p_email: email,
      p_status: sub.status,
      p_current_period_end: new Date((sub.current_period_end ?? 0) * 1000).toISOString(),
      p_price_id: priceId,
      p_amount: amount,
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.mode === "subscription" && s.subscription) {
          const sub = await stripe.subscriptions.retrieve(String(s.subscription));
          await applySub(sub);
        }
        break;
      }
      case "invoice.paid":
      case "invoice.payment_succeeded": {
        const inv = event.data.object as Stripe.Invoice;
        if (inv.subscription) {
          const sub = await stripe.subscriptions.retrieve(String(inv.subscription));
          await applySub(sub);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await applySub(event.data.object as Stripe.Subscription);
        break;
      }
      default:
        break; // outros eventos: ignora
    }
  } catch (e) {
    // devolve 500 pra o Stripe tentar de novo
    return new Response("erro ao aplicar: " + String((e as Error)?.message || e), { status: 500 });
  }

  return new Response("ok", { status: 200 });
});
