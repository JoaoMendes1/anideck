# 🗡️ VISAO_RPG.md — O Despertar Isekai (Fase 18)

> Plano de produto da Fase 18, escrito pelo dono do projeto em 13/11/2026 e mantido abaixo
> como foi entregue. **Não é fase nem decisão técnica:** o escopo de cada entrega mora no
> `ROADMAP.md` e as decisões de arquitetura, no `DECISIONS.md`.

## Direção acertada depois do plano (14/11/2026)

Onde este bloco e o plano original discordarem, vale este bloco.

| Tema | Estado | O que ficou |
|---|---|---|
| Arte | Confirmada | Ilustração 2D gerada por IA, uma imagem completa por visual. Não há montagem por peças (cabelo, roupa, arma): a IA não gera camadas que se encaixam |
| Estágios | Confirmada | Quatro por personagem (Iniciante, Aventureiro, Veterano, Lendário), trocados pelo nível da Guilda |
| Elenco | Confirmada | Personagens prontos, como em Wuthering Waves. Classe e elemento são do personagem, não escolhidos pelo usuário |
| Visuais e skins | Proposta (18.2) | Estágio e skin viram a mesma coisa, um "visual", que só difere em como se desbloqueia: por nível, por compra ou por evento. Skin é uma ilustração só, sem estágios |
| Telas | Confirmada | Retrato no celular, que é a prioridade; no PC, arranjo em paisagem com os mesmos dados. 3D fica para o longo prazo |
| Atributos de combate | Confirmada | Seis primários (Força, Inteligência, Constituição, Agilidade, Destreza, Sorte) com pontos a cada 2 níveis, e derivados chamados Vida e Éter, não HP e MP, que já são da comunidade. Regras em `docs/DECISIONS.md` (#227) |
| Habilidades | Confirmada | Livro por classe, liberado por nível, e uma habilidade única por personagem do elenco. No combate, usadas sozinhas (#227) |
| Sorteio (gacha) | Confirmada | Só gratuito, com bilhetes ganhos jogando, que não se compram nem se transferem. O ECA Digital (Lei 15.211/2025, art. 20) veda caixa de recompensa paga em jogo de acesso provável por menores |
| Moeda | Confirmada | Os AniCoins podem vir a ser vendidos (`VISAO_COMUNIDADE.md`). Por isso nenhum sorteio é pago com eles; a linha "Cristais não são comprados com dinheiro", na seção 13 abaixo, está superada |
| Primeiros usuários | Confirmada | Grupo pequeno e limitado, os "Primordiais", antes de abrir |

---

# 1. VISÃO DO PRODUTO

Transformar o AniDeck em um ecossistema de entretenimento que conecta o hábito de assistir animes a uma experiência de RPG de fantasia Isekai.

O usuário não apenas acompanha animes, coleciona cartas e participa da comunidade. Ele também desenvolve seu próprio aventureiro, conquista equipamentos, explora um universo fantástico, enfrenta criaturas, participa de desafios e constrói sua própria trajetória.

A progressão do personagem deve refletir a atividade real do usuário dentro do AniDeck.

O objetivo é criar uma experiência de jogo integrada à plataforma, e não simplesmente adicionar uma página com atributos e imagens.

## Princípios fundamentais

1. Assistir animes continua sendo a atividade central do AniDeck.
2. O RPG complementa a experiência, não deve competir com ela.
3. A progressão deve recompensar atividades legítimas.
4. O jogador deve ter identidade visual própria.
5. O universo precisa ter personagens, criaturas, itens, história e identidade.
6. A experiência deve funcionar prioritariamente em celulares.
7. A implementação deve ser incremental e sustentável para um desenvolvedor solo.
8. A arquitetura deve permitir expansão sem reconstruir os sistemas existentes.

# 2. ESTADO ATUAL DO ANIDECK

O projeto já possui uma estrutura de gamificação e comunidade.

Existem sistemas de:
- XP, níveis e ranks F até SS.
- Vitalidade e Mana.
- Cristais e livro-razão financeiro.
- Loja e inventário de cosméticos.
- Cartas de animes e raridades.
- Missões e recompensas.
- Títulos e conquistas.
- Clãs e desafios coletivos.
- Chefão da temporada.
- Previsões comunitárias.
- Classes Bardo, Ranger e Paladino.

Esses sistemas devem ser considerados a fundação da expansão.

**Regra:** não criar sistemas paralelos quando uma estrutura existente puder atender à necessidade sem comprometer sua finalidade.

Toda reutilização precisa ser confirmada pela leitura do código, schema, RPCs, políticas RLS e consumidores existentes.

# 3. CONCEITO DO UNIVERSO

O AniDeck terá um universo próprio de fantasia Isekai.

O mundo deverá possuir:

- Reinos e civilizações.
- Raças fantásticas.
- Classes de combate.
- Elementos mágicos.
- Personagens importantes.
- NPCs e comerciantes.
- Monstros e criaturas.
- Chefões e antagonistas.
- Armas, armaduras e acessórios.
- Poções e materiais.
- Masmorras e regiões exploráveis.
- História e acontecimentos próprios.

A construção do universo será gradual.

Não é necessário desenvolver um mundo aberto para que a experiência já seja divertida. Uma primeira versão baseada em telas, personagens, inventário, missões e encontros PvE já pode entregar uma experiência de RPG.

# 4. SISTEMA DE PERSONAGENS

## 4.1 Identidade do jogador

Cada usuário deverá possuir um aventureiro próprio.

O personagem terá identidade independente dos personagens oficiais da história.

Informações previstas:

- Identificador.
- Nome.
- Raça.
- Classe de combate.
- Elemento.
- Nível.
- Experiência.
- Atributos.
- Equipamentos.
- Aparência.
- Skins desbloqueadas.
- Histórico de evolução.

## 4.2 Criação do personagem

A proposta inicial é um onboarding temático de transmigração/reencarnação.

Um Deus Guardião apresenta o universo e conduz o nascimento do aventureiro.

A distribuição inicial de classe e elemento poderá ser aleatória ou escolhida, conforme decisão futura.

A distribuição equilibrada entre classes é uma possibilidade, mas não deve ser implementada antes de estudar a população e os impactos no balanceamento.

## 4.3 Classes propostas

Classes de combate inicialmente estudadas:

- Espadachim.
- Mago.
- Arqueiro/Ranger.
- Paladino.
- Assassino.
- Bardo.

A lista não está fechada.

As classes de combate devem ser independentes das vocações sociais já existentes no AniDeck.

## 4.4 Elementos propostos

- Fogo.
- Água.
- Terra.
- Vento.
- Raio.
- Luz.
- Trevas.

É necessário definir um sistema de vantagens e resistências que não produza combinações obrigatórias ou personagens inviáveis.

O elemento Éter apareceu no conceito do primeiro personagem. Seu papel e sua relação com os sete elementos ainda precisam ser definidos.

# 5. PROGRESSÃO E ATRIBUTOS

A proposta é integrar a evolução do personagem à atividade real do usuário.

Atributos previstos:

- HP: vida do personagem.
- MP: energia mágica.
- ATK: poder de ataque.
- DEF: defesa.
- Velocidade.
- Poder mágico.
- Resistências.
- Chance crítica.
- Dano crítico.

**Separação obrigatória:** HP e MP do combate não podem ser confundidos automaticamente com Vitalidade e Mana da gamificação atual.

A relação entre esses sistemas precisa ser projetada explicitamente.

O rank F → SS e o XP existentes devem ser avaliados antes de definir se serão compartilhados, convertidos ou utilizados apenas como referência de progressão.

## Princípios de progressão

- Recompensar atividade real.
- Impedir farm por marcação artificial.
- Não punir usuários por ficarem offline.
- Evitar progressão excessivamente lenta.
- Evitar inflação de atributos.
- Preservar histórico e integridade dos ganhos.
- Permitir balanceamento administrativo.

# 6. EQUIPAMENTOS E INVENTÁRIO

O jogador poderá conquistar, colecionar e equipar:

- Espadas.
- Arcos.
- Cajados.
- Adagas.
- Escudos.
- Armaduras.
- Capacetes.
- Luvas.
- Botas.
- Acessórios.
- Relíquias.
- Poções.
- Materiais de fabricação.

Cada item poderá ter:

- Nome.
- Descrição.
- Categoria.
- Raridade.
- Atributos.
- Efeitos.
- Imagem.
- Requisitos.
- Origem de obtenção.

O inventário deve distinguir itens funcionais de itens puramente cosméticos.

Equipamentos funcionais alteram os atributos. Cosméticos alteram somente a aparência, salvo decisão futura explicitamente aprovada.

# 7. PERSONALIZAÇÃO VISUAL

Uma das principais funcionalidades planejadas.

Referência de experiência: Wuthering Waves.

O jogador deverá conseguir visualizar seu aventureiro e personalizar sua aparência.

Funcionalidades previstas:

- Visualização do personagem.
- Troca de skins.
- Roupas e armaduras visuais.
- Aparências alternativas de armas.
- Cabelos e acessórios.
- Efeitos mágicos e auras.
- Molduras e elementos cosméticos.
- Pré-visualização antes de equipar.

A interface deverá valorizar a arte principal, sem esconder informações importantes.

## Referência de interface

A tela de Echo de Wuthering Waves é uma referência de experiência:

- Personagem em destaque.
- Atributos visíveis.
- Equipamentos organizados.
- Seleção de itens.
- Interface escura e sofisticada.
- Navegação por áreas funcionais.

Genshin Impact e Honkai: Star Rail também poderão servir como referências complementares.

Não copiar diretamente recursos protegidos, personagens, ilustrações ou interfaces proprietárias.

# 8. DIREÇÃO ARTÍSTICA OFICIAL

As duas imagens enviadas pelo fundador em 13/11/2026 são as referências visuais principais.

Características obrigatórias:

- Anime 2D premium.
- Acabamento de ilustração JRPG.
- Personagens extremamente detalhados.
- Iluminação cinematográfica.
- Paleta azul, violeta e dourado.
- Roupas elaboradas e acessórios ornamentados.
- Magias luminosas.
- Cenários de fantasia grandiosos.
- Castelos, reinos e ambientes mágicos.
- Expressões faciais bem trabalhadas.

## Padrão de produção

Cada personagem deve possuir, quando aplicável:

1. Arte principal de corpo inteiro.
2. Retrato.
3. Expressões faciais.
4. Vista frontal.
5. Vista lateral.
6. Vista traseira.
7. Equipamentos individuais.
8. Variações visuais.

As fichas de apresentação são documentos de referência artística. Não devem ser utilizadas como uma única imagem dentro do jogo.

Os elementos deverão ser produzidos separadamente para permitir reutilização.

## Independência artística

A lógica do jogo nunca deve depender de uma imagem específica.

O personagem deve existir como dado estruturado, com referências para seus assets visuais.

A mudança de arte, roupa, personagem ou direção artística não poderá exigir a reescrita da lógica de progressão, inventário ou combate.

# 9. BIBLIOTECA DE ASSETS

Categorias:

- characters/
- monsters/
- bosses/
- weapons/
- armor/
- accessories/
- consumables/
- environments/
- interface/
- effects/
- animations/

Formatos preferenciais:

- WebP para ilustrações e imagens.
- AVIF quando oferecer benefício real de compressão e compatibilidade.
- SVG para ícones e elementos vetoriais adequados.

O armazenamento remoto poderá utilizar Supabase Storage, após validação dos limites gratuitos, políticas de acesso, custos e estratégia de cache.

Não armazenar arquivos pesados diretamente em tabelas PostgreSQL.

Não incorporar imagens grandes no bundle do React.

Cada asset deverá ter identificador estável e referência independente.

# 10. EXPERIÊNCIA MOBILE-FIRST

O celular é prioridade obrigatória.

Toda tela nova deverá ser pensada primeiro para dispositivos móveis.

Requisitos:

- Interface vertical e responsiva.
- Áreas de toque confortáveis.
- Navegação simples.
- Imagens otimizadas.
- Lazy loading.
- Cache de assets.
- Carregamento progressivo.
- Sem rolagem horizontal acidental.
- Painéis e inventários adaptados a telas pequenas.
- Boa legibilidade em telas compactas.

A versão desktop poderá aproveitar melhor o espaço, mas não será a referência inicial de layout.

# 11. COMBATE E CONTEÚDO PvE

Visão de longo prazo:

- Monstros comuns.
- Criaturas raras.
- Chefões.
- Masmorras.
- Missões.
- Combates por turno ou outro formato a definir.
- Habilidades.
- Resistências.
- Fraquezas elementais.
- Recompensas.

A primeira implementação de combate deverá ser simples, determinística, testável e segura no servidor.

Não começar com combate em tempo real ou multiplayer simultâneo.

O sistema de chefão da temporada existente poderá inspirar a integração entre atividade comunitária e combate, mas não deve ser reimplementado sem necessidade.

# 12. CARTAS E COLEÇÃO

As cartas existentes de anime continuarão preservadas.

Possibilidades futuras:

- Cartas de personagens.
- Cartas de monstros.
- Cartas de equipamentos.
- Raridades.
- Coleções temáticas.
- Arena de cartas.
- Duelos amigáveis.
- Desafios PvE baseados em cartas.

A Arena de Cartas será uma expansão própria, não um requisito para o primeiro MVP do personagem.

Cartas raras não devem se tornar obrigatórias para competir.

# 13. ECONOMIA E RECOMPENSAS

A economia existente do AniDeck deve ser preservada.

Regras fundamentais já estabelecidas:

- Dinheiro real não compra poder competitivo.
- Cristais não são comprados com dinheiro.
- Compras cosméticas não devem criar vantagem injusta.
- XP não diminui.
- Transações devem ser auditáveis.
- Recompensas precisam ser idempotentes.
- Saldos não podem ficar negativos.

Qualquer nova mecânica econômica deve utilizar o livro-razão apropriado e transações seguras no banco.

Preços, limites, ganhos e parâmetros ajustáveis devem ficar em `app_settings`, com validação no backend e configuração administrativa quando aplicável.

# 14. SEGURANÇA E INTEGRIDADE

Regras obrigatórias:

- Backend Go como autoridade das regras de negócio.
- Não confiar em atributos, recompensas ou resultados enviados pelo frontend.
- Validar propriedade dos itens.
- Impedir duplicação de recompensas.
- Utilizar transações para operações econômicas.
- Respeitar RLS.
- Não expor service role.
- Não aceitar `user_id` fornecido livremente pelo cliente como identidade autenticada.
- Proteger contra duplicação de requisições.
- Testar concorrência em compras e recompensas.
- Registrar operações econômicas relevantes.

Nenhuma operação competitiva poderá depender exclusivamente de validação React.

# 15. ADMINISTRAÇÃO E BALANCEAMENTO

O Painel Admin deverá permitir, conforme a evolução do sistema:

- Ajustar parâmetros de progressão.
- Configurar recompensas.
- Gerenciar itens.
- Configurar monstros e chefões.
- Ajustar eventos.
- Consultar estatísticas.
- Auditar operações.
- Desativar temporariamente mecânicas problemáticas.

Toda alteração administrativa deve ter validação e rastreabilidade.

# 16. PLANO INCREMENTAL DA FASE 18

Esta divisão é uma proposta inicial. Nenhuma etapa está autorizada a ser implementada antes da aprovação do escopo correspondente.

### 18.0 — Auditoria e arquitetura
- Auditar gamificação existente.
- Mapear tabelas, RPCs, handlers e componentes.
- Identificar o que será reutilizado.
- Identificar conflitos e lacunas.
- Definir modelo de dados e fronteiras dos módulos.

### 18.1 — Meu Personagem (primeiro MVP)
- Tela de personagem.
- Arte principal.
- Identidade e atributos.
- Nível e experiência.
- Visualização de equipamentos.
- Layout mobile-first.
- Dados persistidos.

Objetivo: o usuário conseguir abrir o AniDeck no celular e visualizar seu próprio aventureiro.

### 18.2 — Inventário e personalização
- Equipamentos.
- Troca de itens.
- Skins.
- Cosméticos.
- Pré-visualização.
- Biblioteca de assets.

### 18.3 — Progressão de RPG
- Classes de combate.
- Elementos.
- Atributos.
- Habilidades.
- Evolução.
- Balanceamento.

### 18.4 — Mundo e PvE
- Criaturas.
- Monstros.
- Missões.
- Masmorras.
- Chefões.
- Recompensas.

### 18.5 — Integração comunitária
- Desafios entre jogadores.
- Eventos.
- Clãs.
- Chefões coletivos.
- Recompensas sazonais.

### 18.6 — Arena e cartas
- Cartas de combate.
- Decks.
- Habilidades.
- Batalhas.
- Duelos.
- Balanceamento competitivo.

A ordem poderá mudar quando a auditoria revelar dependências técnicas.

# 17. REGRAS DE DESENVOLVIMENTO

As regras gerais de `AGENTS.md`, `DECISIONS.md`, `PITFALLS.md`, `ROADMAP.md` e demais documentos oficiais do AniDeck continuam obrigatórias.

Regras adicionais desta expansão:

1. Não desenvolver sistemas paralelos sem necessidade comprovada.
2. Não modificar funcionalidades existentes sem avaliar impactos.
3. Não misturar classe social e classe de combate.
4. Não misturar Vitalidade/Mana com HP/MP de combate sem definição explícita.
5. Não acoplar lógica de jogo a arquivos de imagem.
6. Não criar dependência de serviços pagos.
7. Não começar por 3D ou combate em tempo real.
8. Não implementar várias mecânicas simultaneamente.
9. Toda funcionalidade deve possuir critérios de aceite.
10. Toda regra de negócio importante deve ser testada no backend.
11. Mudanças de banco devem possuir SQL numerado e documentação.
12. Nunca editar um SQL já aplicado.
13. Não quebrar políticas RLS.
14. Não ignorar as armadilhas registradas no PITFALLS.
15. Implementar primeiro uma experiência pequena e funcional.
16. Atualizar a documentação junto com cada entrega.
17. Preservar histórico de decisões e problemas resolvidos.
18. Não reabrir decisões já resolvidas sem evidência técnica ou necessidade real.

# 18. CRITÉRIO DE SUCESSO DO PRIMEIRO MVP

A primeira entrega será considerada funcional quando:

- O usuário autenticado visualizar seu personagem.
- Os dados forem persistidos corretamente.
- A arte principal carregar sem prejudicar o desempenho.
- A interface funcionar em celular.
- A tela apresentar atributos e progressão.
- Os equipamentos puderem ser visualizados.
- Não houver duplicação de dados existentes.
- Os testes de backend e frontend passarem.
- A funcionalidade não prejudicar a experiência atual do AniDeck.

# 19. PONTOS AINDA NÃO DECIDIDOS

Os itens abaixo não devem ser tratados como decisões definitivas:

- Nome oficial do universo.
- História principal.
- Nome definitivo do primeiro personagem.
- Elenco oficial e personagens NPC.
- Quantidade final de raças e classes.
- Sistema definitivo de elementos.
- Distribuição de classe na criação.
- Relação entre XP atual e XP de combate.
- Sistema de batalha.
- Modelo de equipamentos e slots.
- Modelo de armazenamento definitivo dos assets.
- Modelo 2D definitivo ou eventual adoção de 3D.
- Modelo de monetização, além das regras econômicas já existentes.

Essas decisões devem ser tomadas conforme o desenvolvimento, sem antecipar complexidade.

# 20. DEFINIÇÃO DE PRODUTO

A Fase 18 deve transformar o AniDeck em uma plataforma na qual assistir animes, evoluir, colecionar, personalizar e jogar sejam experiências conectadas.

A primeira vitória não será construir um mundo inteiro.

Será colocar o primeiro aventureiro na tela, permitir que o usuário interaja com ele e demonstrar que a ideia funciona na prática.

**Construir pequeno. Validar. Evoluir. Expandir.**

---

Documento de planejamento. Não autoriza implementação automática de todos os módulos.

Última referência de planejamento: 13/11/2026.