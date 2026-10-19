# Pagamentos — Edge Functions (Supabase)

Dois gateways, ambos **prontos pra deploy**:
- **Mercado Pago** — venda avulsa (Pix em destaque + cartão em até 12×). É o
  que entra primeiro.
- **Stripe** — assinatura recorrente (mentoria). Pronto também; falta só o time
  preencher no SQL o que cada price libera de acesso (a única regra de negócio).

Os dois webhooks cobrem o ciclo completo, incluindo a **engenharia reversa**
(estorno/cancelamento/não-pagamento revertem o acesso).

Como funciona:

```
Carrinho → vendas.criar_pedido (já existe)
   → portal chama mp-criar-pagamento (order_number) → recebe init_point
   → cliente paga no checkout do Mercado Pago (Pix/cartão)
   → MP chama mp-webhook → grava em vendas.payments (gateway=mercado_pago)
   → trigger do banco marca o pedido como pago e libera o acesso (enrollment)
```

## Pré-requisitos (feitos pelo time — envolvem conta e chaves)

1. **Conta no Mercado Pago** e as credenciais em *Suas integrações → Credenciais*:
   - `Access Token` (comece com as de **TESTE**).
2. **Supabase CLI** instalada e logada: https://supabase.com/docs/guides/cli
   ```bash
   npm i -g supabase
   supabase login
   supabase link --project-ref kluqjqojxzpuiauuidwx
   ```

## Passo a passo

**1) Rodar o SQL** (uma vez) no SQL Editor do Supabase:
- `sql/pagamentos_mercadopago.sql` (cria `gateway_payment_id` + índice único).

