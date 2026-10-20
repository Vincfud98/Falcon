// ════════════════════════════════════════════════════════════════════════
// Edge Function: regua-automatica
// Executa as regras ativas da régua (crm.automacoes): busca os clientes
// elegíveis (crm.regua_pendentes) e envia pelo canal da regra — WhatsApp
// (padrão) ou e-mail — registrando em crm.automacao_envios. Chamada pelo
// pg_cron (diário) — ver sql/regua_automatica.sql.
//
// Secrets:
//   REGUA_CRON_SECRET    — segredo conferido no header x-regua-secret
//   WHATSAPP_SEND_URL    — endpoint do provedor de WhatsApp (ex.: Z-API/Evolution
//                          send-text). Recebe POST { phone, message }.
//   WHATSAPP_CLIENT_TOKEN— (opcional) vai no header Client-Token (Z-API).
//   RESEND_API_KEY       — chave do Resend (só se alguma regra for canal=email)
//   RESEND_FROM          — remetente verificado do e-mail
// WhatsApp iniciado pela empresa (fora da janela de 24h) exige TEMPLATE
// aprovado na API oficial da Meta (Cloud API). Com Z-API/Evolution o texto é
// livre. Este sender manda texto livre (compatível Z-API/Evolution). Pra Cloud
// API oficial, troque o corpo do POST pelo payload de template.
// Corpo opcional: { "dry_run": true } → só conta, não envia.
// ════════════════════════════════════════════════════════════════════════
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

function esc(s: string): string {
  return String(s ?? "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] || c));
}
function fill(tpl: string, nome: string): string {
  return String(tpl ?? "").replaceAll("{{nome}}", esc(nome || "aluno(a)"));
}
// WhatsApp usa texto puro (sem escapar HTML).
function fillText(tpl: string, nome: string): string {
  return String(tpl ?? "").replaceAll("{{nome}}", nome || "aluno(a)");
}
// E.164 Brasil: só dígitos, garante o 55.
function normPhone(p: string): string {
  let d = String(p || "").replace(/\D/g, "");
  if (d && d.length <= 11) d = "55" + d;
  return d;
}

Deno.serve(async (req) => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const CRON_SECRET = Deno.env.get("REGUA_CRON_SECRET");
  const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
  const RESEND_FROM = Deno.env.get("RESEND_FROM") || "Ubique <contato@grupoubique.com.br>";
  const WA_URL = Deno.env.get("WHATSAPP_SEND_URL");
  const WA_TOKEN = Deno.env.get("WHATSAPP_CLIENT_TOKEN");

  // Trava: só executa com o segredo certo.
  if (!CRON_SECRET || req.headers.get("x-regua-secret") !== CRON_SECRET) {
    return new Response("não autorizado", { status: 401 });
  }

  const { dry_run } = await req.json().catch(() => ({ dry_run: false }));
  const db = createClient(SUPABASE_URL, SERVICE, { db: { schema: "crm" } });

  const { data: regras, error } = await db.from("automacoes").select("*").eq("ativo", true);
  if (error) return new Response("erro ao ler automacoes: " + error.message, { status: 500 });

  const resumo: Record<string, unknown>[] = [];

  for (const r of regras || []) {
    const { data: pendentes, error: pErr } = await db.rpc("regua_pendentes", { p_automacao_id: r.id });
    if (pErr) { resumo.push({ regra: r.nome, erro: pErr.message }); continue; }
    const lista = pendentes || [];
    const canal = r.canal || "whatsapp";

    // Pode mandar? Precisa do provedor do canal (e não ser dry_run).
    const faltaProvedor = canal === "whatsapp" ? !WA_URL : !RESEND_KEY;
    if (dry_run || faltaProvedor) {
      resumo.push({ regra: r.nome, segmento: r.segmento, canal, elegiveis: lista.length, enviados: 0,
        motivo: dry_run ? "dry_run" : (canal === "whatsapp" ? "sem WHATSAPP_SEND_URL" : "sem RESEND_API_KEY") });
      continue;
    }

    let enviados = 0, falhas = 0;
    for (const c of lista) {
      let ok = false, erro: string | null = null;
      try {
        if (canal === "whatsapp") {
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (WA_TOKEN) headers["Client-Token"] = WA_TOKEN;
          const res = await fetch(WA_URL!, {
            method: "POST", headers,
            body: JSON.stringify({ phone: normPhone(c.contato), message: fillText(r.corpo || "", c.nome) }),
          });
          ok = res.ok;
          if (!ok) erro = (await res.text()).slice(0, 500);
        } else {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Authorization": `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: RESEND_FROM, to: c.contato,
              subject: fill(r.assunto || "", c.nome), html: fill(r.corpo || "", c.nome),
            }),
          });
          ok = res.ok;
          if (!ok) erro = (await res.text()).slice(0, 500);
        }
      } catch (e) {
        ok = false; erro = String((e as Error)?.message || e).slice(0, 500);
      }
      await db.from("automacao_envios").insert({
        automacao_id: r.id, client_id: c.client_id, canal,
        status: ok ? "sent" : "failed", erro: ok ? null : erro,
      });
      if (ok) enviados++; else falhas++;
    }
    resumo.push({ regra: r.nome, segmento: r.segmento, canal, elegiveis: lista.length, enviados, falhas });
  }

  return new Response(JSON.stringify({ ok: true, dry_run: !!dry_run, resumo }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
});
