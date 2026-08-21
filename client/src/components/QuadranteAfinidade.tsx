// client/src/components/QuadranteAfinidade.tsx
// Cruza os dois números que a view de afinidade já calculava separados: quanto você assiste
// de cada categoria (volume) e que nota costuma dar a ela (satisfação).
//
// A pergunta que isso responde e uma barra sozinha não responde: "que gênero eu assisto
// muito mas não curto tanto?". Volume alto com nota baixa é consumo por hábito ou hype.
//
// Decisão de leitura: o gráfico é apoio, não a entrega. Quem olha um gráfico de dispersão
// pela primeira vez precisa aprender a lê-lo antes de tirar qualquer conclusão — então a
// conclusão principal vem escrita em português acima dele, e as zonas são nomeadas dentro
// do próprio desenho em vez de numa legenda separada que obriga a ir e voltar com o olho.
export interface PontoAfinidade {
    genre: string
    total_watched: number
    media_nota_genero: number | null
}

interface QuadranteAfinidadeProps {
    generos: PontoAfinidade[]
    notaMedia: number
}

// Coordenadas do desenho. Ficam aqui em cima porque quase todo ajuste visual do gráfico
// passa por elas — é mais fácil mexer num lugar só do que caçar número mágico no meio do SVG.
const LARGURA = 420
const ALTURA = 250
const MARGEM = { topo: 14, direita: 14, base: 30, esquerda: 38 }

