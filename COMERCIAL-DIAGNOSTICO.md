# Comercial — Diagnóstico (o que falta implementar)

_Atualizado em 2026-10-17. Base: código do admin (Comercial) + integrações._

## 🔴 Prioridade 1 — Cobrança online (maior buraco)
Hoje o checkout **não cobra**: registra o pedido e mostra "equipe entra em
contato". A estrutura já existe, falta **ligar**:

- **Mercado Pago (Fase 1)** — _código pronto_. Falta o time: `supabase functions
  deploy mp-criar-pagamento mp-webhook`, secret `MP_ACCESS_TOKEN`, cadastrar o
  webhook no painel do MP. (SQL `gateway_payment_id` já rodou ✓)
- **Stripe assinatura (Fase 2)** — _código pronto_. Falta: criar o Price
  recorrente, rodar `sql/assinatura_stripe.sql`, **preencher o TODO** de "o que
  a mentoria libera", deploy + webhook.
- **Receita de assinatura no painel Pagamentos** — assinatura fica em
  `vendas.stripe_subscriptions`, ainda não espelha em `vendas.payments`.
  (follow-up: decidir o modelo de pedido recorrente.)

## 🟡 Prioridade 2 — Prontos, falta "ligar"
- **Tags comportamentais `comp-*`** — código pronto; rodar
  `sql/tags_comportamentais.sql` + pg_cron pra auto-aplicarem.
- **Clique de compra no funil** — já capturado no portal; validar com tráfego.

## 🔴 Prioridade 3 — CRM / retenção (não implementado)
- **Régua automática** — disparo de e-mail/WhatsApp pros segmentos **Abandonou
  carrinho**, **Em risco**, **Frios**. _Motor construído (e-mail via Resend),
  desligado por padrão_ — falta o time: chave do provedor + domínio verificado +
  ligar as regras. WhatsApp: escolher provedor (API oficial / Z-API).
- **Métricas de assinatura** — MRR, churn, renovações. Painel de Estatísticas
  não tem nada recorrente. (depende do Stripe no ar)
- **Estorno/reembolso** — webhook já mapeia `refunded`; falta botão de estorno
  no admin + baixa do acesso.
- **Painel de Automações no admin** — hoje as regras da régua vivem na tabela
  `crm.automacoes` (editável por SQL). Falta a aba de CRUD no admin.

## ✅ Feito nesta leva
- **Clientes**: segmentos de audiência (Quentes / Engajou / Clientes / Em risco
  / Frios) com contagem viva, LTV, score, ações em massa, público Meta.
- **Tags**: conversão por tag, LTV, "Ver clientes" em dropdown inline.
- **Atividades**: "A fazer" (atrasadas em destaque), nova atividade na página,
  concluir inline, KPIs, banner de clientes esfriando (dropdown).
- **Origem de Tráfego**: 3 abas, canais normalizados, buy_click do portal.

## Caminho crítico sugerido
1. Time liga o **Mercado Pago** (desbloqueia receita).
2. Roda o **SQL das tags comportamentais**.
3. Define e liga a **assinatura Stripe** (preenche o TODO do acesso).
4. Liga a **régua automática** (chave Resend + domínio) → começa pela
   recuperação de carrinho abandonado.
5. Follow-ups: métricas de assinatura, estorno, painel de automações.
