# Learning Blocks — Schema Canônico

Este documento descreve o schema completo dos **learning blocks** (blocos de aprendizagem) usados em Falcon. Cada bloco vive dentro de uma `unit_section` (seção/grupo) que por sua vez pertence a uma `unit` (unidade). Antes da Fase Y1, o `mapMockBlockToStore` simplificava drasticamente cada bloco — esta v5 do store passa a **preservar 100% dos campos originais**, copiando todo o conteúdo extra dentro de `content`.

> **Fonte de verdade**: `window.COURSE` em `index.html`, e o seed `seedMockBlocksOnce` que o popula no `UbiqueStore.unit_blocks`.

---

## Campos comuns a TODOS os blocks

Todo registro de `unit_blocks` no store tem esta estrutura raiz:

| Campo            | Tipo                          | Descrição                                                                                            |
| ---------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| `id`             | number                        | ID interno do store (auto-incrementado por `makeCRUD`)                                               |
| `unit_id`        | number                        | FK para `units`                                                                                      |
| `section_id`     | number                        | FK para `unit_sections`                                                                              |
| `position`       | number                        | Posição relativa dentro da seção                                                                     |
| `type`           | string                        | Tipo canônico do bloco (ver tabela de normalização abaixo)                                           |
| `title`          | string                        | Título visível ao aluno                                                                              |
| `description`    | string                        | Descrição/subtítulo                                                                                  |
| `topics`         | string[]                      | IDs de tópicos relacionados                                                                          |
| `tags`           | string[]                      | IDs de tags relacionadas                                                                             |
| `status`         | `'draft' \| 'published'`      | Estado de publicação                                                                                 |
| `content`        | object                        | Payload type-específico (TODOS os demais campos do bloco mock vão pra cá, intactos)                  |
| `_origMockId`    | string?                       | ID original do mock (rastreabilidade, evita duplicar ao re-seedar)                                   |

### Normalização de `type`

Alguns tipos do mock vêm com nomes alternativos. O `mapMockBlockToStore` aplica este mapa antes de armazenar:

| Mock `type`    | Canônico       |
| -------------- | -------------- |
| `textgallery`  | `text`         |
| `figures`      | `gallery`      |
| `quotes`       | `citations`    |
| `quote`        | `citations`    |
| `bios`         | `biography`    |
| `bio`          | `biography`    |
| `sources`      | `references`   |
| `comments`     | `discussion`   |
| `table`        | `tables`       |

Os outros (`video`, `quiz`, `essay`, `flashcards`, `timeline`, `glossary`, `gallery`, `keypoints`, `integrated`, `compound`) mantêm o nome original.

---

## Tipos de bloco

### 1. `text` (canônico) — mock `text` ou `textgallery`

Texto rico com parágrafos, **fragmentos** (termos-chave vinculados a verbetes com tooltip + galeria de imagens) e narração opcional. É o bloco mais expressivo do schema — cada parágrafo pode definir uma rede de termos que renderizam tooltips, galeria flutuante sincronizada com scroll e cross-links via `relatedTerms`.

```ts
content: {
  audio_url?: string                    // Áudio narrado opcional do bloco inteiro (futuro Y2)
  paragraphs: Array<{                   // Lista ordenada de parágrafos
    id: string                          // ID único do parágrafo (usado pra anchors da sidebar)
    title?: string | null               // OPCIONAL. Quando preenchido, vira anchor na sidebar
                                        // interna da unidade — clicar leva o aluno até esse
                                        // parágrafo. Renderizado como h3 dourado serif.
    content: string                     // O texto do parágrafo. HTML permitido: <p>, <strong>,
                                        // <em>, <blockquote>, <a href>. Citações em <blockquote>
                                        // ganham estilo decorativo.
    description?: string                // Resumo curto do parágrafo. Aparece em hover na sidebar
                                        // OU em ferramentas de busca/indexação. NÃO é renderizado
                                        // direto no texto do aluno.
    fragments: Array<{                  // Lista de TERMOS-CHAVE no parágrafo (verbetes)
      id: string                        // ID único do fragment. Usado p/ linkagem cruzada via
                                        // relatedTerms. Convenção: prefixo "f-" (ex: f-cabral).
      text: string                      // O texto que aparece no parágrafo. O renderer busca esse
                                        // text no `content` e aplica border-bottom dotted accent.
      definition: string                // Texto do TOOLTIP. Aparece quando aluno passa o mouse
                                        // sobre o termo marcado.
      images?: Array<{                  // Imagens do termo. Aparecem na GALERIA FLUTUANTE LATERAL
                                        // DIREITA, sincronizada com scroll (a imagem ativa muda
                                        // conforme o termo entra na viewport).
        url: string
        name: string
        description: string
      }> | null
      link?: string | null              // OPCIONAL. Link externo. Quando preenchido, o termo
                                        // vira clicável e abre em nova aba.
      relatedTerms?: string[] | null    // IDs de outros fragments. Aparecem como "Veja também"
                                        // no tooltip e na galeria. Cria rede de conceitos.
      topics?: string[] | null          // Tópicos do edital vinculados (futuro: indexação)
      tags?: string[] | null            // Tags adicionais (filtro)
    }>
  }>
  // Variantes legadas
  html?: string                         // HTML simples (mock variante "text" antiga, sem paragraphs)
  images?: Array<{ url, caption, alt }> // Galeria simples (mock variante "textgallery" antiga)
}
```

