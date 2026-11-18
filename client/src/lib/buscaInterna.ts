// client/src/lib/buscaInterna.ts
// Busca do AniDeck: acha telas e funções do próprio site ("pousada", "trocar arma", "mana")
// pelo nome e por palavras que o jogador costuma usar. Anime é só a última opção da lista.

export interface Destino {
  titulo: string
  descricao: string
  caminho: string
  grupo: 'Jogo' | 'Animes' | 'Comunidade' | 'Conta'
  /** Outras palavras que levam aqui, já sem acento e em minúsculas. */
  palavras: string[]
}

export const DESTINOS: Destino[] = [
  { titulo: 'Meu Personagem', descricao: 'Equipamento, atributos e habilidades', caminho: '/personagem', grupo: 'Jogo', palavras: ['heroi', 'ficha', 'equipar', 'equipamento', 'arma', 'armadura', 'joia', 'anel', 'botas', 'capa', 'trocar item', 'inventario', 'aprimorar'] },
  { titulo: 'Atributos', descricao: 'Distribuir pontos de força, vida e defesa', caminho: '/personagem?aba=atributos', grupo: 'Jogo', palavras: ['pontos', 'distribuir', 'forca', 'constituicao', 'agilidade', 'status'] },
  { titulo: 'Habilidades', descricao: 'Golpes do personagem e maestria', caminho: '/personagem?aba=habilidades', grupo: 'Jogo', palavras: ['golpes', 'skills', 'maestria', 'despertar'] },
  { titulo: 'Expedições', descricao: 'Lutar contra monstros por Ouro, bilhetes e itens', caminho: '/expedicoes', grupo: 'Jogo', palavras: ['lutar', 'batalha', 'monstro', 'combate', 'farmar', 'ouro', 'bilhete'] },
  { titulo: 'Recuperar HP e Mana', descricao: 'Pousada, Fonte termal e poções', caminho: '/expedicoes#vida', grupo: 'Jogo', palavras: ['pousada', 'fonte', 'termal', 'pocao', 'curar', 'cura', 'vida', 'hp', 'mana', 'mp', 'descansar', 'recuperar'] },
  { titulo: 'Masmorras', descricao: 'Andares seguidos com baú no fim', caminho: '/masmorras', grupo: 'Jogo', palavras: ['dungeon', 'andar', 'bau', 'chefe'] },
  { titulo: 'Luta em grupo', descricao: 'Chamar amigos para enfrentar um monstro', caminho: '/expedicoes', grupo: 'Jogo', palavras: ['grupo', 'dupla', 'party', 'convidar', 'amigos', 'coop', 'juntos'] },
  { titulo: 'Duelos', descricao: 'Enfrentar outros jogadores', caminho: '/duelos', grupo: 'Jogo', palavras: ['pvp', 'duelo', 'desafiar', 'jogador'] },
  { titulo: 'Invocação', descricao: 'Usar bilhetes para ganhar itens', caminho: '/invocacao', grupo: 'Jogo', palavras: ['gacha', 'bilhete', 'invocar', 'sorteio', 'summon'] },
  { titulo: 'Mercado', descricao: 'Comprar equipamentos com Ouro', caminho: '/loja?secao=mercado', grupo: 'Jogo', palavras: ['comprar', 'loja', 'ouro', 'item', 'arma', 'equipamento', 'mercado'] },
  { titulo: 'Loja visual', descricao: 'Skins, auras e cenários com AniCoins', caminho: '/loja?secao=visual', grupo: 'Jogo', palavras: ['skin', 'aura', 'cenario', 'cosmetico', 'anicoins', 'visual', 'roupa'] },
  { titulo: 'Clãs', descricao: 'Entrar, fundar ou ver o seu clã', caminho: '/clas', grupo: 'Comunidade', palavras: ['cla', 'guilda', 'time', 'equipe', 'fundar'] },
  { titulo: 'Expedição do clã', descricao: 'Chefe enfrentado pelo clã inteiro', caminho: '/expedicao-do-cla', grupo: 'Comunidade', palavras: ['chefe do cla', 'raid', 'boss'] },
  { titulo: 'Guilda', descricao: 'Rank, nível, missões e XP', caminho: '/guilda', grupo: 'Jogo', palavras: ['rank', 'nivel', 'xp', 'experiencia', 'progresso', 'titulo'] },
  { titulo: 'Missões diárias', descricao: 'O que dá XP extra hoje', caminho: '/guilda#missoes-diarias-card', grupo: 'Jogo', palavras: ['missao', 'diaria', 'tarefa', 'objetivo'] },
  { titulo: 'Insígnias', descricao: 'Conquistas do perfil', caminho: '/guilda#insignias', grupo: 'Jogo', palavras: ['conquista', 'medalha', 'insignia', 'trofeu'] },
  { titulo: 'Extrato de XP', descricao: 'De onde veio cada XP', caminho: '/guilda#extrato', grupo: 'Jogo', palavras: ['historico', 'extrato', 'xp ganho'] },
  { titulo: 'Chefão da temporada', descricao: 'O chefe que todos enfrentam juntos', caminho: '/chefao', grupo: 'Jogo', palavras: ['chefao', 'boss', 'temporada', 'evento'] },
  { titulo: 'Meu Deck', descricao: 'Sua lista de animes', caminho: '/deck', grupo: 'Animes', palavras: ['lista', 'colecao', 'assistindo', 'meus animes', 'deck'] },
  { titulo: 'Agenda', descricao: 'Episódios da semana no seu horário', caminho: '/calendario', grupo: 'Animes', palavras: ['calendario', 'lancamento', 'episodio', 'semana', 'quando sai', 'horario'] },
  { titulo: 'Descobrir animes', descricao: 'Buscar e filtrar animes', caminho: '/descobrir', grupo: 'Animes', palavras: ['procurar anime', 'catalogo', 'temporada', 'filtro', 'genero'] },
  { titulo: 'Rankings de animes', descricao: 'Mais aclamados e em alta', caminho: '/rankings', grupo: 'Animes', palavras: ['ranking', 'top', 'melhores', 'em alta', 'aclamados'] },
  { titulo: 'Meu Gosto', descricao: 'Suas estatísticas de anime', caminho: '/meu-gosto', grupo: 'Animes', palavras: ['estatistica', 'graficos', 'gosto', 'generos favoritos'] },
  { titulo: 'Feed', descricao: 'O que a comunidade está fazendo', caminho: '/feed', grupo: 'Comunidade', palavras: ['atividade', 'comunidade', 'novidades dos amigos', 'timeline'] },
  { titulo: 'Membros', descricao: 'Ranking e perfis dos jogadores', caminho: '/membros', grupo: 'Comunidade', palavras: ['jogadores', 'pessoas', 'usuarios', 'seguir', 'amigos'] },
  { titulo: 'Novidades', descricao: 'Atualizações do AniDeck', caminho: '/novidades', grupo: 'Comunidade', palavras: ['atualizacao', 'changelog', 'novo', 'update'] },
  { titulo: 'Configurações', descricao: 'Conta, tema, notificações e privacidade', caminho: '/configuracoes', grupo: 'Conta', palavras: ['ajustes', 'conta', 'senha', 'tema', 'notificacao', 'privacidade', 'descanso'] },
  { titulo: 'Modo Descanso', descricao: 'Pausar a queda do HP e a sequência', caminho: '/configuracoes#comunidade', grupo: 'Conta', palavras: ['ferias', 'pausa', 'descanso', 'viagem'] },
  { titulo: 'Convites para lutar', descricao: 'Quem pode te chamar para grupos', caminho: '/configuracoes#convites', grupo: 'Conta', palavras: ['convite', 'nao perturbe', 'bloquear convites', 'grupo'] },
]

