# Pagamentos — Edge Functions (Supabase)

Integração de checkout do portal. **Fase 1 = Mercado Pago** (Pix em destaque +
cartão em até 12×). Fase 2 (Stripe, assinatura) virá depois.

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
```
(`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já são injetados pelo Supabase.)

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
`customer.subscription.updated`, `customer.subscription.deleted`.
Copie o **Signing secret** gerado pro secret `STRIPE_WEBHOOK_SECRET` e redeploy.

**5) Ligar o botão** no app: `onclick="window.UbqSubscribe('price_...')"` no
botão de assinar a mentoria (me diga onde fica que eu ligo).

## Testar (modo teste do Stripe)

- Use `sk_test_...` e os cartões de teste do Stripe (ex.: 4242 4242 4242 4242).
- Assine → o webhook grava em `vendas.stripe_subscriptions` e (com o TODO
  preenchido) libera o acesso. Renovações estendem o período automaticamente.