#### Features visuais renderizadas no echo do aluno

- **Sidebar interna da unidade**: lista os `title` de cada parágrafo (quando preenchidos) como anchors clicáveis. Clicar leva o aluno até o parágrafo correspondente.
- **Galeria flutuante**: à direita do texto, mostra as `images` dos fragments ativos. Sincronizada com scroll — a imagem ativa muda conforme o termo entra na viewport.
- **Tooltips de termos**: ao passar o mouse sobre um termo marcado, mostra `definition` + a 1ª imagem do fragment.
- **Border dotted accent**: termos com fragment ganham underline pontilhado dourado (border-bottom dotted `var(--accent)`).
- **Veja também**: o tooltip e a galeria mostram outros termos relacionados via `relatedTerms`, criando uma rede navegável.
- **Áudio narrado**: player no topo do bloco quando `audio_url` está preenchido (planejado Y2).
- **Anotações flutuantes**: o aluno pode selecionar texto e criar uma nota (já existe no legacy).

Exemplo real (extraído de `b1-1-1`): bloco "Uma frota rumo às Índias" com 10 parágrafos, fragmentos `f-cabral`, `f-calicute`, `f-vasco`, etc., e galeria de 5 imagens.

---

### 2. `video`

Vídeo embed ou MP4, com apresentador e transcrição.

```ts
content: {
  url: string                           // src do player (mp4 ou youtube embed)
  presenter?: string
  duration?: string                     // "HH:MM" ou "MM:SS"
  videoFormat?: 'mp4' | 'youtube' | ...
  transcription_url?: string
}
```

Exemplo (`b1-1-3`): "A travessia atlântica reconstituída", 14:22, MP4 hospedado externamente.

---

### 3. `quiz`

Questões objetivas no estilo CESPE/CEBRASPE. Pode vir como `groups[]` (com texto-base compartilhado) ou `items[]` direto.

```ts
content: {
  groups?: Array<{
    enunciado: string
    reference?: {
      text?: { label, title, body, source }
      media?: { type: 'image', url, caption }
    }
    items: Array<QuizItem>
  }>
  items?: Array<QuizItem>               // variante simplificada
}

type QuizItem = {
  id: string
  assertion: string
  options: string[]                     // ['Certo','Errado'] ou múltipla escolha
  key: string                           // gabarito ('Certo' | 'A' | ...)
  comments?: string                     // comentário do gabarito
  recommendation?: string
  difficulty?: 'very-easy'|'easy'|'regular'|'hard'|'very-hard'
  reference?: string                    // ex: 'CACD 2018'
  topics?: string[]
  tags?: string[]
}
```

Exemplo (`b1-2-1`): 2 grupos com texto-base de Caminha e do Tordesilhas, 6 itens no total.

---

### 4. `essay`

Discursivas com critérios de correção e respostas-modelo.

```ts
content: {
  items: Array<{
    id: string
    command: string                     // enunciado da discursiva
    maxLength?: number                  // limite de caracteres
    reference?: string
    topics?: string[]
    tags?: string[]
    criteria?: Array<{
      label: string
      maxScore: number
      description: string
      modelAnswer: string
    }>
    modelAnswer?: string
    modelAnswers?: Array<{ title, author, score, body }>
    references?: Array<{ label, title, body, image, source? }>
  }>
}
```

Exemplo (`b1-2-2`): "Discursivas sobre a expedição de 1500", 2 itens, primeiro com 3 respostas-modelo (A, B, C).

---

### 5. `flashcards`

```ts
content: {
  concepts: Array<{
    id: string
    term: string                        // frente do card
    description: string                 // verso
    topics?: string[]
    tags?: string[]
  }>
}
```

Exemplo (`b1-3-1`): "Conceitos-chave" com 6 termos (Porto Seguro, Carta de Caminha, …).

---

### 6. `timeline`

Linhas do tempo agrupadas (cronologias paralelas).

```ts
content: {
  items: Array<{
    id: string
    title: string                       // título da cronologia
    entries: Array<{
      year: string                      // pode ser "9/mar/1500" ou "1500"
      title: string
      body: string
      image?: string                    // URL
    }>
    topics?: string[]
    tags?: string[]
  }>
}
```

Exemplo (`b1-4-3`): "Cronologias paralelas" com 2 timelines — trajeto da expedição e panorama global.