/** Minúsculas e sem acento, para "poção" achar "pocao" e vice-versa. */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** Pontua cada destino: título vale mais que palavra-chave, que vale mais que descrição. */
export function buscarNoAniDeck(termo: string, destinos: Destino[] = DESTINOS, limite = 8): Destino[] {
  const q = normalizar(termo)
  if (!q) return []
  const partes = q.split(/\s+/).filter(Boolean)
  const pontuados = destinos
    .map((d) => {
      const titulo = normalizar(d.titulo)
      const descricao = normalizar(d.descricao)
      let pontos = 0
      if (titulo === q) pontos += 100
      else if (titulo.startsWith(q)) pontos += 60
      else if (titulo.includes(q)) pontos += 40
      for (const p of d.palavras) {
        if (p === q) pontos += 50
        else if (p.startsWith(q) || q.startsWith(p)) pontos += 25
        else if (p.includes(q)) pontos += 10
      }
      // Cada palavra do termo achada em algum lugar soma; faltar uma tira o destino.
      const texto = `${titulo} ${descricao} ${d.palavras.join(' ')}`
      for (const p of partes) {
        if (texto.includes(p)) pontos += 5
        else return { d, pontos: 0 }
      }
      return { d, pontos }
    })
    .filter((x) => x.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos)
  return pontuados.slice(0, limite).map((x) => x.d)
}

/** Atalhos que aparecem antes de digitar. */
export const SUGESTOES_INICIAIS = ['/expedicoes', '/expedicoes#vida', '/personagem', '/loja?secao=mercado', '/calendario', '/deck']
