// ════════════════════════════════════════════════════════════════════════
// Edge Function: greenn-api — conversa com a API pública da Greenn
// (https://apiadm.greenn.com.br/api/v1, token pessoal em GREENN_API_TOKEN,
// escopos: sales:read, sales:refund, products:read, offers:read).
//
// Ações (POST JSON { acao, ... }):
//   · reembolsar  { pedido_id }  → estorna NA GREENN a venda de um pedido de
//                                  reembolso pendente (vendas.pedidos_aluno).
//                                  Pode chamar: o próprio aluno dono do pedido
//                                  ou um admin. Nunca estorna sem pedido.
//   · sincronizar { desde?, pagina? } → puxa as vendas da Greenn (100 por página)
//                                  e grava em vendas.greenn_vendas (espelho);
//                                  um trigger leva pra pedidos/pagamentos.
//   · produtos    {}             → lista os produtos da Greenn (admin).
//   · ping        {}             → confere o token (admin).
//
// Quem chama: JWT de usuário (aluno/admin) OU o banco (pg_net) com o header
// x-greenn-token igual a vendas.greenn_config.token (a chave nunca sai do banco).
// verify_jwt = false (a checagem é feita aqui).
// ════════════════════════════════════════════════════════════════════════
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const API = "https://apiadm.greenn.com.br/api/v1";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-greenn-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });

