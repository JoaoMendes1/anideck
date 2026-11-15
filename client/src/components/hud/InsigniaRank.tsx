// client/src/components/hud/InsigniaRank.tsx
// Insígnia de cada rank da Guilda, de F a SS. Cada degrau acrescenta peças ao brasão
// (aletas, pontas, asas, louros, coroa, halo), para o rank ser reconhecido pela forma
// antes da letra. Abaixo de 48 px desenha a versão compacta (ver lib/insignias.ts).
import { useId, type ReactNode } from 'react'
import {
  COR_DO_RANK,
  animaPorPadrao,
  detalhePorTamanho,
  normalizarRank,
  type RankConhecido,
} from '../../lib/insignias'

interface Props {
  rank: string | null | undefined
  /** Largura em px; a altura segue a proporção 140×130 do desenho. */
  tamanho: number
  /** Liga halo, aura e brilhos. Por padrão, só a partir de 96 px. */
  animar?: boolean
  className?: string
}

const ESCUDO = 'M70 10 L110 25 V62 C110 93 91 110 70 120 C49 110 30 93 30 62 V25 Z'
const ESCUDO_CHANFRO = 'M70 15 L105 28.5 V62 C105 89.5 88 104.5 70 114 C52 104.5 35 89.5 35 62 V28.5 Z'
const ESCUDO_NUCLEO = 'M70 21 L99 32.5 V61.5 C99 85 84.5 98.5 70 107 C55.5 98.5 41 85 41 61.5 V32.5 Z'
const HEXA = 'M70 12 L112 36 V88 L70 112 L28 88 V36 Z'
const HEXA_CHANFRO = 'M70 17.5 L107 39 V85 L70 106.5 L33 85 V39 Z'
const HEXA_NUCLEO = 'M70 23.5 L101 42 V82 L70 100.5 L39 82 V42 Z'
const ASA = 'M31 46 L4 32 L14 52 L2 59 L17 70 L9 84 L31 76 Z'
const ASA_A = 'M31 44 L2 26 L13 49 L1 58 L17 70 L8 88 L31 78 Z'
const ESTRELA_A =
  '70.0,2.0 86.8,21.3 112.4,19.6 110.7,45.2 130.0,62.0 110.7,78.8 112.4,104.4 86.8,102.7 70.0,122.0 53.2,102.7 27.6,104.4 29.3,78.8 10.0,62.0 29.3,45.2 27.6,19.6 53.2,21.3'
const ESTRELA_SS =
  '70.0,2.0 81.9,19.6 101.0,10.3 102.5,31.5 123.7,33.0 114.4,52.1 132.0,64.0 114.4,75.9 123.7,95.0 102.5,96.5 101.0,117.7 81.9,108.4 70.0,126.0 58.1,108.4 39.0,117.7 37.5,96.5 16.3,95.0 25.6,75.9 8.0,64.0 25.6,52.1 16.3,33.0 37.5,31.5 39.0,10.3 58.1,19.6'

// Espelha um grupo no eixo vertical do desenho (x = 70).
function Espelhado({ children }: { children: ReactNode }) {
  return (
    <>
      <g>{children}</g>
      <g transform="translate(140, 0) scale(-1, 1)">{children}</g>
    </>
  )
}

function Gradiente({ id, cores, horizontal = false }: { id: string; cores: [number, string][]; horizontal?: boolean }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2={horizontal ? '1' : '0'} y2="1">
      {cores.map(([pos, cor]) => (
        <stop key={pos} offset={`${pos}%`} stopColor={cor} />
      ))}
    </linearGradient>
  )
}

function Divisas({ cores, inicio, passo, largura = 2.6 }: { cores: string[]; inicio: number; passo: number; largura?: number }) {
  return (
    <>
      {cores.map((cor, i) => {
        const y = inicio + i * passo
        return (
          <path
            key={i}
            d={`M55 ${y} L70 ${y + 7} L85 ${y}`}
            fill="none"
            stroke={cor}
            strokeWidth={largura}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )
      })}
    </>
  )
}

