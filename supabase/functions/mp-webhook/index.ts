// ════════════════════════════════════════════════════════════════════════
// Edge Function: mp-webhook  (Mercado Pago — gateway único)
// Recebe a notificação do MP, reconsulta o pagamento (fonte da verdade) e
// grava em vendas.payments. O trigger do banco faz o resto:
//   · pagamento aprovado  → upsert status 'paid'      → trigger libera acesso
//   · estorno / chargeback → upsert status 'refunded' + campos de estorno
//        (ESPELHA o botão "estornar" do admin) → trigger reverte o acesso
//   · cancelado / rejeitado → status 'failed' (nunca houve acesso)
//
// Idempotente por gateway_payment_id. Segurança: valida a assinatura do MP
// quando MP_WEBHOOK_SECRET está configurado. verify_jwt=false (é o MP que chama).
//
// Secrets: MP_ACCESS_TOKEN (obrigatório), MP_WEBHOOK_SECRET (recomendado).
// ════════════════════════════════════════════════════════════════════════
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const MP_STATUS: Record<string, string> = {
  approved: "paid", authorized: "paid",
  pending: "pending", in_process: "pending", in_mediation: "pending",
  rejected: "failed", cancelled: "failed",
  refunded: "refunded", charged_back: "refunded",
};
const MP_METHOD: Record<string, string> = {
  credit_card: "credit_card", debit_card: "debit_card",
  ticket: "boleto", bank_transfer: "pix", account_money: "transfer",
};

async function hmacHex(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Valida x-signature do MP: manifest "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
async function validMpSignature(req: Request, dataId: string, secret: string): Promise<boolean> {
  const xSig = req.headers.get("x-signature") || "";
  const xReq = req.headers.get("x-request-id") || "";
  const parts: Record<string, string> = {};
  xSig.split(",").forEach((p) => { const [k, v] = p.split("="); if (k && v) parts[k.trim()] = v.trim(); });
  if (!parts.ts || !parts.v1) return false;
  const manifest = `id:${(dataId || "").toLowerCase()};request-id:${xReq};ts:${parts.ts};`;
  const expected = await hmacHex(secret, manifest);
  return expected === parts.v1;
}

Deno.serve(async (req) => {
  try {
    const MP_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
    const SECRET = Deno.env.get("MP_WEBHOOK_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!MP_TOKEN) return new Response("MP_ACCESS_TOKEN ausente", { status: 500 });

    const url = new URL(req.url);
    const topic = url.searchParams.get("type") || url.searchParams.get("topic");
    let paymentId = url.searchParams.get("data.id") || url.searchParams.get("id");
    if (!paymentId) {
      const body = await req.json().catch(() => ({} as any));
      paymentId = body?.data?.id || body?.id || null;
    }

    if (topic && topic !== "payment") return new Response("ignorado", { status: 200 });
    if (!paymentId) return new Response("sem payment id", { status: 200 });

    // Segurança: se há secret configurado, a assinatura precisa bater.
    if (SECRET) {
      const ok = await validMpSignature(req, String(paymentId), SECRET);
      if (!ok) return new Response("assinatura inválida", { status: 401 });
    }

    // Fonte da verdade: reconsulta o pagamento no MP.
    const payRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { "Authorization": `Bearer ${MP_TOKEN}` },
    });
    const pay = await payRes.json();
    if (!payRes.ok) return new Response("pagamento não encontrado no MP", { status: 200 });

    const orderId = pay.external_reference;
    if (!orderId) return new Response("pagamento sem external_reference", { status: 200 });

    const total = Number(pay.transaction_amount) || 0;
    const refundedAmt = Number(pay.transaction_amount_refunded) || 0;
    const isRefund = pay.status === "refunded" || pay.status === "charged_back" ||
      (refundedAmt > 0 && refundedAmt >= total);
    const method = MP_METHOD[pay.payment_type_id] || "manual";

    const db = createClient(SUPABASE_URL, SERVICE, { db: { schema: "vendas" } });

    const payload: Record<string, unknown> = {
      order_id: orderId,
      amount: total,
      currency: pay.currency_id || "BRL",
      method,
      gateway: "mercado_pago",
      gateway_payment_id: String(pay.id),
      status: isRefund ? "refunded" : (MP_STATUS[pay.status] || "pending"),
      notes: `MP ${pay.status}${pay.payment_method_id ? " · " + pay.payment_method_id : ""}`,
    };

    if (isRefund) {
      // Espelha o estorno do admin → o trigger reverte o acesso.
      payload.refunded_at = new Date().toISOString();
      payload.refund_amount = refundedAmt || total;
      payload.refund_reason = `Estorno Mercado Pago (${pay.status})`;
      payload.paid_at = null;
    } else if (pay.status === "approved") {
      payload.paid_at = pay.date_approved || new Date().toISOString();
    }

    const { error } = await db.from("payments").upsert(payload, { onConflict: "gateway_payment_id" });
    if (error) return new Response("erro ao gravar pagamento: " + error.message, { status: 500 });

    return new Response("ok", { status: 200 });
  } catch (e) {
    return new Response("erro: " + String((e as Error)?.message || e), { status: 500 });
  }
});