function igual(a: string, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function greenn(path: string, init: RequestInit = {}) {
  const token = Deno.env.get("GREENN_API_TOKEN");
  if (!token) throw new Error("GREENN_API_TOKEN não configurado");
  const r = await fetch(API + path, {
    ...init,
    headers: { Authorization: "Bearer " + token, Accept: "application/json", "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const txt = await r.text();
  let body: unknown = txt;
  try { body = JSON.parse(txt); } catch (_) { /* texto */ }
  return { ok: r.ok, status: r.status, body };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erro: "método não suportado" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const svc = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const vendas = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { db: { schema: "vendas" } });

  // ── quem está chamando ──
  let interno = false, userId: string | null = null, admin = false;
  const tok = req.headers.get("x-greenn-token") || "";
  if (tok) {
    const { data: cfg } = await vendas.from("greenn_config").select("token").eq("id", true).maybeSingle();
    interno = !!cfg?.token && igual(tok, cfg.token);
    if (!interno) return json({ erro: "não autorizado" }, 401);
  } else {
    const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ erro: "não autorizado" }, 401);
    const { data: u } = await svc.auth.getUser(jwt);
    if (!u?.user) return json({ erro: "não autorizado" }, 401);
    userId = u.user.id;
    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: "Bearer " + jwt } } });
    const { data: ehAdmin } = await asUser.rpc("is_admin");
    admin = !!ehAdmin;
  }
  const podeAdmin = interno || admin;

  const b = await req.json().catch(() => ({} as Record<string, unknown>));
  const acao = String(b.acao || "");

  try {
    if (acao === "ping") {
      if (!podeAdmin) return json({ erro: "só admin" }, 403);
      const r = await greenn("/sales?per_page=1");
      const meta = (r.body as Record<string, unknown>)?.meta;
      return json({ ok: r.ok, status: r.status, meta });
    }

    if (acao === "produtos") {
      if (!podeAdmin) return json({ erro: "só admin" }, 403);
      const out: unknown[] = [];
      for (let p = 1; p <= 20; p++) {
        const r = await greenn("/products?per_page=100&page=" + p);
        if (!r.ok) return json({ erro: "greenn " + r.status, body: r.body }, 502);
        const d = (r.body as { data?: unknown[]; meta?: { last_page?: number } });
        out.push(...(d.data || []));
        if (!d.meta?.last_page || p >= d.meta.last_page) break;
      }
      return json({ ok: true, produtos: out });
    }

    if (acao === "reembolsar") {
      const id = Number(b.pedido_id);
      if (!id) return json({ erro: "pedido_id obrigatório" }, 400);
      const { data: ped } = await vendas.from("pedidos_aluno").select("*").eq("id", id).maybeSingle();
      if (!ped) return json({ erro: "pedido não encontrado" }, 404);
      if (!podeAdmin && ped.user_id !== userId) return json({ erro: "não autorizado" }, 403);
      if (ped.tipo !== "reembolso" || ped.status !== "pendente") return json({ erro: "pedido não está pendente" }, 409);
      if (!ped.greenn_sale_id) return json({ erro: "pedido sem venda da Greenn" }, 409);
      const r = await greenn("/sales/" + encodeURIComponent(ped.greenn_sale_id) + "/refund", {
        method: "POST",
        body: JSON.stringify({ reason: ("Reembolso pedido na Falcon (até 7 dias)" + (ped.motivo ? " · " + ped.motivo : "")).slice(0, 255) }),
      });
      const resumo = r.ok ? "estorno solicitado à Greenn" : "Greenn recusou o estorno (" + r.status + "): " + JSON.stringify(r.body).slice(0, 300);
      await vendas.from("pedidos_aluno").update({
        nota: resumo,
        greenn_estorno: { em: new Date().toISOString(), ok: r.ok, status: r.status, resposta: r.body },
      }).eq("id", id);
      console.log("[greenn-api] reembolsar", ped.greenn_sale_id, r.status);
      return json({ ok: r.ok, status: r.status, resposta: r.body }, r.ok ? 200 : 502);
    }

    if (acao === "sincronizar") {
      if (!podeAdmin) return json({ erro: "só admin" }, 403);
      const desde = String(b.desde || "");
      let pagina = Math.max(1, Number(b.pagina) || 1);
      const ate = Math.min(pagina + Math.max(1, Number(b.paginas) || 10) - 1, 10000);
      let gravadas = 0, ultima = 0;
      for (; pagina <= ate; pagina++) {
        const q = new URLSearchParams({ per_page: "100", page: String(pagina), sort: "created_at" });
        if (desde) q.set("filter[created_after]", desde);
        const r = await greenn("/sales?" + q.toString());
        if (!r.ok) return json({ erro: "greenn " + r.status, body: r.body, pagina }, 502);
        const d = r.body as { data?: Record<string, unknown>[]; meta?: { last_page?: number; total?: number } };
        ultima = d.meta?.last_page || pagina;
        const lista = d.data || [];
        if (lista.length) {
          // junta com o que já existe (o "detalhar" guarda comprador/produto, que a lista não traz)
          const ids = lista.map((s) => Number(s.id));
          const { data: ant } = await vendas.from("greenn_vendas").select("id, dados").in("id", ids);
          const porId = new Map((ant || []).map((r: { id: number; dados: Record<string, unknown> }) => [Number(r.id), r.dados]));
          const linhas = lista.map((s) => ({ id: Number(s.id), dados: { ...(porId.get(Number(s.id)) || {}), ...s }, atualizado_em: new Date().toISOString() }));
          const { error } = await vendas.from("greenn_vendas").upsert(linhas, { onConflict: "id" });
          if (error) return json({ erro: "gravar: " + error.message, pagina }, 500);
          gravadas += linhas.length;
        }
        if (pagina >= ultima) { pagina++; break; }
      }
      return json({ ok: true, gravadas, proxima_pagina: pagina <= ultima ? pagina : null, ultima_pagina: ultima });
    }

    if (acao === "detalhar") {
      // completa comprador e produto (GET /sales/{id}); sem "ids", pega as vendas ainda sem detalhe
      if (!podeAdmin) return json({ erro: "só admin" }, 403);
      let ids: number[] = Array.isArray(b.ids) ? (b.ids as unknown[]).map(Number).filter(Boolean) : [];
      if (!ids.length) {
        const lim = Math.min(Math.max(1, Number(b.limite) || 100), 300);
        const { data: falta } = await vendas.from("greenn_vendas").select("id").is("espelhado_em", null)
          .not("dados", "cs", '{"client":{}}').order("id", { ascending: false }).limit(lim);
        ids = (falta || []).map((r: { id: number }) => Number(r.id));
      }
      let feitas = 0, falhas = 0;
      const erros: unknown[] = [];
      for (const id of ids) {
        const r = await greenn("/sales/" + id);
        if (!r.ok) { falhas++; if (erros.length < 5) erros.push({ id, status: r.status, body: r.body }); continue; }
        const det = ((r.body as { data?: Record<string, unknown> })?.data || r.body) as Record<string, unknown>;
        const { data: ant } = await vendas.from("greenn_vendas").select("dados").eq("id", id).maybeSingle();
        const { error } = await vendas.from("greenn_vendas").upsert({ id, dados: { ...((ant?.dados as Record<string, unknown>) || {}), ...det }, atualizado_em: new Date().toISOString() }, { onConflict: "id" });
        if (error) { falhas++; if (erros.length < 5) erros.push({ id, erro: error.message }); } else feitas++;
      }
      return json({ ok: true, feitas, falhas, erros });
    }

    return json({ erro: "ação desconhecida" }, 400);
  } catch (e) {
    return json({ erro: String((e as Error)?.message || e) }, 500);
  }
});
