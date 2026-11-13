// client/src/pages/Chefao.tsx
// Tela do Chefão da Temporada (Fase 17.3, #185)
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Swords,
  Trophy,
  ShieldAlert,
  Award,
  Crown,
  Sparkles,
  Info,
  Calendar,
  Flame,
  CheckCircle2,
} from 'lucide-react'
import { useSessao } from '../contexts/SessaoContext'
import IconeAniCoin from '../components/IconeAniCoin'
import TagCla from '../components/TagCla'
import {
  obterStatusChefao,
  calcularPorcentagemHP,
  obterClasseBarraHP,
  type StatusChefao,
} from '../lib/chefao'
import { formatarTemporada } from '../lib/dataHora'

export default function Chefao() {
  const { session } = useSessao()
  const [chefao, setChefao] = useState<StatusChefao | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true
    async function carregar() {
      try {
        setCarregando(true)
        const dados = await obterStatusChefao()
        if (ativo) setChefao(dados)
      } catch {
        // Falha silenciosa
      } finally {
        if (ativo) setCarregando(false)
      }
    }
    carregar()
    return () => {
      ativo = false
    }
  }, [])

  if (carregando) {
    return (
      <div className="min-h-screen pt-28 pb-16 px-4 max-w-4xl mx-auto flex flex-col items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-coral border-t-transparent animate-spin mb-4" />
        <p className="text-muted text-sm font-mono tracking-wider uppercase">Conectando à Raid da Temporada...</p>
      </div>
    )
  }

  if (!chefao || !chefao.ativo) {
    return (
      <div className="min-h-screen pt-28 pb-16 px-4 max-w-2xl mx-auto text-center">
        <div className="p-8 rounded-3xl bg-panel border border-line shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-panel-2 border border-line flex items-center justify-center text-3xl mx-auto mb-4">
            🐉
          </div>
          <h1 className="font-anton text-2xl uppercase mb-2">Nenhum Chefão Ativo</h1>
          <p className="text-muted text-sm mb-6 leading-relaxed">
            Nenhum chefe de temporada foi despertado no momento. Fique atento às próximas atualizações da comunidade!
          </p>
          <Link
            to="/guilda"
            className="px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider bg-holo-3/20 border border-holo-3/40 text-holo-3 hover:bg-holo-3/30 transition-colors inline-block"
          >
            Voltar para a Guilda
          </Link>
        </div>
      </div>
    )
  }

  const porcentagem = calcularPorcentagemHP(chefao.hp_restante, chefao.hp_total)
  const estiloBarra = obterClasseBarraHP(porcentagem)
  const danoMinimo = chefao.dano_minimo ?? 50
  const meuDano = chefao.meu_dano ?? 0
  const progressoMinimo = Math.min(100, Math.round((meuDano / danoMinimo) * 100))

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 max-w-4xl mx-auto">
      {/* BANNER PRINCIPAL DO CHEFÃO */}
      <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-panel-2 via-panel to-void border border-coral/30 overflow-hidden shadow-2xl mb-8">
        {/* Glow dinâmico */}
        <div className="absolute top-0 right-10 w-80 h-80 bg-coral/15 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-holo-1/10 blur-3xl rounded-full pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-coral bg-coral/15 px-3 py-1 rounded-full border border-coral/30">
                Raid da Temporada · {formatarTemporada(chefao.temporada)}
              </span>
              {chefao.derrotado ? (
                <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase px-3 py-1 rounded-full bg-green/20 border border-green/40 text-green">
                  <Trophy size={13} /> Derrotado pela Comunidade!
                </span>
              ) : chefao.status === 'escapou' ? (
                <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase px-3 py-1 rounded-full bg-panel-2 border border-line text-muted">
                  O Chefão Escapou
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase px-3 py-1 rounded-full bg-coral/20 border border-coral/40 text-coral animate-pulse">
                  <Swords size={13} /> Batalha em Andamento
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs font-mono text-muted">
              <Calendar size={13} />
              <span>Temporada {chefao.temporada}</span>
            </div>
          </div>

          {/* Nome e Arte */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6 my-4 text-center sm:text-left">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-coral/30 to-panel-2 border-2 border-coral/50 flex items-center justify-center text-5xl shadow-[0_0_30px_rgba(244,63,94,0.25)] shrink-0">
              {chefao.arte_url || '🐉'}
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-mono text-xs text-coral tracking-widest uppercase mb-1">
                {chefao.titulo || '// Inimigo Mundial'}
              </p>
              <h1 className="font-anton text-3xl sm:text-4xl lg:text-5xl uppercase tracking-wide text-text m-0 mb-3 drop-shadow-md">
                {chefao.nome}
              </h1>
              <p className="text-muted text-sm sm:text-base leading-relaxed m-0 max-w-2xl font-sans">
                {chefao.descricao}
              </p>
            </div>
          </div>

          {/* BARRA DE HP GIGANTE */}
          <div className="mt-8 pt-6 border-t border-line/60">
            <div className="flex items-end justify-between gap-2 mb-2 font-mono">
              <div className="flex items-center gap-2">
                <ShieldAlert size={18} className="text-coral" />
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-muted">
                  Vida Coletiva do Monstro
                </span>
              </div>
              <div className="text-right">
                <span className={`text-base sm:text-xl font-black ${estiloBarra.texto}`}>
                  {(chefao.hp_restante ?? 0).toLocaleString('pt-BR')} / {(chefao.hp_total ?? 0).toLocaleString('pt-BR')}
                </span>
                <span className="text-xs text-muted ml-2">({porcentagem}%)</span>
              </div>
            </div>

            <div className="h-5 sm:h-6 w-full bg-void/90 rounded-full overflow-hidden p-1 border border-line shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${estiloBarra.barra}`}
                style={{ width: `${porcentagem}%` }}
              />
            </div>

            <div className="flex items-center justify-between gap-2 mt-2 text-[11px] font-mono text-muted">
              <span>Dano total acumulado: {(chefao.dano_total ?? 0).toLocaleString('pt-BR')} HP</span>
              <span>Alvo: {(chefao.hp_total ?? 0).toLocaleString('pt-BR')} HP</span>
            </div>
          </div>
        </div>
      </div>

      {/* GRADE COM SEU ATAQUE E RECOMPENSAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        {/* CARD: SEU ATAQUE */}
        <div className="p-5 sm:p-6 rounded-2xl bg-panel border border-line shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Flame size={18} className="text-coral" />
                <h2 className="font-anton text-lg uppercase text-text m-0">Sua Contribuição</h2>
              </div>
              {session && (
                chefao.elegivel_recompensa ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-green bg-green/15 px-2.5 py-0.5 rounded-full border border-green/30">
                    <CheckCircle2 size={12} /> Meta Atingida
                  </span>
                ) : (
                  <span className="text-[11px] font-mono text-muted">
                    Meta: {danoMinimo} HP
                  </span>
                )
              )}
            </div>

            {!session ? (
              <div className="my-4 text-center p-4 rounded-xl bg-panel-2 border border-line">
                <p className="text-xs text-muted mb-3">
                  Entre na sua conta para marcar episódios assistidos e causar dano coletivo na raid da temporada.
                </p>
                <Link
                  to="/login"
                  className="inline-block px-4 py-2 rounded-full font-bold text-xs uppercase tracking-wider bg-holo-1 text-void hover:opacity-90 transition-opacity"
                >
                  Entrar para lutar
                </Link>
              </div>
            ) : (
              <div className="my-4">
                <div className="flex items-baseline justify-between mb-1.5 font-mono">
                  <span className="text-xs text-muted">Dano Causado:</span>
                  <span className="text-2xl font-black text-text">{meuDano.toLocaleString('pt-BR')} HP</span>
                </div>

                <div className="h-2.5 w-full bg-void rounded-full overflow-hidden border border-line">
                  <div
                    className="h-full bg-gradient-to-r from-coral to-gold rounded-full transition-all duration-500"
                    style={{ width: `${progressoMinimo}%` }}
                  />
                </div>

                <p className="text-xs text-muted leading-relaxed mt-3 mb-0">
                  {chefao.elegivel_recompensa ? (
                    <span className="text-gold font-bold">
                      Parabéns! Você atingiu o requisito mínimo de dano e receberá a recompensa quando o Chefão for derrotado.
                    </span>
                  ) : (
                    <span>
                      Cause mais <strong className="text-text">{Math.max(0, danoMinimo - meuDano)} de dano</strong> nesta temporada para se qualificar para as recompensas coletivas.
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-line/60 flex items-center gap-2 text-[11.5px] text-muted-2">
            <Info size={14} className="shrink-0 text-holo-3" />
            <span>Como bater? Cada episódio que você assiste converte o XP ganho em dano direto.</span>
          </div>
        </div>

        {/* CARD: RECOMPENSAS DA RAID */}
        <div className="p-5 sm:p-6 rounded-2xl bg-panel border border-line shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Award size={18} className="text-gold" />
              <h2 className="font-anton text-lg uppercase text-text m-0">Recompensas da Vitória</h2>
            </div>

            <p className="text-xs text-muted leading-relaxed mb-4">
              Se a comunidade reduzir o HP do monstro a zero antes do fim da temporada, todos os membros qualificados ganham:
            </p>

            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-panel-2 border border-gold/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gold/20 flex items-center justify-center text-gold">
                    <IconeAniCoin size={18} />
                  </div>
                  <div>
                    <span className="block font-bold text-sm text-text">AniCoins</span>
                    <span className="text-[11px] text-muted">Moeda da loja cosmética</span>
                  </div>
                </div>
                <span className="font-mono text-base font-black text-gold">
                  +{chefao.recompensa_anicoins ?? 100} ₳
                </span>
              </div>

              {chefao.titulo_recompensa && (
                <div className="p-3 rounded-xl bg-panel-2 border border-holo-3/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-holo-3/20 flex items-center justify-center text-holo-3">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <span className="block font-bold text-sm text-text">Título Exclusivo</span>
                      <span className="text-[11px] text-muted">Exibido no perfil da guilda</span>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-holo-3 px-2 py-0.5 rounded-md bg-holo-3/10 border border-holo-3/30">
                    &quot;{chefao.titulo_recompensa}&quot;
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-line/60 text-[11px] text-muted-2">
            Recompensa creditada automaticamente no fechamento da derrota.
          </div>
        </div>
      </div>

      {/* RANKING DOS MAIORES ATACANTES (MVP DA RAID) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-panel border border-line shadow-lg">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Crown size={18} className="text-gold" />
            <h2 className="font-anton text-lg sm:text-xl uppercase text-text m-0">
              Vanguarda da Batalha (Top Atacantes)
            </h2>
          </div>
          <span className="text-xs font-mono text-muted">Top 5 MVP</span>
        </div>

        {chefao.top_atacantes && chefao.top_atacantes.length > 0 ? (
          <div className="divide-y divide-line/60">
            {chefao.top_atacantes.map((atacante, idx) => (
              <div key={atacante.user_id} className="py-3 flex items-center justify-between gap-3 first:pt-1 last:pb-1">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-6 text-center font-mono text-xs font-bold ${
                      idx === 0 ? 'text-gold text-sm' : idx === 1 ? 'text-text' : idx === 2 ? 'text-coral' : 'text-muted'
                    }`}
                  >
                    #{idx + 1}
                  </span>

                  <div className="w-9 h-9 rounded-full bg-panel-2 border border-line flex items-center justify-center text-xs font-bold text-holo-3 shrink-0 overflow-hidden">
                    {atacante.avatar_url ? (
                      <img src={atacante.avatar_url} alt={atacante.nome} className="w-full h-full object-cover" />
                    ) : (
                      (atacante.nome || 'Membro').charAt(0).toUpperCase()
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Link
                        to={atacante.handle ? `/u/${atacante.handle}` : '#'}
                        className="font-bold text-sm text-text hover:text-holo-3 transition-colors truncate"
                      >
                        {atacante.nome || 'Membro'}
                      </Link>
                      {atacante.cla_tag && <TagCla tag={atacante.cla_tag} />}
                    </div>
                    {atacante.handle && (
                      <span className="text-[11px] font-mono text-muted">@{atacante.handle}</span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono text-sm sm:text-base font-black text-coral">
                    {atacante.dano.toLocaleString('pt-BR')}
                  </span>
                  <span className="block text-[10px] font-mono text-muted uppercase">Dano Causado</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted text-xs font-mono">
            Nenhum dano registrado nesta temporada ainda. Assista animes para ser o primeiro no pódio!
          </div>
        )}
      </div>
    </div>
  )
}