**2) Configurar os secrets** (NUNCA commitar as chaves):
```bash
supabase secrets set MP_ACCESS_TOKEN="SEU_ACCESS_TOKEN_DE_TESTE"
supabase secrets set APP_URL="https://www.grupoubique.com.br"
# recomendado — valida a assinatura do webhook (pegue no painel do MP ao criar o webhook):
supabase secrets set MP_WEBHOOK_SECRET="A_CHAVE_SECRETA_DO_WEBHOOK_DO_MP"
```
(`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já são injetados pelo Supabase.)
Se `MP_WEBHOOK_SECRET` não estiver setado, o webhook funciona mas **sem**
validar a assinatura — configure antes de ir pra produção.

### Estorno e cancelamento (engenharia reversa)
O `mp-webhook` trata o ciclo todo, não só a aprovação:
- **aprovado** → grava `paid` → o trigger do banco **libera o acesso**.
- **estornado / chargeback** (`refunded`/`charged_back`, ou reembolso total) →
  grava `refunded` + `refunded_at`/`refund_amount`/`refund_reason`, **igual ao
  botão "estornar" do admin** → o mesmo trigger **reverte o acesso** (matrícula).
- **cancelado / rejeitado** → grava `failed` (nunca houve acesso).
Tudo idempotente por `gateway_payment_id` (reprocessar a mesma notificação não
duplica nem desfaz nada errado).

**3) Deploy das functions:**
```bash
supabase functions deploy mp-criar-pagamento
supabase functions deploy mp-webhook
```

**4) Registrar o webhook no painel do Mercado Pago**
(*Suas integrações → Webhooks / Notificações*), evento **Pagamentos**, URL:
```
https://kluqjqojxzpuiauuidwx.supabase.co/functions/v1/mp-webhook
```

## Testar (modo teste do MP)

- Use as credenciais de **teste** e os cartões de teste do MP
  (https://www.mercadopago.com.br/developers → *Cartões de teste*).
- Para Pix em teste, o MP gera um QR de teste que aprova sozinho.
- Fluxo: faça uma compra no portal → deve redirecionar pro checkout do MP →
  pague → o `mp-webhook` grava o pagamento e o acesso é liberado.
- Confira em **Comercial → Pagamentos** (gateway `mercado_pago`).

## Ir pra produção

- Troque `MP_ACCESS_TOKEN` pelas credenciais de **produção** e redeploy
  (`supabase functions deploy ...`), e confirme o webhook no painel de produção.

## Segurança

- As chaves ficam **só** nos secrets do Supabase — nunca no repositório/GitHub.
- `mp-webhook` roda sem JWT (é o MP que chama) e **sempre reconsulta** o
  pagamento na API do MP antes de gravar — não confia só na notificação.
- `mp-criar-pagamento` exige usuário logado (JWT do app).
- `stripe-webhook` valida a **assinatura** do webhook (STRIPE_WEBHOOK_SECRET)
  antes de processar qualquer evento.

---

# Fase 2 — Stripe (assinatura recorrente)

Para a mentoria (cobrança recorrente). Fluxo:

```
Botão "Assinar" → window.UbqSubscribe('price_...') → stripe-checkout
   → Stripe Checkout (assinatura) → cliente paga
   → Stripe chama stripe-webhook → vendas.aplicar_assinatura_stripe
   → registra a assinatura e (regra de vocês) libera/estende o acesso
```

## Pré-requisitos (feitos pelo time)

1. **Conta Stripe** e, no painel, um **Produto com Price recorrente**
   (mensal/anual) para a mentoria → anote o `price_id` (`price_...`).
2. Credenciais: `Secret key` (`sk_...`) e, ao criar o webhook, o
   `Signing secret` (`whsec_...`).

## Passo a passo

**1) Rodar o SQL** `sql/assinatura_stripe.sql` no SQL Editor (cria a tabela de
tracking + a função `vendas.aplicar_assinatura_stripe`). **Edite o TODO dessa
função** com o que cada assinatura libera (matérias/turma) antes de ir pra prod.

**2) Secrets:**
```bash
supabase secrets set STRIPE_SECRET_KEY="sk_test_..."
supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_..."
```

**3) Deploy:**
```bash
supabase functions deploy stripe-checkout
supabase functions deploy stripe-webhook
```

**4) Webhook no painel do Stripe** (Developers → Webhooks → Add endpoint), URL:
```
https://kluqjqojxzpuiauuidwx.supabase.co/functions/v1/stripe-webhook
```
Eventos: `checkout.session.completed`, `invoice.paid`,
`invoice.payment_succeeded`, `invoice.payment_failed`,
`customer.subscription.updated`, `customer.subscription.deleted`,
`charge.refunded`.
Copie o **Signing secret** gerado pro secret `STRIPE_WEBHOOK_SECRET` e redeploy.

**Engenharia reversa (Stripe):** o webhook cobre o ciclo todo — ativa libera/
estende o acesso; **falha de pagamento** vira `past_due`/`unpaid` (acesso expira
no fim do período); **cancelamento** (`subscription.deleted`) e **estorno**
(`charge.refunded`) revogam/expiram o acesso. O corte de acesso em si fica no
`sql/assinatura_stripe.sql` (branch já pronto — preencher as matérias da
mentoria).

**5) Ligar o botão** no app: `onclick="window.UbqSubscribe('price_...')"` no
botão de assinar a mentoria (me diga onde fica que eu ligo).

## Testar (modo teste do Stripe)

- Use `sk_test_...` e os cartões de teste do Stripe (ex.: 4242 4242 4242 4242).
- Assine → o webhook grava em `vendas.stripe_subscriptions` e (com o TODO
  preenchido) libera o acesso. Renovações estendem o período automaticamente.

---

# Régua automática (follow-up por e-mail)

Dispara e-mails pros segmentos **Abandonou carrinho**, **Em risco** e **Frios**.
Tudo **desligado por padrão** e com trava anti-spam (cooldown por regra).

## Passo a passo

**1) Rodar o SQL** `sql/regua_automatica.sql` (cria `crm.automacoes`,
`crm.automacao_envios`, `crm.regua_pendentes` e 3 regras **desligadas**).

**2) Provedor de e-mail (Resend):** criar conta, **verificar o domínio**
`grupoubique.com.br` (DNS) e gerar a API key.

**3) Secrets:**
```bash
supabase secrets set RESEND_API_KEY="re_..."
supabase secrets set RESEND_FROM="Ubique <contato@grupoubique.com.br>"
supabase secrets set REGUA_CRON_SECRET="um-segredo-forte-qualquer"
```

**4) Deploy:**
```bash
supabase functions deploy regua-automatica
```

**5) Testar sem enviar (dry-run):**
```bash
curl -X POST https://kluqjqojxzpuiauuidwx.supabase.co/functions/v1/regua-automatica \
  -H "x-regua-secret: um-segredo-forte-qualquer" -H "Content-Type: application/json" \
  -d '{"dry_run":true}'
```
Retorna quantos clientes são elegíveis por regra (sem disparar nada).

**6) Ligar as regras:** no SQL Editor, revise os textos e marque `ativo=true`
nas regras que quiser (`update crm.automacoes set ativo=true where id=...;`).

**7) Agendar (diário):** habilite `pg_cron` **e** `pg_net` e rode a PARTE 2 do
`sql/regua_automatica.sql` (troque `<REGUA_CRON_SECRET>` pelo mesmo segredo).

## Observações
- Anti-spam: cada regra tem `cooldown_dias` (não reenvia pro mesmo cliente
  antes disso) e `limite_por_rodada` (teto de segurança por execução).
- Nunca envia pra cliente `blocked` nem sem e-mail. Todo envio fica em
  `crm.automacao_envios`.
- **WhatsApp**: hoje só `email`. Pra WhatsApp, escolher provedor (API oficial
  da Meta ou Z-API) e estender a função `regua-automatica` (o motor já separa
  os elegíveis por `canal`).
