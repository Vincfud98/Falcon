// ════════════════════════════════════════════════════════════════════════
// Edge Function: stripe-checkout
// Cria uma assinatura recorrente (Stripe Checkout, mode=subscription) a partir
// de um Price recorrente criado no painel do Stripe. Resolve o cliente pelo
// usuário logado (JWT) e devolve a URL do checkout.
//
// Secrets: STRIPE_SECRET_KEY, APP_URL.
// Entrada (POST JSON): { price_id: "price_...", offer_id?: number }
// ════════════════════════════════════════════════════════════════════════
import Stripe from "https://esm.sh/stripe@16.12.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "método não permitido" }, 405);

  try {
    const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_KEY) return json({ error: "STRIPE_SECRET_KEY não configurado" }, 500);
    const APP_URL = Deno.env.get("APP_URL") || "https://www.grupoubique.com.br";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { price_id, offer_id } = await req.json().catch(() => ({}));
    if (!price_id) return json({ error: "price_id é obrigatório" }, 400);

    // Usuário logado (do JWT do app)
    const authHeader = req.headers.get("Authorization") || "";
    const asUser = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) return json({ error: "não autenticado" }, 401);

    // Cliente no CRM (por app_user_id ou e-mail)
    const crm = createClient(SUPABASE_URL, SERVICE, { db: { schema: "crm" } });
    let client: { id: string; email: string | null } | null = null;
    {
      const byUser = await crm.from("clients").select("id, email").eq("app_user_id", user.id).maybeSingle();
      client = byUser.data as any;
      if (!client && user.email) {
        const byEmail = await crm.from("clients").select("id, email").ilike("email", user.email).maybeSingle();
        client = byEmail.data as any;
      }
    }
    const email = (client?.email || user.email) ?? undefined;

    const stripe = new Stripe(STRIPE_KEY, {
      apiVersion: "2024-06-20",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const meta = {
      client_id: client?.id ?? "",
      email: email ?? "",
      offer_id: offer_id != null ? String(offer_id) : "",
    };

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: price_id, quantity: 1 }],
      customer_email: email,
      allow_promotion_codes: true,
      success_url: `${APP_URL}/?assinatura=sucesso`,
      cancel_url: `${APP_URL}/?assinatura=cancelada`,
      metadata: meta,
      subscription_data: { metadata: meta },
    });

    return json({ url: session.url, session_id: session.id });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
