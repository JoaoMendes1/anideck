# 🎨 DESIGN_TOKENS.md — AniDeck

> Fonte única de verdade para cores, tipografia, densidade e componentes base (`client/src/components/ui/`).

## Paleta (Holo Evoluído)

A identidade **gamer cyberpunk** do AniDeck é mantida com superfícies mais profundas, bordas
translúcidas e contraste elevado para leitura prolongada — deixando os neons (`holo-*`, `gold`,
`green`, `coral`, `mana`) brilharem apenas onde há ação, status, raridade ou foco.

```css
--void:#07050E;                   /* fundo principal profundo */
--panel:#100C1E;                  /* cards/painéis principais */
--panel-2:#17122B;                /* elementos internos, inputs, chips */
--panel-3:#211A3D;                /* estado elevado / hover de superfície */
--line:rgba(167,155,201,0.16);    /* borda translúcida sutil (não compete com a arte) */
--text:#F6F4FF;                   /* texto principal */
--muted:#B6ABD8;                  /* texto secundário legível */
--muted-2:#7C6FA8;                /* texto terciário/desabilitado */

--holo-1:#FF4FD8;    /* magenta — acento primário */
--holo-2:#7B5CFF;    /* roxo — acento secundário (compõe o gradiente holo) */
--holo-3:#3FE0F0;    /* ciano — telemetria, links ativos, foco e Mana/ações */
--gold:#FFC542;      /* notas, rank, XP e Ouro */
--green:#A0FF78;     /* status "Em Dia" e vitória */
--coral:#FF5C6C;     /* perigo/exclusão e Vitalidade */
--mana:#4DA3FF;      /* Mana */
```

**Gradiente holo padrão** (usado em CTAs principais, marca e destaques):
`linear-gradient(95deg, var(--holo-1), var(--holo-2) 48%, var(--holo-3))`

### Onde pôr uma cor nova

O `client/src/index.css` tem **dois blocos de cor**, e a escolha entre eles não é estética:

| | `@theme` | `:root` |
|---|---|---|
| Gera utilitário Tailwind (`bg-*`, `text-*`, `border-*`, `from-*`) | sim | não |
| Entra nesta paleta oficial | sim | não |
| Um tema consegue sobrescrever | sim | sim |

**Vai no `@theme`** a cor que faz parte da linguagem de design — algo que você diria em voz
alta ao descrever a interface ("o fundo", "o acento", "a cor de perigo") e que vai ser
aplicada por classe em vários componentes.

**Vai no `:root`** a cor decorativa: ponta de gradiente, tom intermediário de ilustração,
valor que existe dentro de um bloco de CSS específico e não é aplicado por classe. Colocá-la
no `@theme` geraria dezenas de utilitários que ninguém usa e inflaria esta paleta com cores
que não são vocabulário do projeto.

Em ambos os casos, **nunca repita o hex fora do bloco onde ele é definido.** Para cor com
opacidade, use `color-mix(in srgb, var(--token) N%, transparent)` — não escreva o `rgba()`
com os canais na mão, senão o valor volta a existir em dois lugares e o tema deixa de
alcançá-lo. Foi essa duplicação que a issue #88 removeu.

Exceção deliberada: preto e branco puros (sombras e brilhos) ficam literais. Tokenizá-los
implicaria que devem mudar junto com o tema, o que é decisão de design, não de arquitetura.

### Indicadores do jogador

Cada indicador tem uma cor só, em qualquer tela e em qualquer tema: **XP** `gold`,
**Vitalidade** `coral`, **Mana** `mana`. A barra é sempre o componente `BarraVital`
(`client/src/components/hud/BarraVital.tsx`); não se monta barra de indicador com cor avulsa.
`mana`, como `gold`, `green` e `coral`, não muda com o tema.

Texto de interface não desce de 12 px (`text-xs`), exceto micro-selos indispensáveis sobre
capas de grade no celular.

### Status do deck nos gráficos

`status-assistindo`, `status-em-dia`, `status-completo`, `status-dropado` e `status-quero`
são fixos em todos os temas. Gráfico e legenda usam o mesmo token: com os `holo-*`, que mudam
de tema e às vezes coincidem entre si, a legenda divergia da fatia.

