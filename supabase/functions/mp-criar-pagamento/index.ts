// ════════════════════════════════════════════════════════════════════════
// Edge Function: mp-criar-pagamento
// Cria um pagamento no Mercado Pago (Checkout Pro) a partir de um pedido já
// criado por vendas.criar_pedido. Oferece Pix (em destaque) + cartão em até
// 12×. Devolve init_point (URL do checkout) para o portal redirecionar.
//
// Secrets necessários (supabase secrets set ...):
//   MP_ACCESS_TOKEN  — Access Token do Mercado Pago (TESTE primeiro)
//   APP_URL          — ex.: https://www.grupoubique.com.br (back_urls)
// Injetados pelo Supabase automaticamente: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// ════════════════════════════════════════════════════════════════════════
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "método não permitido" }, 405);

  try {
    const MP_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
    if (!MP_TOKEN) return json({ error: "MP_ACCESS_TOKEN não configurado no Supabase" }, 500);

    const APP_URL = Deno.env.get("APP_URL") || "https://www.grupoubique.com.br";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { order_id, order_number } = await req.json().catch(() => ({}));
    if (!order_id && !order_number) {
      return json({ error: "order_id ou order_number é obrigatório" }, 400);
    }

    const db = createClient(SUPABASE_URL, SERVICE_KEY, { db: { schema: "vendas" } });

    // Busca o pedido (por id ou número)
    let query = db.from("orders")
      .select("id, order_number, total, currency, status, client_id")
      .limit(1);
    query = order_id ? query.eq("id", order_id) : query.eq("order_number", order_number);
    const { data: order, error } = await query.maybeSingle();

    if (error) return json({ error: error.message }, 500);
    if (!order) return json({ error: "Pedido não encontrado" }, 404);
    if (order.status === "paid") return json({ error: "Pedido já está pago" }, 409);

    const total = Number(order.total);
    if (!(total > 0)) return json({ error: "Total do pedido inválido" }, 400);

    const webhookUrl = `${SUPABASE_URL}/functions/v1/mp-webhook`;

    const preference = {
      items: [{
        title: `Pedido ${order.order_number || order.id}`,
        quantity: 1,
        unit_price: total,
        currency_id: order.currency || "BRL",
      }],
      external_reference: String(order.id),
      notification_url: webhookUrl,
      back_urls: {
        success: `${APP_URL}/?pagamento=sucesso`,
        pending: `${APP_URL}/?pagamento=pendente`,
        failure: `${APP_URL}/?pagamento=falha`,
      },
      auto_return: "approved",
      payment_methods: { installments: 12 }, // Pix já vem habilitado pela conta
      metadata: { order_id: order.id, order_number: order.order_number },
    };

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preference),
    });
    const mp = await mpRes.json();
    if (!mpRes.ok) return json({ error: "Mercado Pago recusou a preferência", detail: mp }, 502);

    return json({
      init_point: mp.init_point,
      sandbox_init_point: mp.sandbox_init_point,
      preference_id: mp.id,
    });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
