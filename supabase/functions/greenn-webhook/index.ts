// ════════════════════════════════════════════════════════════════════════
// Edge Function: greenn-webhook
// A Greenn chama esta URL a cada mudança de venda (webhook "Disparo para o seu
// sistema", configurado em cada produto). Repassamos o evento inteiro para
// vendas.aplicar_venda_greenn, que:
//   · venda paga            → libera as matérias mapeadas em vendas.greenn_produtos (24 meses)
//   · reembolso/chargeback  → cancela as matrículas daquela venda
//   · produto não mapeado   → só registra (vendas.greenn_eventos)
// Idempotente pelo id da venda. Segurança: a Greenn não assina o webhook, então
// a URL leva um token secreto (?token=...) que precisa bater com vendas.greenn_config.token.
//
// A chave fica em vendas.greenn_config (gerada no banco).  verify_jwt = false (é a Greenn que chama).
// ════════════════════════════════════════════════════════════════════════
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

function igual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// a Greenn manda JSON; por garantia aceita também form-urlencoded
async function lerCorpo(req: Request): Promise<Record<string, unknown>> {
  const txt = await req.text();
  try { return JSON.parse(txt); } catch (_) { /* segue */ }
  const out: Record<string, unknown> = {};
  new URLSearchParams(txt).forEach((v, k) => {
    try { out[k] = JSON.parse(v); } catch (_) { out[k] = v; }
  });
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "GET") return new Response("greenn-webhook ok", { status: 200 });
  if (req.method !== "POST") return new Response("método não suportado", { status: 405 });

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { db: { schema: "vendas" } });
  const { data: cfg } = await db.from("greenn_config").select("token").eq("id", true).maybeSingle();
  const TOKEN = (cfg && cfg.token) || "";
  const recebido = new URL(req.url).searchParams.get("token") || "";
  if (!TOKEN || !igual(recebido, TOKEN)) return new Response("não autorizado", { status: 401 });

  const corpo = await lerCorpo(req);
  const { data, error } = await db.rpc("aplicar_venda_greenn", { p: corpo });
  if (error) return new Response("erro: " + error.message, { status: 500 });   // 500 → a Greenn tenta de novo
  return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
});
