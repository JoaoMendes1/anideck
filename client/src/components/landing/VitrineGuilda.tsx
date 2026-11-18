// client/src/components/landing/VitrineGuilda.tsx
// A Guilda na página de entrada: os mesmos componentes do painel do jogador (insígnia,
// orbes, selo de streak, barra de XP), com valores de exemplo. Quem visita vê o que o
// produto é hoje, e não uma descrição dele.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Users } from 'lucide-react'
import InsigniaRank from '../hud/InsigniaRank'
import OrbeVital, { OrbeMoeda } from '../hud/OrbeVital'
import SeloStreak from '../hud/SeloStreak'
import BarraVital from '../hud/BarraVital'
import { RANKS_CONHECIDOS } from '../../lib/insignias'
import { ALTURA_DA_ARTE, LARGURA_DA_ARTE, PERSONAGEM_BASE_PADRAO, arteDoEstagio } from '../../lib/personagem'

// Três momentos da mesma jornada. São valores de exemplo: os níveis de cada rank são
// definidos no Painel Admin.
const MOMENTOS = [
  { estagio: 'iniciante', nome: 'Iniciante', rank: 'F', nivel: 1, pctXp: 22, streak: 2, hp: 46, mana: 18, moedas: 30 },
  { estagio: 'aventureiro', nome: 'Aventureiro', rank: 'C', nivel: 24, pctXp: 64, streak: 12, hp: 84, mana: 38, moedas: 640 },
  { estagio: 'lendario', nome: 'Lendário', rank: 'SS', nivel: 90, pctXp: 100, streak: 45, hp: 100, mana: 50, moedas: 4200 },
] as const

const PARTICULAS = [
  { esquerda: '18%', baixo: 60, tamanho: 4, cor: '#3FE0F0', atraso: '0s' },
  { esquerda: '78%', baixo: 90, tamanho: 3, cor: '#FF4FD8', atraso: '1.8s' },
  { esquerda: '30%', baixo: 150, tamanho: 3, cor: '#F1EEFA', atraso: '3.4s' },
  { esquerda: '68%', baixo: 190, tamanho: 4, cor: '#3FE0F0', atraso: '5s' },
]

const TROCA_AUTOMATICA_MS = 5000

const COMO_FUNCIONA = [
  'Marcar episódio rende XP. Subir de nível muda o seu rank e a arte do personagem.',
  'Vitalidade cresce com constância. Mana paga comentários e previsões.',
  'Missões do dia rendem AniCoins para a Loja de cosméticos.',
]