### Insígnias de rank

Cada rank tem um brasão próprio (`client/src/components/hud/InsigniaRank.tsx`) e uma cor
principal (`COR_DO_RANK`, em `client/src/lib/insignias.ts`), usada na flâmula e no brilho.
A forma sobe de complexidade com o rank: escudo (F, E, D), hexágono (C, B, A, S, SS), aletas
(E, D), asas (B, A), louros e coroa (S, SS) e halo (SS). O streak usa laranja `#FF9A3C`,
fora da paleta dos temas, por ser cor semântica de "chama".

## Tipografia

**Regra de separação Display × Leitura:**
- `'Anton', sans-serif` (peso 400) é reservada para **títulos Hero grandes (`>= 24px`),
  Ranks e grandes números de placar/nível**. Não usar `Anton` em títulos pequenos de card,
  labels ou parágrafos — nesses casos a fonte condensada prejudica a leitura e o alinhamento.
- `'Manrope', sans-serif` (pesos 400–800) é a fonte padrão para **títulos de seção (`h2`,
  `h3`), títulos de cards de anime/RPG, botões e corpo de texto**, sempre com `line-height`
  confortável e contraste limpo.
- `'JetBrains Mono', monospace` (pesos 400–700) com `tabular-nums` é usada em rótulos
  técnicos, timestamps, notas, contagens, XP, HP, Mana e moedas.

No app, as três fontes são servidas pelo próprio site (`client/src/fontes.css`, pacotes
`@fontsource`), nos pesos 400 da Anton, 400 a 800 da Manrope e 400 a 700 da JetBrains Mono.

## Densidade e Hierarquia

- **Cards de anime (`AnimeCard` / `DeckCard`):** priorizam a arte da capa. No máximo **1 selo
  funcional** no topo esquerdo (ex.: status ou "Novo EP"), botão discreto no topo direito,
  rodapé interno limpo (gênero principal + nota `★`) e título de até 2 linhas em `Manrope`
  alinhado abaixo. A moldura chanfrada `.carta-rara-moldura` (Foil) é exclusiva para favoritos
  e cartas raras.
- **Superfícies:** hierarquia vem do contraste entre `void` → `panel` → `panel-2` + brilho
  interno sutil (`shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]`), sem colocar contorno
  neon brilhante em todos os blocos.
- **Barras de rolagem:** estilizadas globalmente em `index.css` (e `.custom-scrollbar` em áreas
  internas), finas, integradas ao tema e respeitando `scrollbar-width: thin`.

## Padrões de componente (`client/src/components/ui/`)

- **Base compartilhada:** usar os primitivos em `client/src/components/ui/` (`Button`, `Card`,
  `Badge`, `PageHeader`, `Tabs`, `EmptyState`, `Paginacao`) em vez de duplicar classes utilitárias
  e cabeçalhos inline nas páginas.
- **Notificações animadas:** avisos simples e recompensas (`+XP`, `+Ouro`, `+AniCoins`) usam o
  `ToastContext` (empilhável com animação `framer-motion` e respeito a `prefers-reduced-motion`).
  Marcos maiores (Level Up, Rank Up, Missão, Maratona) usam `CelebracaoContext`.
- **Entrada de modal e aviso:** `animate-in` junto de `fade-in`, `zoom-in-95` ou `slide-in-from-top-2`
  (ou `animate-fade-in` sozinha). Definidas em `index.css`: 200 ms, só `opacity` e `transform`,
  desligadas com `prefers-reduced-motion`.
- **Campo de número:** `CampoNumerico` (ver PITFALLS, item 32). **Confirmação:** `useConfirmacao`,
  nunca `confirm()` ou `prompt()` do navegador.
- **Cards:** `background: var(--color-panel); border: 1px solid var(--color-line); border-radius: 16px`
- **Botão primário:** gradiente holo, texto `var(--color-void)`, `border-radius: 9999px` (pill)
- **Border-radius geral:** 14–18px em cards, 9999px (pill) em botões/badges/tags

