// ════════════════════════════════════════════════════════════════════════
// Edge Function: regua-automatica
// Executa as regras ativas da régua (crm.automacoes): busca os clientes
// elegíveis (crm.regua_pendentes), envia e-mail via Resend e registra em
// crm.automacao_envios. Chamada pelo pg_cron (diário) — ver sql/regua_automatica.sql.
//
// Secrets:
//   REGUA_CRON_SECRET  — segredo conferido no header x-regua-secret
//   RESEND_API_KEY     — chave do Resend (envio de e-mail)
//   RESEND_FROM        — remetente verificado, ex.: "Ubique <contato@grupoubique.com.br>"
// Corpo opcional: { "dry_run": true } → só conta, não envia.
// ════════════════════════════════════════════════════════════════════════
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

function esc(s: string): string {
  return String(s ?? "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] || c));
}
function fill(tpl: string, nome: string): string {
  return String(tpl ?? "").replaceAll("{{nome}}", esc(nome || "aluno(a)"));
}

Deno.serve(async (req) => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const CRON_SECRET = Deno.env.get("REGUA_CRON_SECRET");
  const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
  const RESEND_FROM = Deno.env.get("RESEND_FROM") || "Ubique <contato@grupoubique.com.br>";

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

    if (dry_run || !RESEND_KEY || r.canal !== "email") {
      resumo.push({ regra: r.nome, segmento: r.segmento, elegiveis: lista.length, enviados: 0,
        motivo: dry_run ? "dry_run" : (!RESEND_KEY ? "sem RESEND_API_KEY" : "canal não suportado") });
      continue;
    }

    let enviados = 0, falhas = 0;
    for (const c of lista) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: RESEND_FROM,
            to: c.email,
            subject: fill(r.assunto || "", c.nome),
            html: fill(r.corpo || "", c.nome),
          }),
        });
        const ok = res.ok;
        await db.from("automacao_envios").insert({
          automacao_id: r.id, client_id: c.client_id, canal: "email",
          status: ok ? "sent" : "failed", erro: ok ? null : (await res.text()).slice(0, 500),
        });
        if (ok) enviados++; else falhas++;
      } catch (e) {
        falhas++;
        await db.from("automacao_envios").insert({
          automacao_id: r.id, client_id: c.client_id, canal: "email",
          status: "failed", erro: String((e as Error)?.message || e).slice(0, 500),
        });
      }
    }
    resumo.push({ regra: r.nome, segmento: r.segmento, elegiveis: lista.length, enviados, falhas });
  }

  return new Response(JSON.stringify({ ok: true, dry_run: !!dry_run, resumo }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
});
