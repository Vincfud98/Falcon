// ════════════════════════════════════════════════════════════════════════
// Edge Function: mp-webhook
// Recebe a notificação do Mercado Pago, consulta o pagamento e grava em
// vendas.payments. O trigger existente do banco muda o status do pedido e
// libera o acesso (enrollment) quando o pagamento entra como "paid".
//
// Idempotente: upsert por gateway_payment_id (rode antes o SQL que cria a
// coluna + índice único — sql/pagamentos_mercadopago.sql).
//
// Secrets: MP_ACCESS_TOKEN. Configure a URL desta função como webhook no
// painel do Mercado Pago (Notificações / Webhooks → eventos de "Pagamentos").
// verify_jwt = false (ver supabase/config.toml).
// ════════════════════════════════════════════════════════════════════════
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const MP_STATUS: Record<string, string> = {
  approved: "paid",
  authorized: "paid",
  pending: "pending",
  in_process: "pending",
  in_mediation: "pending",
  rejected: "failed",
  cancelled: "failed",
  refunded: "refunded",
  charged_back: "refunded",
};

const MP_METHOD: Record<string, string> = {
  credit_card: "credit_card",
  debit_card: "debit_card",
  ticket: "boleto",          // boleto
  bank_transfer: "pix",      // Pix no MP vem como bank_transfer
  account_money: "transfer", // saldo MP
};

Deno.serve(async (req) => {
  try {
    const MP_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!MP_TOKEN) return new Response("MP_ACCESS_TOKEN ausente", { status: 500 });

    // O MP manda o id do pagamento por query (?type=payment&data.id=) ou no corpo.
    const url = new URL(req.url);
    const topic = url.searchParams.get("type") || url.searchParams.get("topic");
    let paymentId = url.searchParams.get("data.id") || url.searchParams.get("id");
    if (!paymentId) {
      const body = await req.json().catch(() => ({} as any));
      paymentId = body?.data?.id || body?.id || null;
    }

    // Só tratamos notificação de pagamento; o resto respondemos 200 pra não repetir.
    if (topic && topic !== "payment") return new Response("ignorado", { status: 200 });
    if (!paymentId) return new Response("sem payment id", { status: 200 });

    // Consulta o pagamento no MP (fonte da verdade — nunca confie só na notificação).
    const payRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { "Authorization": `Bearer ${MP_TOKEN}` },
    });
    const pay = await payRes.json();
    if (!payRes.ok) return new Response("pagamento não encontrado no MP", { status: 200 });

    const orderId = pay.external_reference;
    if (!orderId) return new Response("pagamento sem external_reference", { status: 200 });

    const status = MP_STATUS[pay.status] || "pending";
    const method = MP_METHOD[pay.payment_type_id] || "manual";

    const db = createClient(SUPABASE_URL, SERVICE_KEY, { db: { schema: "vendas" } });
    const payload = {
      order_id: orderId,
      amount: Number(pay.transaction_amount) || 0,
      currency: pay.currency_id || "BRL",
      method,
      status,
      gateway: "mercado_pago",
      gateway_payment_id: String(pay.id),
      paid_at: pay.status === "approved" ? (pay.date_approved || new Date().toISOString()) : null,
      notes: `MP ${pay.status}${pay.payment_method_id ? " · " + pay.payment_method_id : ""}`,
    };

    const { error } = await db.from("payments").upsert(payload, { onConflict: "gateway_payment_id" });
    if (error) return new Response("erro ao gravar pagamento: " + error.message, { status: 500 });

    return new Response("ok", { status: 200 });
  } catch (e) {
    return new Response("erro: " + String((e as Error)?.message || e), { status: 500 });
  }
});
