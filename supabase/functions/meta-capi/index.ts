// ════════════════════════════════════════════════════════════════════════
// Edge Function: meta-capi  (Meta Conversions API — eventos do servidor)
// Recebe um evento, hasheia o PII (SHA-256) e envia pra Graph API da Meta.
// É chamada: (a) pelo trigger de pagamento (Purchase de toda venda, inclusive
// manual/offline), (b) por outras funções/cron no futuro (lead→cliente etc).
// Deduplica com o Pixel do navegador pelo mesmo event_id.
//
// Protegida por secret: header x-capi-secret == META_CAPI_PROXY_SECRET.
// verify_jwt = false (chamada servidor→servidor) — ver supabase/config.toml.
//
// Secrets: META_PIXEL_ID, META_CAPI_TOKEN, META_CAPI_PROXY_SECRET,
//          META_TEST_EVENT_CODE (opcional, só p/ testar no Events Manager).
// Entrada (POST JSON):
//   { event_name, event_id?, email?, phone?, external_id?, value?, currency?,
//     content_name?, content_ids?, action_source?, event_source_url?, fbp?, fbc? }
// ════════════════════════════════════════════════════════════════════════

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function normEmail(e: string){ return (e || "").trim().toLowerCase(); }
function normPhone(p: string){ let d = (p || "").replace(/\D/g, ""); if(d && d.length <= 11) d = "55" + d; return d; }

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("método não permitido", { status: 405 });

    const PIXEL = Deno.env.get("META_PIXEL_ID");
    const TOKEN = Deno.env.get("META_CAPI_TOKEN");
    const SECRET = Deno.env.get("META_CAPI_PROXY_SECRET");
    const TEST_CODE = Deno.env.get("META_TEST_EVENT_CODE");
    if (!PIXEL || !TOKEN) return new Response("META_PIXEL_ID/META_CAPI_TOKEN ausentes", { status: 500 });
    if (SECRET && req.headers.get("x-capi-secret") !== SECRET) return new Response("não autorizado", { status: 401 });

    const b = await req.json().catch(() => ({} as any));
    if (!b.event_name) return new Response("event_name obrigatório", { status: 400 });

    const user_data: Record<string, unknown> = {};
    if (b.email) user_data.em = [await sha256Hex(normEmail(b.email))];
    if (b.phone) { const ph = normPhone(b.phone); if (ph) user_data.ph = [await sha256Hex(ph)]; }
    if (b.external_id) user_data.external_id = [await sha256Hex(String(b.external_id).trim().toLowerCase())];
    if (b.fbp) user_data.fbp = b.fbp;
    if (b.fbc) user_data.fbc = b.fbc;
    if (b.client_ip) user_data.client_ip_address = b.client_ip;
    if (b.client_ua) user_data.client_user_agent = b.client_ua;

    const custom_data: Record<string, unknown> = {};
    if (b.value != null) custom_data.value = Number(b.value);
    if (b.currency) custom_data.currency = b.currency;
    if (b.content_name) custom_data.content_name = b.content_name;
    if (b.content_ids) custom_data.content_ids = Array.isArray(b.content_ids) ? b.content_ids : [b.content_ids];
    if (b.order_id) custom_data.order_id = String(b.order_id);

    const evt: Record<string, unknown> = {
      event_name: b.event_name,
      event_time: Math.floor(Date.now() / 1000),
      action_source: b.action_source || "system_generated",
      user_data,
    };
    if (b.event_id) evt.event_id = String(b.event_id);
    if (b.event_source_url) evt.event_source_url = b.event_source_url;
    if (Object.keys(custom_data).length) evt.custom_data = custom_data;

    const payload: Record<string, unknown> = { data: [evt] };
    if (TEST_CODE) payload.test_event_code = TEST_CODE;

    const res = await fetch(`https://graph.facebook.com/v19.0/${PIXEL}/events?access_token=${encodeURIComponent(TOKEN)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    return new Response(JSON.stringify({ ok: res.ok, meta: out }), {
      status: res.ok ? 200 : 502,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response("erro: " + String((e as Error)?.message || e), { status: 500 });
  }
});
