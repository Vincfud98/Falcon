# Falcon — Plataforma Ubique

SaaS de educação. Frontend estático servido pelo **GitHub Pages**:

- **Aluno:** https://vincfud98.github.io/Falcon/
- **Admin:** https://vincfud98.github.io/Falcon/admin.html

Backend é **mock** (localStorage + BroadcastChannel) via `ubique-shared.js`. Não tem servidor por enquanto.

---

## Setup inicial (uma vez por pessoa, em cada PC)

### 1. Instalar o Git
Windows: https://git-scm.com/download/win  → next, next, next, finish.

Confirma instalação:
```bash
git --version
```

### 2. Instalar o Claude Code
Siga: https://docs.claude.com/en/docs/claude-code/quickstart

Resumo:
```bash
npm install -g @anthropic-ai/claude-code
```

Você precisa ter o **Node.js** instalado (https://nodejs.org — pega a LTS).

Depois faz login:
```bash
claude
```
Ele abre o navegador e pede pra você logar com sua conta Anthropic. Use sua conta Pro/Max ou cole sua API key.

### 3. Clonar o repositório

Abre um terminal **na pasta onde você quer guardar o projeto** (ex.: `Documentos`):

```bash
git clone https://github.com/Vincfud98/Falcon.git
cd Falcon
```

### 4. Configurar sua identidade no Git (uma vez por máquina)

```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu@email.com"
```

Use o **mesmo email da sua conta GitHub**.

### 5. Pronto. Pra abrir o Claude Code aqui:

```bash
claude
```

---

## Estrutura dos arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | Página do **aluno** — catálogo, módulo, capítulo, unidade, blocos de aprendizagem |
| `admin.html` | Painel **admin** — CRUD de matérias, módulos, unidades, blocos, verbetes, editais, questões etc. |
| `ubique-shared.js` | Camada de dados (UbiqueStore). LocalStorage + BroadcastChannel. CRUD compartilhado entre admin e aluno |
| `learning-blocks-render.js` | Renderer compartilhado dos 16 tipos de bloco (text, video, quiz, flashcards, timeline, …) usado pela preview do admin e pelo aluno |
| `learning-blocks-schema.md` | Documentação dos schemas dos blocos — leia antes de mexer em editor de blocos |
| `ubique-saas-components.html` | Design system (cores, tipografia, botões, modais). **Toda nova UI deve usar essas classes** |
| `historia-do-brasil-v7.html` | Snapshot legado do mock de curso. Referência |

---

## Fluxo de trabalho diário

**SEMPRE** comece a sessão com:
```bash
git pull
```
Isso puxa o que a outra pessoa fez. Se você esquecer, vai dar conflito feio.

Depois mexe no código (Claude Code, VS Code, o que for).

Quando terminar uma mudança:
```bash
git status                       # vê o que mudou
git add admin.html index.html    # adiciona os arquivos que você mexeu
git commit -m "Descrição curta do que você fez"
git push                         # manda pro GitHub
```

A outra pessoa, quando der `git pull`, recebe sua mudança.

### Padrão de commit

Já estamos usando este formato — siga ele:
```
Tipo: descrição curta no infinitivo

Corpo opcional com mais detalhes do PORQUÊ.
```

**Tipos comuns:**
- `Fix:` — corrige um bug
- `Y3c:` ou `Y4:` — feature numerada (combine antes)
- `Refactor:` — reorganiza sem mudar comportamento
- `Doc:` — só documentação

Exemplo bom:
```
Fix: bloco de texto carrega paragraphs no editor

Migration idempotente em index.html completa schema rico em
unit_blocks legados sem apagar edições do usuário.
```

---

## Conflitos (vai acontecer)

Se você der `git pull` e aparecer:
```
CONFLICT (content): Merge conflict in admin.html
```

Não entre em pânico. Abra o arquivo no editor — você vai ver blocos assim:
```
<<<<<<< HEAD
seu código
=======
código da outra pessoa
>>>>>>> main
```

Escolhe qual versão fica (ou combina as duas), apaga as linhas `<<<`, `===`, `>>>`, salva, e faz:
```bash
git add admin.html
git commit -m "Resolve conflito em admin.html"
git push
```

**Dica pra evitar conflito:** combinem por mensagem **antes** de mexer em arquivos grandes (`admin.html` é o pior — tem 42k linhas). Se uma vai mexer no editor de blocos, a outra mexe nas questões. Não mexem no mesmo lugar ao mesmo tempo.

---

## Rodar localmente (testar antes de mandar pro GitHub Pages)

Não precisa servidor. Só dá duplo-clique no `index.html` ou `admin.html` — abre no navegador.

**Mas atenção:** se você abrir com `file://` (duplo-clique), alguns recursos podem falhar. O ideal é servir com um HTTP server:

```bash
# Python (vem no Windows novo)
python -m http.server 8000

# ou Node, se tem npx
npx serve .
```

Depois abre http://localhost:8000

---

## Convenção de cache-bust

`index.html` e `admin.html` carregam `ubique-shared.js?v=N` e `learning-blocks-render.js?v=N`. Esse `?v=N` é **cache-busting** — quando você mexe em algum desses dois JS, **incrementa o N** nos dois HTMLs (admin e index). Senão o navegador serve a versão antiga em cache.

Procurar e substituir:
```bash
# Atual: ?v=13 → próxima: ?v=14
```

Faça nos **dois** arquivos HTML.

---

## Versionamento do localStorage (mock)

`ubique-shared.js` tem no topo:
```js
const STORE_KEY = 'ubique.store.v6';
```

Quando você muda esse `v6 → v7`, **TODO mundo perde os dados locais** e re-seeda do zero. Use isso **só** quando muda o **schema** dos dados (ex.: nova entidade, mudou nome de coluna). Pra adicionar dados / corrigir mock sem perder edições, prefira fazer uma **migration idempotente** (ver `migrateMissingMockContentOnce` em `index.html`).

---

## Diretrizes de UI

- **Sempre** use as classes do design system de `ubique-saas-components.html`: `.sec`, `.sub-h`, `.card`, `.field`, `.btn`, `.modal-*`, `.decide-options`
- Cores e espaçamentos via tokens CSS: `var(--accent)`, `var(--bg-card)`, `var(--text-mute)`, `var(--radius)`, `var(--serif)`, `var(--sans)`, `var(--mono)`
- **Não crie classes novas com prefixo** — combine as existentes. Se faltar algo, primeiro veja se já tem na design system

---

## Trabalhando com Claude Code

- Quando pedir algo grande, descreva o **contexto** e o **porquê**, não só "faz isso"
- Antes de pedir refactor em arquivo grande (`admin.html`), peça pro Claude **explorar** primeiro: "lista as funções relacionadas a X em admin.html"
- Use `/clear` quando trocar de tarefa — não suja o contexto
- Quando o Claude termina algo crítico, peça pra ele commitar com mensagem descritiva

### Pedido modelo (use este formato):
```
Quero refatorar a tela X. Hoje ela tem o problema Y. O comportamento
esperado é Z. Preserve A, B, C (NÃO apague nada disso).
Mexa em [arquivo.html] na função foo(). Confirma um plano antes de codar.
```

---

## Acessar o projeto de qualquer vibe coding app

O repositório é **público** em https://github.com/Vincfud98/Falcon e pode ser aberto por qualquer ferramenta de "vibe coding" — Claude Code, Cursor, Windsurf, Zed, GitHub Codespaces, Lovable, Replit, etc.

### Passo único em qualquer máquina nova

```bash
git clone https://github.com/Vincfud98/Falcon.git
cd Falcon
```

E pronto — todos os arquivos do projeto estão lá. O preview server local já vem configurado em `.claude/launch.json` (porta 8080).

### Por ferramenta

**Claude Code (CLI)**
```bash
cd Falcon
claude
```

**Cursor / Windsurf / VS Code**
- File → Open Folder → escolhe a pasta `Falcon`
- A extensão de IA já reconhece o repo

**GitHub Codespaces (roda no navegador, zero setup)**
1. Vai em https://github.com/Vincfud98/Falcon
2. Clica em **Code → Codespaces → Create codespace on main**
3. Abre um VS Code completo no navegador, com o repo já clonado

**Replit / Lovable / qualquer "IDE no navegador"**
- "Import from GitHub" → cola `https://github.com/Vincfud98/Falcon`

### Autenticar para fazer push

Primeira vez em uma máquina nova, depois de editar e tentar `git push`:

**Via GitHub CLI (recomendado, mais fácil):**
```bash
gh auth login
# escolhe HTTPS, autentica no browser
```

**Via Personal Access Token (PAT):**
1. https://github.com/settings/tokens → Generate new token (classic)
2. Marca a permissão `repo` (full control)
3. Copia o token
4. No primeiro `git push`, cola o token quando pedir senha (usuário é seu login do GitHub)

**Via SSH (opcional, mais seguro):**
```bash
ssh-keygen -t ed25519 -C "seu@email.com"
cat ~/.ssh/id_ed25519.pub   # copia a chave
# Cola em https://github.com/settings/keys
git remote set-url origin git@github.com:Vincfud98/Falcon.git
```

### Sincronização entre dispositivos

- **Antes de começar** a mexer: `git pull` (puxa o que foi feito em outra máquina/IDE)
- **Depois de mexer**: `git add . && git commit -m "..." && git push`
- O que está rastreado pelo git é o que viaja entre os dispositivos. Configurações pessoais da ferramenta (`.claude/settings.local.json`, `.cursor/`, `.windsurf/`) ficam locais e **não** são commitadas.

---

## Links úteis

- **Repo:** https://github.com/Vincfud98/Falcon
- **Site aluno:** https://vincfud98.github.io/Falcon/
- **Site admin:** https://vincfud98.github.io/Falcon/admin.html
- **Schema dos blocos:** `learning-blocks-schema.md`
- **Claude Code docs:** https://docs.claude.com/en/docs/claude-code/overview
- **Git cheatsheet:** https://education.github.com/git-cheat-sheet-education.pdf

---

## Problemas comuns

**"O Claude Code abre mas não acha o repositório"**
→ Você precisa estar **dentro** da pasta `Falcon`. Use `cd Caminho\Para\Falcon` antes.

**"Mexi em algo e não aparece no site"**
→ Você esqueceu de fazer `git push`. Ou esqueceu de incrementar o `?v=` do cache-bust.

**"Tudo sumiu na área do aluno"**
→ Provavelmente o `STORE_KEY` foi bumpado. Abre o DevTools (F12) → Console → cola:
```js
localStorage.clear(); location.reload();
```
e re-seeda do mock. Se você tinha edições importantes, **antes** de re-clear, copie o conteúdo de `localStorage.getItem('ubique.store.v6')` em algum lugar.

**"Como volto uma mudança que estraguei?"**
```bash
git log --oneline           # acha o commit antes do estrago
git revert <hash-do-ruim>   # cria um novo commit que desfaz aquele
git push
```
Nunca use `git reset --hard` se outro colaborador já puxou o commit — vai dar dor de cabeça.
