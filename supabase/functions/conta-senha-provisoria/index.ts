// Edge Function: conta-senha-provisoria (v1 — 2026-11-25)
// Para quando o e-mail de "esqueci minha senha" não chega (UOL e outros mandam pro spam).
// O admin gera uma SENHA PROVISÓRIA e manda pro aluno por um canal que já é dele (WhatsApp do cadastro).
// No primeiro login com ela, o app obriga o aluno a criar uma senha nova (user_metadata.trocar_senha = true;
// a tela de nova senha apaga a marca quando a senha nova é salva).
// A senha é sorteada AQUI, no servidor; o admin não escolhe nem digita senha nenhuma.
// Quem pode: superadmin (qualquer conta) ou admin com a área Portaria (só contas de aluno). Ninguém gera
// para a própria conta. A permissão é conferida no banco com o token de quem chama (public.meu_acesso_admin),
// igual à conta-situacao. Cada geração fica no log da função (quem gerou, para qual conta, quando).
// Entrada (JSON, com o token do admin no Authorization): { "user_id": "<uuid>" }
// Saída: { ok: true, email, senha } ou { error: "<código>" }.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const jsonResp = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Sem letras/números que se confundem ao ler no celular (0/O, 1/l/I).
const ALFABETO = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function sortearSenha(n = 10): string {
  const r = new Uint32Array(n);
  crypto.getRandomValues(r);
  let s = "";
  for (let i = 0; i < n; i++) s += ALFABETO[r[i] % ALFABETO.length];
  return s;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return jsonResp({ error: "metodo" }, 405);
  try {
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!jwt) return jsonResp({ error: "sem_login" }, 401);

    // Quem chama: conferido no banco, com o token dele (nunca pelo que o navegador manda).
    const comoQuemChama = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false },
    });
    const { data: eu } = await comoQuemChama.auth.getUser(jwt);
    const meuId = eu?.user?.id || null;
    if (!meuId) return jsonResp({ error: "sem_login" }, 401);
    const { data: acesso, error: eAcesso } = await comoQuemChama.rpc("meu_acesso_admin");
    if (eAcesso || !acesso || !acesso.admin) return jsonResp({ error: "sem_permissao" }, 403);

    const body = await req.json().catch(() => ({}));
    const userId = String(body?.user_id || "");
    if (!UUID.test(userId)) return jsonResp({ error: "pedido_invalido" }, 400);
    if (userId === meuId) return jsonResp({ error: "nao_pode_a_si_mesmo" }, 400);

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data: alvo, error: eAlvo } = await sb.schema("crm").from("app_users")
      .select("id, role, status").eq("id", userId).maybeSingle();
    if (eAlvo) return jsonResp({ error: "leitura: " + eAlvo.message }, 500);
    if (!alvo) return jsonResp({ error: "conta_nao_encontrada" }, 404);
    const alvoAdmin = alvo.role === "admin" || alvo.role === "superadmin";
    const areas: string[] = Array.isArray(acesso.areas) ? acesso.areas : [];
    if (alvoAdmin && !acesso.superadmin) return jsonResp({ error: "so_superadmin_admin" }, 403);
    if (!acesso.superadmin && !areas.includes("portaria")) return jsonResp({ error: "sem_permissao" }, 403);
    if (alvo.status === "suspended") return jsonResp({ error: "conta_suspensa" }, 409);

    const { data: u, error: eU } = await sb.auth.admin.getUserById(userId);
    if (eU || !u?.user) return jsonResp({ error: "conta_nao_encontrada" }, 404);

    const senha = sortearSenha();
    const { error: eUpd } = await sb.auth.admin.updateUserById(userId, {
      password: senha,
      // Conta criada pela compra (convite) que nunca confirmou: sem isto o login com senha é recusado.
      email_confirm: true,
      user_metadata: { ...(u.user.user_metadata || {}), trocar_senha: true },
    });
    if (eUpd) return jsonResp({ error: "auth: " + eUpd.message }, 500);

    console.log("[conta-senha-provisoria] gerada", JSON.stringify({ por: meuId, para: userId, em: new Date().toISOString() }));
    return jsonResp({ ok: true, email: u.user.email, senha });
  } catch (e) {
    console.error("[conta-senha-provisoria]", String(e));
    return jsonResp({ error: String(e) }, 500);
  }
});