---

### 7. `citations` (canônico) — mock `quote` ou `quotes`

```ts
content: {
  items: Array<{
    id: string
    text: string                        // a citação
    author: string
    source?: string
    year?: string
    portrait?: string                   // URL
    body?: string                       // comentário expandido
    topics?: string[]
    tags?: string[]
  }>
}
```

Exemplo (`b1-4-2`): "Vozes do achamento", 3 citações da Carta de Caminha.

---

### 8. `biography` (canônico) — mock `bio` ou `bios`

```ts
content: {
  items: Array<{
    id: string
    name: string
    role: string                        // "Navegador · Promotor das navegações"
    dates: string                       // "1469–1521"
    portrait?: string                   // URL
    summary?: string                    // sumário curto
    body?: string                       // biografia completa
    topics?: string[]
    tags?: string[]
  }>
}
```

Exemplo (`b1-4-1`): "Figuras da expedição" com 3 personagens (Dom Manuel I, frei Henrique, Bartolomeu Dias).

---

### 9. `glossary`

```ts
content: {
  items: Array<{
    id: string
    term: string
    definition: string                  // definição curta
    body?: string                       // explicação longa
    image?: string                      // URL
    topics?: string[]
    tags?: string[]
  }>
}
```

Exemplo (`b1-4-5`): "Conceitos-chave da unidade", 4 termos (Capitania hereditária, Tordesilhas, Feitoria, Pau-brasil).

---

### 10. `gallery` (canônico) — mock `gallery` ou `figures`

Galeria de imagens (lightbox). Variante `textgallery` é diferente (vira `text`).

```ts
content: {
  caption?: string                      // legenda geral da galeria
  images: Array<{
    url: string
    title?: string
    caption?: string
    description?: string                // texto longo (modal)
    reference?: string                  // crédito / coleção
    alt?: string
  }>
}
```

Exemplo (`b1-4-6`): "Iconografia do descobrimento", 8 obras pictóricas.

---

### 11. `tables` (canônico) — mock `tables` ou `table`

```ts
content: {
  items: Array<{
    id: string
    title: string
    columns: string[]                   // cabeçalhos
    rows: string[][]                    // matriz de células
    notes?: string                      // rodapé/observações
    topics?: string[]
    tags?: string[]
  }>
}
```

Exemplo (`b1-4-4`): "Quadros de apoio" com 2 tabelas (embarcações típicas + composição da frota).

---

### 12. `references` (canônico) — mock `sources`

```ts
content: {
  items: Array<{
    kind: 'book' | 'article' | 'web' | 'document' | ...
    label: string                       // rótulo curto ('Livro', 'Artigo', 'Fonte')
    citation: string                    // citação completa
    author?: string
    description?: string
    image?: string                      // capa/thumbnail
    url?: string
  }>
}
```

Exemplo (`b1-3-3`): "Leituras e materiais" com livros (Fausto, Holanda), fonte web (Caminha) e artigo (Hespanha).

---

### 13. `keypoints`

Pontos de retenção rápida.

```ts
content: {
  intro?: string
  items: Array<{
    label: string                       // categoria ('Contexto', 'Rota')
    title: string
    body: string
  }>
}
```

Exemplo (`b1-1-4`): "Para não esquecer" com 4 pontos.

---

### 14. `discussion` (canônico) — mock `comments`

Thread de discussão entre alunos.

```ts
content: {
  prompt: string                        // enunciado da discussão
  comments: Array<{
    id: string
    author: string
    authorId: string
    text: string
    createdAt: number                   // timestamp ms
    parentId?: string                   // reply
  }>
}
```

Exemplo (`b1-1-5`): "Discussão — A expedição de Cabral", 4 comentários (2 threads).

---

### 15. `compound`

Bloco composto: encadeia outros blocos como `parts[]` (mini-percurso).

```ts
content: {
  intro?: string
  parts: Array<UnitBlock>                // cada parte segue o schema de qualquer bloco
}
```

Exemplo (`b1-3-5`): "Estudo integrado — A carta de Caminha", com `text → video → flashcards → quiz` aninhados.

---

### 16. `integrated`

Reservado para HTML rico injetado pelo autor (não aparece no mock atual, mas é usado pelo admin).

```ts
content: {
  html: string
}
```

---

## Princípio de preservação

A função `mapMockBlockToStore` (a partir desta versão) **não transforma campos** — apenas:

1. Normaliza o `type` via tabela de mapeamento.
2. Extrai os campos meta para o nível raiz do `unit_block` (`id`, `type`, `title`, `description`, `topics`, `tags`).
3. Copia **todo o resto do bloco** dentro de `content`, intacto.

Isso garante que fragmentos, parágrafos, slides, biografias completas, respostas-modelo e qualquer outro campo aninhado fiquem disponíveis para os renderers — sem perda.
