// client/src/lib/rotasPreguicosas.ts
// Carregadores das páginas baixadas sob demanda. O App usa cada um no lazy(), e o menu
// chama o mesmo carregador quando o mouse passa ou o foco chega no link: o import() é
// guardado pelo navegador, então o clique encontra a página pronta e não pisca o
// carregamento.

export const CARREGAR = {
  auth: () => import('../pages/Auth'),
  busca: () => import('../pages/Busca'),
  detalhes: () => import('../pages/Detalhes'),
  calendario: () => import('../pages/Calendario'),
  rankings: () => import('../pages/Rankings'),
  painelAdmin: () => import('../pages/PainelAdmin'),
  estatisticas: () => import('../pages/Estatisticas'),
  configuracoes: () => import('../pages/Configuracoes'),
  privacidade: () => import('../pages/Privacidade'),
  inicio: () => import('../pages/Inicio'),
  guilda: () => import('../pages/Guilda'),
  personagem: () => import('../pages/Personagem'),
  expedicoes: () => import('../pages/Expedicoes'),
  masmorras: () => import('../pages/Masmorras'),
  duelos: () => import('../pages/Duelos'),
  expedicaoDoCla: () => import('../pages/ExpedicaoDoCla'),
  invocacao: () => import('../pages/Invocacao'),
  membros: () => import('../pages/Membros'),
  perfilMembro: () => import('../pages/PerfilMembro'),
  loja: () => import('../pages/Loja'),
  clas: () => import('../pages/Clas'),
  claDetalhe: () => import('../pages/ClaDetalhe'),
  salaEstreia: () => import('../pages/SalaEstreia'),
  chefao: () => import('../pages/Chefao'),
  wrapped: () => import('../pages/Wrapped'),
}

type Carregador = () => Promise<unknown>

// Rota exata ou prefixo de rota com parâmetro (terminado em "/").
const POR_ROTA: [string, Carregador][] = [
  ['/', CARREGAR.inicio],
  ['/descobrir', CARREGAR.busca],
  ['/calendario', CARREGAR.calendario],
  ['/rankings', CARREGAR.rankings],
  ['/membros', CARREGAR.membros],
  ['/meu-gosto', CARREGAR.estatisticas],
  ['/guilda', CARREGAR.guilda],
  ['/personagem', CARREGAR.personagem],
  ['/expedicoes', CARREGAR.expedicoes],
  ['/masmorras', CARREGAR.masmorras],
  ['/duelos', CARREGAR.duelos],
  ['/expedicao-do-cla', CARREGAR.expedicaoDoCla],
  ['/invocacao', CARREGAR.invocacao],
  ['/loja', CARREGAR.loja],
  ['/clas', CARREGAR.clas],
  ['/chefao', CARREGAR.chefao],
  ['/configuracoes', CARREGAR.configuracoes],
  ['/admin', CARREGAR.painelAdmin],
  ['/u/', CARREGAR.perfilMembro],
  ['/wrapped/', CARREGAR.wrapped],
  ['/anime/', CARREGAR.detalhes],
  ['/clas/', CARREGAR.claDetalhe],
]

/** Devolve o carregador da página do link, ou undefined (página do bundle principal). */
export function carregadorDaRota(para: string): Carregador | undefined {
  const caminho = para.split(/[?#]/)[0] || '/'
  const exato = POR_ROTA.find(([rota]) => (rota === '/' || !rota.endsWith('/')) && rota === caminho)
  if (exato) return exato[1]
  return POR_ROTA.find(([rota]) => rota !== '/' && rota.endsWith('/') && caminho.startsWith(rota))?.[1]
}

const jaPedidas = new Set<Carregador>()

/** Baixa o código da página do link uma vez só. Falha de rede fica para o clique tentar de novo. */
export function preCarregarRota(para: string): void {
  const carregar = carregadorDaRota(para)
  if (!carregar || jaPedidas.has(carregar)) return
  jaPedidas.add(carregar)
  carregar().catch(() => jaPedidas.delete(carregar))
}
