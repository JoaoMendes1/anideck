// client/src/components/QuadranteAfinidade.tsx
// Cruza os dois números que a view de afinidade já calculava separados: quanto você assiste
// de cada categoria (volume) e que nota costuma dar a ela (satisfação).
//
// A pergunta que isso responde e uma barra sozinha não responde: "que gênero eu assisto
// muito mas não curto tanto?". Volume alto com nota baixa é consumo por hábito ou hype.
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
const ALTURA = 260
const MARGEM = { topo: 18, direita: 16, base: 34, esquerda: 40 }

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

    // Eixo Y começa um pouco abaixo da menor nota e termina um pouco acima da maior, em vez
    // de ir de 0 a 10: notas de anime vivem espremidas entre 6 e 10, e a escala cheia
    // amontoaria todos os pontos numa faixa fina no topo.
    const notas = pontos.map(p => p.media_nota_genero as number)
    const notaMin = Math.max(0, Math.min(...notas, notaMedia) - 0.5)
    const notaMax = Math.min(10, Math.max(...notas, notaMedia) + 0.5)
    const faixaNota = notaMax - notaMin || 1

    const areaLargura = LARGURA - MARGEM.esquerda - MARGEM.direita
    const areaAltura = ALTURA - MARGEM.topo - MARGEM.base

    const posX = (volume: number) => MARGEM.esquerda + (volume / maxVolume) * areaLargura
    const posY = (nota: number) => MARGEM.topo + areaAltura - ((nota - notaMin) / faixaNota) * areaAltura

    // As divisórias: metade do volume máximo no eixo X, e a sua própria nota média no Y.
    // Usar a sua média (e não um 7 fixo) é o que torna o "gostei mais que o normal"
    // relativo a você — quem dá 9 pra tudo tem um corte diferente de quem dá 6.
    const cortaX = posX(maxVolume / 2)
    const cortaY = posY(notaMedia)

    return (
        <div>
            <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} className="w-full h-auto" role="img" aria-label="Volume assistido versus nota média por categoria">
                {/* Divisórias dos quadrantes */}
                <line x1={cortaX} y1={MARGEM.topo} x2={cortaX} y2={ALTURA - MARGEM.base} stroke="#2B2247" strokeWidth="1" strokeDasharray="4 4" />
                <line x1={MARGEM.esquerda} y1={cortaY} x2={LARGURA - MARGEM.direita} y2={cortaY} stroke="#FFC542" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />

                {/* Eixos */}
                <line x1={MARGEM.esquerda} y1={ALTURA - MARGEM.base} x2={LARGURA - MARGEM.direita} y2={ALTURA - MARGEM.base} stroke="#2B2247" strokeWidth="1" />
                <line x1={MARGEM.esquerda} y1={MARGEM.topo} x2={MARGEM.esquerda} y2={ALTURA - MARGEM.base} stroke="#2B2247" strokeWidth="1" />

                {/* Rótulos dos eixos */}
                <text x={LARGURA - MARGEM.direita} y={ALTURA - 10} textAnchor="end" fill="#6B5F94" fontSize="9" fontFamily="JetBrains Mono, monospace">
                    quantidade assistida →
                </text>
                <text x={MARGEM.esquerda - 6} y={MARGEM.topo + 8} textAnchor="end" fill="#6B5F94" fontSize="9" fontFamily="JetBrains Mono, monospace">
                    {notaMax.toFixed(1)}
                </text>
                <text x={MARGEM.esquerda - 6} y={ALTURA - MARGEM.base} textAnchor="end" fill="#6B5F94" fontSize="9" fontFamily="JetBrains Mono, monospace">
                    {notaMin.toFixed(1)}
                </text>
                <text x={MARGEM.esquerda + 4} y={cortaY - 4} fill="#FFC542" fontSize="8.5" opacity="0.7" fontFamily="JetBrains Mono, monospace">
                    sua média
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
                            <circle cx={x} cy={y} r="5.5" fill="#3FE0F0" opacity="0.85" />
                            <circle cx={x} cy={y} r="10" fill="#3FE0F0" opacity="0.12" />
                            <text
                                x={perto ? x - 10 : x + 10}
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

            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-4 text-[10.5px] text-muted-2">
                <div><b className="text-muted">↗ direita, acima:</b> zona de conforto de verdade</div>
                <div><b className="text-muted">↘ direita, abaixo:</b> assiste por hábito, mas não curte</div>
                <div><b className="text-muted">↖ esquerda, acima:</b> gostou do pouco que viu — explore</div>
                <div><b className="text-muted">↙ esquerda, abaixo:</b> realmente não é pra você</div>
            </div>
        </div>
    )
}