export default function VitrineGuilda({ aoPedirConvite }: { aoPedirConvite: () => void }) {
  const [indice, setIndice] = useState(1)
  // A troca automática para de vez quando a pessoa escolhe um momento.
  const [automatico, setAutomatico] = useState(true)

  useEffect(() => {
    if (!automatico) return
    // Com movimento reduzido, a vitrine fica parada no momento escolhido.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setInterval(() => setIndice(i => (i + 1) % MOMENTOS.length), TROCA_AUTOMATICA_MS)
    return () => window.clearInterval(id)
  }, [automatico])

  const momento = MOMENTOS[indice]
  const arte = arteDoEstagio(PERSONAGEM_BASE_PADRAO, momento.estagio)

  const escolher = (i: number) => {
    setAutomatico(false)
    setIndice(i)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] rounded-3xl border border-line bg-panel overflow-hidden text-left">
      {/* Palco do personagem */}
      <div className="relative min-h-[400px] lg:min-h-[520px] overflow-hidden bg-[radial-gradient(ellipse_at_50%_100%,rgba(123,92,255,0.22),transparent_65%)]">
        <div aria-hidden className="palco-aura absolute left-1/2 -translate-x-1/2 top-10 w-[340px] h-[340px] rounded-full bg-[radial-gradient(circle,rgba(63,224,240,0.4),rgba(123,92,255,0.2)_42%,transparent_70%)]" />
        <div aria-hidden className="absolute left-14 right-14 bottom-16 h-5 rounded-[50%] bg-[radial-gradient(ellipse,rgba(63,224,240,0.45),transparent_70%)]" />
        {PARTICULAS.map((p, i) => (
          <span
            key={i}
            aria-hidden
            className="palco-particula absolute rounded-full"
            style={{ left: p.esquerda, bottom: p.baixo, width: p.tamanho, height: p.tamanho, background: p.cor, boxShadow: `0 0 8px ${p.cor}`, animationDelay: p.atraso }}
          />
        ))}

        {arte && (
          // A chave refaz a entrada a cada troca de momento.
          // No celular a arte encosta à direita, para a insígnia e o nível caberem ao lado.
          <div key={momento.estagio} className="animate-fade-in absolute inset-x-0 bottom-14 flex justify-end pr-1 sm:justify-center sm:pr-0">
            <img
              src={arte.inteira}
              width={LARGURA_DA_ARTE}
              height={ALTURA_DA_ARTE}
              loading="lazy"
              decoding="async"
              alt={`Personagem do AniDeck no estágio ${momento.nome}`}
              className="palco-respira h-[330px] lg:h-[430px] w-auto drop-shadow-[0_0_18px_rgba(63,224,240,0.35)]"
            />
          </div>
        )}

        <div className="absolute left-4 top-4 flex items-center gap-2.5">
          <InsigniaRank rank={momento.rank} tamanho={72} animar />
          <div>
            <p className="m-0 font-mono text-xs uppercase tracking-[0.18em] text-holo-3">Rank {momento.rank}</p>
            <p className="m-0 font-anton text-xl uppercase leading-tight">Nível {momento.nivel}</p>
          </div>
        </div>

        <div role="tablist" aria-label="Momentos da jornada" className="absolute inset-x-3 bottom-3 flex justify-center gap-1.5 p-1 rounded-full bg-void/70 border border-line backdrop-blur-sm w-fit mx-auto">
          {MOMENTOS.map((m, i) => (
            <button
              key={m.estagio}
              type="button"
              role="tab"
              aria-selected={i === indice}
              onClick={() => escolher(i)}
              className={`min-h-9 px-3.5 rounded-full text-xs font-bold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-holo-3 ${
                i === indice ? 'bg-holo-3 text-void' : 'text-muted hover:text-text'
              }`}
            >
              {m.nome}
            </button>
          ))}
        </div>
      </div>

      {/* Painel do jogador */}
      <div className="p-5 sm:p-7 lg:p-8 flex flex-col gap-6 border-t lg:border-t-0 lg:border-l border-line">
        <div>
          <div className="flex items-end justify-between gap-3 mb-2">
            <p className="m-0 font-mono text-xs uppercase tracking-[0.16em] text-muted">XP do nível</p>
            <SeloStreak dias={momento.streak} compacto />
          </div>
          <BarraVital tipo="xp" pct={momento.pctXp} className="h-2.5 w-full" />
        </div>

        <div className="grid grid-cols-3 gap-2 justify-items-center">
          <OrbeVital tipo="hp" pct={momento.hp} valor={momento.hp} maximo={100} rotulo="Vitalidade" detalhe="Constância" tamanho={68} />
          <OrbeVital tipo="mp" pct={(momento.mana / 50) * 100} valor={momento.mana} maximo={50} rotulo="Mana" detalhe="Comentários" tamanho={68} />
          <OrbeMoeda saldo={momento.moedas} tamanho={68} figura />
        </div>

        <div>
          <p className="m-0 mb-2 font-mono text-xs uppercase tracking-[0.16em] text-muted">Oito ranks, de F a SS</p>
          {/* Oito colunas iguais: a insígnia encolhe com a largura em vez de quebrar a linha. */}
          <div className="grid grid-cols-8 gap-1.5 max-w-[440px]">
            {RANKS_CONHECIDOS.map(rank => (
              <InsigniaRank
                key={rank}
                rank={rank}
                tamanho={46}
                className={`w-full h-auto transition-opacity duration-300 ${rank === momento.rank ? '' : 'opacity-45'}`}
              />
            ))}
          </div>
        </div>

        <ul className="m-0 p-0 list-none flex flex-col gap-2 text-sm text-muted leading-relaxed">
          {COMO_FUNCIONA.map(frase => (
            <li key={frase} className="flex gap-2.5">
              <span aria-hidden className="mt-2 w-1.5 h-1.5 shrink-0 rotate-45 bg-holo-3" />
              {frase}
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-2.5 mt-auto">
          <button
            type="button"
            onClick={aoPedirConvite}
            className="inline-flex items-center gap-2 min-h-10 px-5 rounded-full text-sm font-extrabold text-void bg-gradient-to-r from-holo-1 via-holo-2 to-holo-3 hover:-translate-y-0.5 transition-transform cursor-pointer"
          >
            <Mail size={15} aria-hidden /> Solicitar convite Beta
          </button>
          <Link
            to="/membros"
            className="inline-flex items-center gap-2 min-h-10 px-5 rounded-full text-sm font-bold border border-line bg-panel-2 text-text hover:border-holo-3 transition-colors"
          >
            <Users size={15} aria-hidden /> Ver o ranking de membros
          </Link>
        </div>

        <p className="m-0 -mt-3 text-xs text-muted-2">Painel de exemplo. Os valores mudam com o que você assiste.</p>
      </div>
    </div>
  )
}
