// client/src/components/social/ItemDeAtividade.tsx
// Uma linha do feed ou da atividade do perfil: quem, o que fez, em qual anime e quando. Em
// comentário e curtida, o texto aparece citado; se quem olha ainda não viu o episódio, o
// banco não manda o texto, e a linha diz o que falta para ler.
import { Link } from 'react-router-dom'
import { CheckCircle2, Eye, Heart, MessageCircle, Lock } from 'lucide-react'
import AvatarMontavel from '../AvatarMontavel'
import TextoComSpoiler from '../comunidade/TextoComSpoiler'
import { textoTemSpoilerInline } from '../../lib/spoiler'
import { filtroDoVisual, retratoDoEstagio } from '../../lib/personagem'
import { fraseDoEvento, linkDoEvento, tempoDoEvento, type CapaDoAnime, type EventoDeAtividade } from '../../lib/social'

const ICONE = {
  episodios: { Icone: Eye, cor: 'text-holo-3' },
  completou: { Icone: CheckCircle2, cor: 'text-green' },
  comentou: { Icone: MessageCircle, cor: 'text-mana' },
  curtiu: { Icone: Heart, cor: 'text-coral' },
} as const

interface Props {
  evento: EventoDeAtividade
  capa?: CapaDoAnime
  /** No perfil, o autor é sempre o dono: o avatar e o nome sobram. */
  semAutor?: boolean
  agora?: number
}

export default function ItemDeAtividade({ evento: e, capa, semAutor = false, agora }: Props) {
  const { Icone, cor } = ICONE[e.tipo] ?? ICONE.episodios
  const titulo = e.titulo || capa?.titulo || `Anime #${e.mal_id}`
  const link = linkDoEvento(e)
  const temComentario = e.tipo === 'comentou' || e.tipo === 'curtiu'
  const precisaSpoiler = Boolean(e.contem_spoiler) || textoTemSpoilerInline(e.texto)

  return (
    <li className="flex gap-3 py-3.5 border-b border-line/60 last:border-b-0">
      {semAutor ? (
        <span className={`w-9 h-9 shrink-0 grid place-items-center rounded-full bg-panel-2 border border-line ${cor}`} aria-hidden>
          <Icone size={16} />
        </span>
      ) : (
        <Link to={`/u/${e.autor.handle}`} className="shrink-0 relative block w-10 h-10" aria-label={`Perfil de ${e.autor.nome}`}>
          <AvatarMontavel
            avatar={e.autor.avatar ?? null}
            retrato={retratoDoEstagio(e.autor.estagio, e.autor.personagem_base)}
            filtro={filtroDoVisual(e.autor.estagio)}
            nome={e.autor.nome}
            tamanho={40}
          />
          <span className={`absolute -bottom-1 -right-1 w-5 h-5 grid place-items-center rounded-full bg-void border border-line ${cor}`} aria-hidden>
            <Icone size={11} />
          </span>
        </Link>
      )}

      <div className="min-w-0 flex-1">
        <p className="m-0 text-sm leading-snug text-muted">
          {!semAutor && (
            <>
              <Link to={`/u/${e.autor.handle}`} className="font-bold text-text hover:text-holo-3">{e.autor.nome}</Link>{' '}
            </>
          )}
          {fraseDoEvento(e)}{' '}
          <Link to={link} className="font-bold text-text hover:text-holo-3">{titulo}</Link>
        </p>

        {temComentario && (
          e.texto ? (
            precisaSpoiler ? (
              <div className="mt-1.5 px-3 py-2 rounded-xl bg-panel-2/70 border border-line/70">
                <TextoComSpoiler texto={e.texto} contemSpoiler={Boolean(e.contem_spoiler)} compacto aspas />
                <Link to={link} className="inline-block mt-1.5 font-mono text-xs text-holo-3 hover:underline">
                  Ver na conversa →
                </Link>
              </div>
            ) : (
              <Link to={link} className="block mt-1.5 px-3 py-2 rounded-xl bg-panel-2/70 border border-line/70 text-sm text-text leading-snug break-words hover:border-holo-3/50">
                “{e.texto}”
              </Link>
            )
          ) : (
            <Link to={link} className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-panel-2/40 border border-dashed border-line text-xs text-muted hover:text-text">
              <Lock size={12} aria-hidden /> Assista ao ep {e.episodio} para ler, sem spoiler
            </Link>
          )
        )}

        <time dateTime={e.quando} className="block mt-1 font-mono text-xs text-muted-2">{tempoDoEvento(e.quando, agora)}</time>
      </div>

      {capa?.imagem && (
        <Link to={link} className="shrink-0 w-11 h-16 rounded-lg overflow-hidden border border-line bg-panel-2" tabIndex={-1} aria-hidden>
          <img src={capa.imagem} alt="" loading="lazy" className="w-full h-full object-cover" />
        </Link>
      )}
    </li>
  )
}