export default function QuadranteAfinidade({ generos, notaMedia }: QuadranteAfinidadeProps) {
    // Sem nota não há eixo Y: um gênero que você nunca avaliou não tem posição vertical.
    const pontos = generos
        .filter(g => g.media_nota_genero !== null && g.media_nota_genero !== undefined)
        .sort((a, b) => b.total_watched - a.total_watched)
        .slice(0, 10)

    if (pontos.length < 3) {
        return (
            <p className="text-[12.5px] text-muted-2">
                Avalie animes de pelo menos três categorias diferentes pra desbloquear esse cruzamento.
            </p>
        )
    }

    const maxVolume = Math.max(...pontos.map(p => p.total_watched), 1)
    const notas = pontos.map(p => p.media_nota_genero as number)

    // Divisória horizontal: a sua própria nota média, e não um 7 fixo — quem dá 9 pra tudo
    // precisa de um corte diferente de quem dá 6. Se ainda não há nota média (usuário sem
    // avaliações no overview), cai na mediana dos próprios pontos pra não colar tudo no topo.
    const ordenadas = [...notas].sort((a, b) => a - b)
    const mediana = ordenadas[Math.floor(ordenadas.length / 2)]
    const corteNota = notaMedia > 0 ? notaMedia : mediana
    const corteVolume = maxVolume / 2

    // Eixo Y começa um pouco abaixo da menor nota e termina um pouco acima da maior, em vez
    // de ir de 0 a 10: notas de anime vivem espremidas entre 6 e 10, e a escala cheia
    // amontoaria todos os pontos numa faixa fina no topo.
    const notaMin = Math.max(0, Math.min(...notas, corteNota) - 0.5)
    const notaMax = Math.min(10, Math.max(...notas, corteNota) + 0.5)
    const faixaNota = notaMax - notaMin || 1

    const areaLargura = LARGURA - MARGEM.esquerda - MARGEM.direita
    const areaAltura = ALTURA - MARGEM.topo - MARGEM.base

    const posX = (volume: number) => MARGEM.esquerda + (volume / maxVolume) * areaLargura
    const posY = (nota: number) => MARGEM.topo + areaAltura - ((nota - notaMin) / faixaNota) * areaAltura

    const cortaX = posX(corteVolume)
    const cortaY = posY(corteNota)

    // --- A frase de insight ---
    // A ordem das tentativas é a ordem do que é mais interessante saber sobre si mesmo:
    // primeiro o incômodo (assiste muito e não curte), depois a oportunidade (curtiu o pouco
    // que viu), e só então a confirmação do óbvio (sua zona de conforto).
    const muito = (p: PontoAfinidade) => p.total_watched > corteVolume
    const acima = (p: PontoAfinidade) => (p.media_nota_genero as number) >= corteNota

    const porHabito = pontos.filter(p => muito(p) && !acima(p))
    const paraExplorar = pontos.filter(p => !muito(p) && acima(p))
    const conforto = pontos.filter(p => muito(p) && acima(p))

    let insight = null
    if (porHabito.length > 0) {
        const alvo = porHabito[0] // já vem ordenado por volume
        insight = (
            <>
                Você assiste muito <b className="text-coral">{alvo.genre}</b>, mas costuma dar notas
                abaixo da sua média nesse gênero.
            </>
        )
    } else if (paraExplorar.length > 0) {
        const alvo = [...paraExplorar].sort((a, b) => (b.media_nota_genero as number) - (a.media_nota_genero as number))[0]
        insight = (
            <>
                Você gostou bastante do pouco que viu de <b className="text-holo-3">{alvo.genre}</b> —
                talvez valha explorar mais.
            </>
        )
    } else if (conforto.length > 0) {
        insight = (
            <>
                <b className="text-green">{conforto[0].genre}</b> é sua zona de conforto de verdade:
                você assiste muito e gosta do que assiste.
            </>
        )
    }

    // Retângulos de fundo de cada zona, com o nome escrito dentro.
    const zonas = [
        { x: cortaX, y: MARGEM.topo, w: LARGURA - MARGEM.direita - cortaX, h: cortaY - MARGEM.topo, cor: '#a0ff78', nome: 'zona de conforto', ancora: 'end' as const },
        { x: cortaX, y: cortaY, w: LARGURA - MARGEM.direita - cortaX, h: ALTURA - MARGEM.base - cortaY, cor: '#FF5C6C', nome: 'assiste por hábito', ancora: 'end' as const },
        { x: MARGEM.esquerda, y: MARGEM.topo, w: cortaX - MARGEM.esquerda, h: cortaY - MARGEM.topo, cor: '#3FE0F0', nome: 'vale explorar', ancora: 'start' as const },
        { x: MARGEM.esquerda, y: cortaY, w: cortaX - MARGEM.esquerda, h: ALTURA - MARGEM.base - cortaY, cor: '#6B5F94', nome: 'não é pra você', ancora: 'start' as const },
    ]

    return (
        <div>
            {insight && <p className="text-[13px] mb-5 leading-relaxed">{insight}</p>}

            <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} className="w-full h-auto" role="img" aria-label="Volume assistido versus nota média por categoria">
                {zonas.map(z => (
                    <g key={z.nome}>
                        {/* Larguras podem ficar negativas se a divisória encostar na borda;
                            Math.max evita que o SVG reclame de rect com dimensão inválida. */}
                        <rect x={z.x} y={z.y} width={Math.max(0, z.w)} height={Math.max(0, z.h)} fill={z.cor} opacity="0.06" />
                        <text
                            x={z.ancora === 'end' ? z.x + Math.max(0, z.w) - 6 : z.x + 6}
                            y={z.y + 13}
                            textAnchor={z.ancora}
                            fill={z.cor}
                            opacity="0.6"
                            fontSize="8.5"
                            fontFamily="JetBrains Mono, monospace"
                        >
                            {z.nome}
                        </text>
                    </g>
                ))}

                {/* Divisórias */}
                <line x1={cortaX} y1={MARGEM.topo} x2={cortaX} y2={ALTURA - MARGEM.base} stroke="#2B2247" strokeWidth="1" strokeDasharray="4 4" />
                <line x1={MARGEM.esquerda} y1={cortaY} x2={LARGURA - MARGEM.direita} y2={cortaY} stroke="#FFC542" strokeWidth="1" strokeDasharray="4 4" opacity="0.45" />

                {/* Eixos */}
                <line x1={MARGEM.esquerda} y1={ALTURA - MARGEM.base} x2={LARGURA - MARGEM.direita} y2={ALTURA - MARGEM.base} stroke="#2B2247" strokeWidth="1" />
                <line x1={MARGEM.esquerda} y1={MARGEM.topo} x2={MARGEM.esquerda} y2={ALTURA - MARGEM.base} stroke="#2B2247" strokeWidth="1" />

                {/* Referências dos eixos */}
                <text x={LARGURA - MARGEM.direita} y={ALTURA - 9} textAnchor="end" fill="#6B5F94" fontSize="8.5" fontFamily="JetBrains Mono, monospace">
                    assiste mais →
                </text>
                <text x={MARGEM.esquerda - 5} y={MARGEM.topo + 7} textAnchor="end" fill="#6B5F94" fontSize="8.5" fontFamily="JetBrains Mono, monospace">
                    {notaMax.toFixed(1)}
                </text>
                <text x={MARGEM.esquerda - 5} y={cortaY + 3} textAnchor="end" fill="#FFC542" opacity="0.8" fontSize="8.5" fontFamily="JetBrains Mono, monospace">
                    {corteNota.toFixed(1)}
                </text>
                <text x={MARGEM.esquerda - 5} y={ALTURA - MARGEM.base} textAnchor="end" fill="#6B5F94" fontSize="8.5" fontFamily="JetBrains Mono, monospace">
                    {notaMin.toFixed(1)}
                </text>

                {pontos.map(p => {
                    const x = posX(p.total_watched)
                    const y = posY(p.media_nota_genero as number)
                    // Rótulo vira pra dentro quando o ponto está perto da borda direita,
                    // senão o nome do gênero sai do desenho.
                    const perto = x > LARGURA - MARGEM.direita - 70
                    return (
                        <g key={p.genre}>
                            <title>{`${p.genre}: ${p.total_watched} animes, nota média ${p.media_nota_genero}`}</title>
                            <circle cx={x} cy={y} r="10" fill="#F1EEFA" opacity="0.08" />
                            <circle cx={x} cy={y} r="4.5" fill="#F1EEFA" />
                            <text
                                x={perto ? x - 9 : x + 9}
                                y={y + 3.5}
                                textAnchor={perto ? 'end' : 'start'}
                                fill="#F1EEFA"
                                fontSize="9.5"
                                fontWeight="700"
                            >
                                {p.genre}
                            </text>
                        </g>
                    )
                })}
            </svg>

            <p className="text-[10.5px] text-muted-2 mt-3">
                Cada ponto é uma categoria. Quanto mais à direita, mais você assiste; quanto mais
                acima, maior a nota que costuma dar. A linha dourada é a sua nota média geral.
            </p>
        </div>
    )
}