function Letra({ texto, y, tamanho = 44, cor, brilho }: { texto: string; y: number; tamanho?: number; cor: string; brilho?: string }) {
  return (
    <text
      x="70"
      y={y}
      textAnchor="middle"
      fontFamily="Anton, sans-serif"
      fontSize={tamanho}
      letterSpacing={texto.length > 1 ? 1 : 0}
      fill={cor}
      style={brilho ? { filter: `drop-shadow(0 0 6px ${brilho})` } : undefined}
    >
      {texto}
    </text>
  )
}

function Louros({ folha, aro, completa }: { folha: string; aro: string; completa: boolean }) {
  return (
    <Espelhado>
      <path d="M42 104 C22 92 15 68 21 42 C24 31 32 22 41 17" fill="none" stroke={`url(#${aro})`} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M27 92 C17 88 15 77 24 75 C27 81 28 87 27 92 Z" fill={`url(#${folha})`} />
      <path d="M21 77 C11 71 11 59 21 59 C23 65 23 71 21 77 Z" fill={`url(#${folha})`} />
      <path d="M20 60 C11 52 14 40 24 42 C24 48 23 54 20 60 Z" fill={`url(#${folha})`} />
      <path d="M25 44 C19 35 24 24 33 28 C31 34 29 39 25 44 Z" fill={`url(#${folha})`} />
      <path d="M34 30 C31 21 38 13 45 19 C42 23 38 27 34 30 Z" fill={`url(#${folha})`} />
      {completa && (
        <>
          <circle cx="26" cy="83" r="2" fill="#FFF0B8" />
          <circle cx="21" cy="67" r="2" fill="#FFF0B8" />
          <circle cx="23" cy="50" r="2" fill="#FFF0B8" />
          <circle cx="30" cy="35" r="2" fill="#FFF0B8" />
        </>
      )}
    </Espelhado>
  )
}

function Coroa({ id, completa }: { id: string; completa: boolean }) {
  return (
    <g transform="translate(0, -2)">
      <path d="M46 24 L41 7 L56 15 L70 1 L84 15 L99 7 L94 24 Z" fill={`url(#${id})`} stroke="#FFF0B8" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M48 24 H92 L90 27.5 H50 Z" fill="#8C5808" stroke="#FFF0B8" strokeWidth="1" />
      <polygon points="70,6 73,12 70,18 67,12" fill="#3FE0F0" />
      {completa && (
        <>
          <circle cx="55" cy="18" r="2.2" fill="#FF4FD8" />
          <circle cx="85" cy="18" r="2.2" fill="#FF4FD8" />
          <circle cx="41" cy="6" r="2" fill="#FFF0B8" />
          <circle cx="70" cy="1" r="2.4" fill="#FFF0B8" />
          <circle cx="99" cy="6" r="2" fill="#FFF0B8" />
        </>
      )}
    </g>
  )
}

/** Placa em três camadas: aro, chanfro (só na completa) e núcleo escuro onde a letra fica. */
function Placa({ forma, chanfro, nucleo, placa, aro, nucleoCor, bordaNucleo, chanfroCor, completa }: {
  forma: string; chanfro: string; nucleo: string; placa: string; aro: string; nucleoCor: string
  bordaNucleo: string; chanfroCor: string; completa: boolean
}) {
  return (
    <>
      <path d={forma} fill={placa} stroke={aro} strokeWidth="3.2" strokeLinejoin="round" />
      {completa && <path d={chanfro} fill="none" stroke={chanfroCor} strokeWidth="1.2" />}
      <path d={nucleo} fill={nucleoCor} stroke={bordaNucleo} strokeWidth="1.6" />
    </>
  )
}

