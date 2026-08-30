# 🎨 DESIGN_TOKENS.md — AniDeck

> Fonte única de verdade pra cores/tipografia — em vez de extrair de 9 arquivos `.html`
> diferentes (risco de pegar um valor levemente inconsistente de um protótipo pro outro).

## Paleta

```css
--void:#0A0714;     /* fundo principal */
--panel:#130F22;     /* cards/painéis */
--panel-2:#181330;   /* elementos dentro de painéis (inputs, etc.) */
--line:#2B2247;      /* bordas */
--text:#F1EEFA;      /* texto principal */
--muted:#A79BC9;     /* texto secundário */
--muted-2:#6B5F94;   /* texto terciário/desabilitado */

--holo-1:#FF4FD8;    /* magenta — acento primário */
--holo-2:#7B5CFF;    /* roxo — acento secundário (compõe o gradiente holo) */
--holo-3:#3FE0F0;    /* ciano — acento terciário (compõe o gradiente holo) */
--gold:#FFC542;      /* notas/destaque de rank */
--green:#a0ff78;     /* status "Em Dia" */
--coral:#FF5C6C;     /* estados de perigo/exclusão */
```

**Gradiente holo padrão** (usado em botões primários, título de marca, avatares):
`linear-gradient(90deg, var(--holo-1), var(--holo-2) 45%, var(--holo-3))`

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

## Tipografia

| Uso | Fonte | Peso |
|---|---|---|
| Títulos grandes (h1, h2 de seção) | `'Anton', sans-serif` | 400 (a fonte só tem esse peso) |
| Corpo de texto | `'Manrope', sans-serif` | 400-800 |
| Labels, dados, tags, timestamps | `'JetBrains Mono', monospace` | 400-700 |

Import usado em todos os protótipos:
```
https://fonts.googleapis.com/css2?family=Anton&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap
```

## Padrões de componente recorrentes
- **Cards:** `background: var(--panel); border: 1px solid var(--line); border-radius: 14-18px`
- **Botão primário:** gradiente holo, texto `var(--void)`, `border-radius: 99px` (pill)
- **Badge de status:** fundo com opacidade baixa da cor + borda da mesma cor + texto na cor cheia
  (ex: status "Em Dia" = fundo `rgba(160,255,120,.12)`, borda `rgba(160,255,120,.4)`, texto `#a0ff78`)
- **Border-radius geral:** 12-18px em cards, 99px (pill) em botões/badges/tags
