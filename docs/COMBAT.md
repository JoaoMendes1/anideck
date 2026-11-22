# ⚔️ COMBAT.md — Regras de Combate do AniDeck

Este documento descreve as fórmulas e mecânicas do sistema de combate RPG (backend em `internal/handlers/rpg_combate_regras.go`, `rpg_batalha.go`, `rpg_atributos.go`, `rpg_combate_interativo.go` e espelhadas no frontend em `client/src/lib/combate.ts`).

---

## 1. Atributos Primários e Retorno Decrescente

Os seis atributos primários (**Força**, **Inteligência**, **Constituição**, **Agilidade**, **Destreza** e **Sorte**) determinam os atributos derivados de combate:

- **Força** → Ataque físico (`+2` por ponto) e pressão de Crítico contra Defesa alta.
- **Inteligência** → Magia (`+2` por ponto), Éter máximo (`+1` por ponto), Sobrecarga de Éter e Resistência elemental.
- **Constituição** → Vida (`+10` por ponto), Defesa (`+1` por ponto), Bloqueio e Resistência a efeitos.
- **Agilidade** → Velocidade (`+1` por ponto), Esquiva dinâmica e preenchimento da barra de iniciativa (ATB).
- **Destreza** → Crítico base (`+0,7%` por ponto distribuído) e Dano Crítico.
- **Sorte** → Chance de queda de itens em expedições.

### Retorno Decrescente (`EscalarAtributo`)
Para valorizar builds equilibradas e evitar que todos os pontos sejam concentrados num único atributo, os primeiros **60 pontos distribuídos** em um atributo rendem **1:1**. Acima desse limiar:
- Pontos `61..90`: rendem **75%** (`excesso * 3 / 4`).
- Pontos acima de `90`: rendem **50%** (`22 + (excesso - 30) / 2`).

---

## 2. Probabilidades Dinâmicas (Atributos × Alvo)

Em vez de porcentagens estáticas, cada golpe avalia os atributos de ambos os combatentes:

- **Crítico Dinâmico (`ChanceCriticoDinamica`)**: ajusta o crítico base pela diferença de Ataque vs Defesa do alvo (`(ataque - defesa) / 20`, limitado entre `-20` e `+20` por mil) e diferença de Velocidade (`velAtacante - velAlvo`, entre `-15` e `+20` por mil). Piso `2%` (`20‰`) e teto `85%` (`850‰`).
- **Esquiva Dinâmica (`ChanceEsquivaDinamica`)**: ajusta a esquiva base pela diferença de Velocidade (`(velDefensor - velAtacante) * 2`, entre `-50` e `+60` por mil). Teto `50%` (`500‰`), preservando esquiva garantida (`1000‰`) de efeitos especiais.
- **Bloqueio (`ChanceBloqueioDinamica`)**: quando a Defesa do defensor ultrapassa `48%` do Ataque do atacante, há chance de aparar o golpe (até `11%`), reduzindo o dano sofrido em `25%–30%`.
- **Resistência a Efeitos (`ResistenciaElementalPorMil`)**: derivada de `Defesa/5 + Magia/4` (até `16%`), dando chance de resistir aos efeitos de status do inimigo.

---

## 3. Economia de Éter (MP) e Sobrecarga

- As habilidades das classes consomem mais Éter em combate para tornar **Inteligência** e **Éter máximo** decisões relevantes.
- **Sobrecarga de Éter (`CustoEterComSobrecarga`)**: quando o herói tem reserva abundante (`eterAtual >= custoBase + 10`) e `Magia >= 20`, a habilidade ofensiva consome `+2` a `+4` de Éter extra e causa **`+10%` de dano**.
- No combate tático por rodada (`rpg_combate_interativo.go`), heróis vivos regeneram `+3` de Éter ao fim de cada rodada, além de `+8` ao assumir **Postura Defensiva**.

---

## 4. Barra ATB / Iniciativa (`CalcularIniciativaATB`)

A Velocidade de cada lado determina o ritmo de enchimento da barra ATB (`max(5, velocidade + 5)` por ciclo):
- Quem tem maior Velocidade abre a rodada (empate favorece o jogador).
- O servidor calcula a previsão dos próximos 6 turnos e o cliente exibe a `BarraATB` em expedições, masmorras e combate tático (`GET /api/rpg/atb`).

---

## 5. Novas Mecânicas Táticas

- **Fúria (`BonusFuria`)**: abaixo de `45%` de Vida o golpe ganha `+4%` de força; abaixo de `25%` ganha `+8%`.
- **Contra-ataque (`DanoContraAtaque`)**: ao usar **Defender / Esquivar** no combate tático, esquivas e defesas bem-sucedidas devolvem `45%` do dano calculado contra a Defesa do inimigo.
- **Sinergia e Reações Elementais (`rpg_reacoes.go`, `rpg_sintonia.go`)**: peças em sintonia elemental somam `+15%` de atributos (`+5%` global com 4 peças) e alternar elementos distintos em esquadrão dispara reações elementais automáticas.