function desenho(rank: RankConhecido, p: string, completa: boolean, animar: boolean): { defs: ReactNode; corpo: ReactNode } {
  const u = (nome: string) => `url(#${nome}_${p})`
  const id = (nome: string) => `${nome}_${p}`

  switch (rank) {
    case 'F':
      return {
        defs: (
          <>
            <Gradiente id={id('aro')} horizontal cores={[[0, '#B8AED8'], [50, '#6B5F94'], [100, '#393056']]} />
            <Gradiente id={id('placa')} cores={[[0, '#332A54'], [100, '#1A1530']]} />
            <Gradiente id={id('nucleo')} cores={[[0, '#17122B'], [100, '#0C0919']]} />
            <Gradiente id={id('letra')} cores={[[0, '#F1EEFA'], [100, '#8B80B0']]} />
          </>
        ),
        corpo: (
          <>
            <Placa forma={ESCUDO} chanfro={ESCUDO_CHANFRO} nucleo={ESCUDO_NUCLEO} placa={u('placa')} aro={u('aro')} nucleoCor={u('nucleo')} bordaNucleo="#4A3F70" chanfroCor="rgba(241,238,250,0.22)" completa={completa} />
            {completa && (
              <g fill="#8B80B0">
                <circle cx="70" cy="16" r="2" fill="#A79BC9" />
                <circle cx="36" cy="31" r="1.8" />
                <circle cx="104" cy="31" r="1.8" />
                <circle cx="36" cy="62" r="1.8" fill="#6B5F94" />
                <circle cx="104" cy="62" r="1.8" fill="#6B5F94" />
                <circle cx="70" cy="112" r="2" fill="#6B5F94" />
              </g>
            )}
            <Letra texto="F" y={76} cor={u('letra')} />
            <polygon points="70,92 74,96 70,100 66,96" fill="#8B80B0" />
          </>
        ),
      }
    case 'E':
      return {
        defs: (
          <>
            <Gradiente id={id('aro')} horizontal cores={[[0, '#B8FAFF'], [45, '#3FE0F0'], [100, '#126878']]} />
            <Gradiente id={id('placa')} cores={[[0, '#195260'], [100, '#0D222E']]} />
            <Gradiente id={id('nucleo')} cores={[[0, '#0E2A36'], [100, '#08131C']]} />
            <Gradiente id={id('letra')} cores={[[0, '#FFFFFF'], [100, '#3FE0F0']]} />
          </>
        ),
        corpo: (
          <>
            <Espelhado>
              <path d="M28 36 L20 42 V56 L28 62 Z" fill="#1A6A7A" stroke="#3FE0F0" strokeWidth="1.2" />
            </Espelhado>
            <Placa forma={ESCUDO} chanfro={ESCUDO_CHANFRO} nucleo={ESCUDO_NUCLEO} placa={u('placa')} aro={u('aro')} nucleoCor={u('nucleo')} bordaNucleo="#1E7B8C" chanfroCor="rgba(191,248,255,0.35)" completa={completa} />
            <polygon points="70,12 75,18 70,24 65,18" fill="#3FE0F0" stroke="#BFF8FF" strokeWidth="1" />
            <Letra texto="E" y={75} cor={u('letra')} brilho={completa ? 'rgba(63,224,240,0.45)' : undefined} />
            <Divisas cores={['#3FE0F0']} inicio={89} passo={0} largura={3} />
          </>
        ),
      }
    case 'D':
      return {
        defs: (
          <>
            <Gradiente id={id('aro')} horizontal cores={[[0, '#FFFFFF'], [40, '#7FF0FA'], [100, '#14889E']]} />
            <Gradiente id={id('placa')} cores={[[0, '#9AF6FF'], [45, '#3FE0F0'], [100, '#14768A']]} />
            <Gradiente id={id('nucleo')} cores={[[0, '#133846'], [100, '#0A1822']]} />
          </>
        ),
        corpo: (
          <>
            <Espelhado>
              <path d="M30 30 L14 24 L20 46 L12 54 L28 66 Z" fill="#1F8CA1" stroke="#7FF0FA" strokeWidth="1.5" strokeLinejoin="round" />
            </Espelhado>
            <Placa forma={ESCUDO} chanfro={ESCUDO_CHANFRO} nucleo={ESCUDO_NUCLEO} placa={u('placa')} aro={u('aro')} nucleoCor={u('nucleo')} bordaNucleo="#7FF0FA" chanfroCor="rgba(255,255,255,0.65)" completa={completa} />
            <polygon points="70,10 76,18 70,26 64,18" fill="#FFFFFF" stroke="#3FE0F0" strokeWidth="1.2" />
            <Letra texto="D" y={73} tamanho={43} cor="#F1EEFA" brilho={completa ? 'rgba(63,224,240,0.65)' : undefined} />
            <Divisas cores={['#7FF0FA', '#3FE0F0']} inicio={85} passo={8} largura={2.8} />
          </>
        ),
      }
    case 'C':
      return {
        defs: (
          <>
            <Gradiente id={id('aro')} horizontal cores={[[0, '#FFFFFF'], [50, '#D8E0F0'], [100, '#6E7994']]} />
            <Gradiente id={id('placa')} cores={[[0, '#F7F9FC'], [52, '#B8C3DC'], [100, '#6D7792']]} />
            <Gradiente id={id('nucleo')} cores={[[0, '#1E2336'], [100, '#0E111D']]} />
          </>
        ),
        corpo: (
          <>
            <polygon points="70,4 78,16 62,16" fill="#E2E8F5" stroke="#FFFFFF" strokeWidth="1" />
            <polygon points="70,120 78,108 62,108" fill="#8E98B0" stroke="#E2E8F5" strokeWidth="1" />
            <Espelhado>
              <polygon points="18,48 28,38 28,58" fill="#B8C3DC" />
              <polygon points="18,76 28,66 28,86" fill="#8E98B0" />
            </Espelhado>
            <Placa forma={HEXA} chanfro={HEXA_CHANFRO} nucleo={HEXA_NUCLEO} placa={u('placa')} aro={u('aro')} nucleoCor={u('nucleo')} bordaNucleo="#C9D2E6" chanfroCor="rgba(255,255,255,0.8)" completa={completa} />
            <Letra texto="C" y={72} tamanho={42} cor="#F1EEFA" brilho={completa ? 'rgba(201,210,230,0.5)' : undefined} />
            <Divisas cores={['#FFFFFF', '#C9D2E6', '#8E98B0']} inicio={80} passo={6.5} largura={2.4} />
          </>
        ),
      }
    case 'B':
      return {
        defs: (
          <>
            <Gradiente id={id('aro')} horizontal cores={[[0, '#F2FFE9'], [50, '#A0FF78'], [100, '#297A18']]} />
            <Gradiente id={id('placa')} cores={[[0, '#D6FFC2'], [50, '#6CE043'], [100, '#256E16']]} />
            <Gradiente id={id('asa')} horizontal cores={[[0, '#DCFFCB'], [55, '#A0FF78'], [100, '#358C21']]} />
            <Gradiente id={id('nucleo')} cores={[[0, '#142E18'], [100, '#09170C']]} />
          </>
        ),
        corpo: (
          <>
            <Espelhado>
              <path d={ASA} fill={u('asa')} stroke="#E6FFD9" strokeWidth="1.4" strokeLinejoin="round" />
              {completa && <path d="M29 53 L10 43 M29 63 L11 58 M29 71 L16 74" stroke="#1E5E11" strokeWidth="1.4" strokeLinecap="round" />}
            </Espelhado>
            <Placa forma={HEXA} chanfro={HEXA_CHANFRO} nucleo={HEXA_NUCLEO} placa={u('placa')} aro={u('aro')} nucleoCor={u('nucleo')} bordaNucleo="#A0FF78" chanfroCor="rgba(255,255,255,0.7)" completa={completa} />
            <polygon points="70,15 76,23 70,31 64,23" fill="#A0FF78" stroke="#FFFFFF" strokeWidth="1.2" />
            <Letra texto="B" y={77} cor="#E6FFD9" brilho={completa ? 'rgba(160,255,120,0.65)' : undefined} />
            <polygon points="70,89 75,94 70,99 65,94" fill="#A0FF78" />
          </>
        ),
      }
    case 'A':
      return {
        defs: (
          <>
            <Gradiente id={id('aro')} horizontal cores={[[0, '#FFE0F9'], [50, '#FF4FD8'], [100, '#7B5CFF']]} />
            <Gradiente id={id('placa')} cores={[[0, '#FF7AE2'], [50, '#D438B8'], [100, '#5E3FD6']]} />
            <Gradiente id={id('asa')} horizontal cores={[[0, '#FF9EEB'], [50, '#C27BFF'], [100, '#6238D6']]} />
            <Gradiente id={id('nucleo')} cores={[[0, '#29123D'], [100, '#110821']]} />
          </>
        ),
        corpo: (
          <>
            <polygon className={animar ? 'insignia-aura' : undefined} points={ESTRELA_A} fill={u('placa')} opacity="0.32" />
            <Espelhado>
              <path d={ASA_A} fill={u('asa')} stroke="#FFC2F1" strokeWidth="1.5" strokeLinejoin="round" />
              {completa && <path d="M29 52 L9 38 M29 62 L9 56 M29 71 L14 76" stroke="#4D227A" strokeWidth="1.5" strokeLinecap="round" />}
            </Espelhado>
            <Placa forma={HEXA} chanfro={HEXA_CHANFRO} nucleo={HEXA_NUCLEO} placa={u('placa')} aro={u('aro')} nucleoCor={u('nucleo')} bordaNucleo="#FF4FD8" chanfroCor="rgba(255,255,255,0.75)" completa={completa} />
            <polygon points="70,6 78,20 70,27 62,20" fill="#FF4FD8" stroke="#FFE0F9" strokeWidth="1.5" />
            <polygon points="70,11 74,19 70,23 66,19" fill="#3FE0F0" />
            <Letra texto="A" y={77} cor="#FFE6FA" brilho={completa ? 'rgba(255,79,216,0.8)' : undefined} />
            <polygon points="70,88 75,94 70,100 65,94" fill="#3FE0F0" stroke="#FFFFFF" strokeWidth="0.8" />
            {completa && (
              <>
                <polygon points="57,91 61,95 57,99 53,95" fill="#FF4FD8" />
                <polygon points="83,91 87,95 83,99 79,95" fill="#FF4FD8" />
              </>
            )}
          </>
        ),
      }
    case 'S':
      return {
        defs: (
          <>
            <Gradiente id={id('aro')} horizontal cores={[[0, '#FFFFFF'], [45, '#FFE29A'], [100, '#B87309']]} />
            <Gradiente id={id('folha')} horizontal cores={[[0, '#FFF0B8'], [60, '#FFC542'], [100, '#C98A12']]} />
            <Gradiente id={id('coroa')} cores={[[0, '#FFF5D1'], [55, '#FFC542'], [100, '#B87309']]} />
            <Gradiente id={id('nucleo')} cores={[[0, '#2D1E0B'], [100, '#120B04']]} />
            <Gradiente id={id('letra')} cores={[[0, '#FFFFFF'], [55, '#FFE29A'], [100, '#FFC542']]} />
          </>
        ),
        corpo: (
          <>
            {completa && <circle cx="70" cy="64" r="56" fill="none" stroke="rgba(255,197,66,0.25)" strokeWidth="1.5" strokeDasharray="6 4" />}
            <Louros folha={id('folha')} aro={id('aro')} completa={completa} />
            <Placa forma={HEXA} chanfro={HEXA_CHANFRO} nucleo={HEXA_NUCLEO} placa={u('coroa')} aro={u('aro')} nucleoCor={u('nucleo')} bordaNucleo="#FFC542" chanfroCor="rgba(255,255,255,0.8)" completa={completa} />
            <Coroa id={id('coroa')} completa={completa} />
            <Letra texto="S" y={78} cor={u('letra')} brilho={completa ? 'rgba(255,197,66,0.75)' : undefined} />
            <polygon points="70,89 75,95 70,101 65,95" fill="#FF4FD8" stroke="#FFF0B8" strokeWidth="1" />
            {animar && (
              <>
                <circle className="insignia-brilho" cx="28" cy="22" r="2.2" fill="#FFF0B8" />
                <circle className="insignia-brilho insignia-brilho-tarde" cx="112" cy="22" r="2.2" fill="#FFF0B8" />
              </>
            )}
          </>
        ),
      }
    case 'SS':
      return {
        defs: (
          <>
            <Gradiente id={id('prisma')} horizontal cores={[[0, '#FF4FD8'], [50, '#3FE0F0'], [100, '#FFC542']]} />
            <Gradiente id={id('aro')} horizontal cores={[[0, '#FFFFFF'], [50, '#FFE29A'], [100, '#C98A12']]} />
            <Gradiente id={id('folha')} horizontal cores={[[0, '#FFF5D6'], [50, '#FFC542'], [100, '#FF4FD8']]} />
            <Gradiente id={id('coroa')} cores={[[0, '#FFFFFF'], [45, '#FFE29A'], [100, '#C98A12']]} />
            <Gradiente id={id('nucleo')} horizontal cores={[[0, '#2B1238'], [50, '#120B24'], [100, '#0B232E']]} />
            <Gradiente id={id('letra')} cores={[[0, '#FFFFFF'], [55, '#FFF0B8'], [100, '#FFC542']]} />
          </>
        ),
        corpo: (
          <>
            {completa && (
              <>
                <g className={animar ? 'insignia-halo' : undefined}>
                  <circle cx="70" cy="65" r="63" fill="none" stroke={u('prisma')} strokeWidth="2.2" strokeDasharray="4 7" />
                  <polygon points="70,0 73,4 70,8 67,4" fill="#3FE0F0" />
                  <polygon points="70,122 73,126 70,130 67,126" fill="#FF4FD8" />
                </g>
                <g className={animar ? 'insignia-halo-reverso' : undefined}>
                  <circle cx="70" cy="65" r="57" fill="none" stroke={u('prisma')} strokeWidth="1.2" strokeDasharray="14 8" opacity="0.75" />
                </g>
              </>
            )}
            <polygon className={animar ? 'insignia-aura' : undefined} points={ESTRELA_SS} fill={u('prisma')} opacity="0.38" />
            <path d="M26 48 L0 32 L11 54 L-2 64 L16 75 L8 93 L28 83 Z" fill={u('prisma')} opacity="0.85" />
            <path d="M114 48 L140 32 L129 54 L142 64 L124 75 L132 93 L112 83 Z" fill={u('prisma')} opacity="0.85" />
            <Louros folha={id('folha')} aro={id('aro')} completa={completa} />
            <path d={HEXA} fill={u('coroa')} stroke={u('aro')} strokeWidth="3.4" strokeLinejoin="round" />
            {completa && <path d={HEXA_CHANFRO} fill="none" stroke={u('prisma')} strokeWidth="1.6" />}
            <path d={HEXA_NUCLEO} fill={u('nucleo')} stroke="#FFF0B8" strokeWidth="1.8" />
            <Coroa id={id('coroa')} completa={completa} />
            <Letra texto="SS" y={75} tamanho={35} cor={u('letra')} brilho={completa ? 'rgba(255,197,66,0.95)' : undefined} />
            <polygon points="70,86 76,93 70,100 64,93" fill={u('prisma')} stroke="#FFFFFF" strokeWidth="1.2" />
            {completa && (
              <>
                <polygon points="56,90 60,94 56,98 52,94" fill="#3FE0F0" />
                <polygon points="84,90 88,94 84,98 80,94" fill="#FF4FD8" />
              </>
            )}
            {animar && (
              <>
                <circle className="insignia-brilho" cx="22" cy="18" r="2.5" fill="#3FE0F0" />
                <circle className="insignia-brilho insignia-brilho-tarde" cx="118" cy="18" r="2.5" fill="#FF4FD8" />
              </>
            )}
          </>
        ),
      }
  }
}

export default function InsigniaRank({ rank, tamanho, animar, className = '' }: Props) {
  const conhecido = normalizarRank(rank)
  const completa = detalhePorTamanho(tamanho) === 'completa'
  const animado = (animar ?? animaPorPadrao(tamanho)) && completa
  // Ids únicos por instância: o mesmo rank aparece várias vezes na página (barra, Início, menu).
  const prefixo = `ins${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const { defs, corpo } = desenho(conhecido, prefixo, completa, animado)
  const cor = COR_DO_RANK[conhecido]

  return (
    <svg
      width={tamanho}
      height={Math.round((tamanho * 130) / 140)}
      viewBox="0 0 140 130"
      role="img"
      aria-label={`Insígnia do rank ${conhecido}`}
      className={`block shrink-0 overflow-visible ${className}`}
      style={{ filter: `drop-shadow(0 0 ${completa ? 10 : 5}px ${cor}66)` }}
    >
      <defs>{defs}</defs>
      {corpo}
    </svg>
  )
}
