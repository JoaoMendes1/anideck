// client/src/components/TagCla.tsx
// Badge de exibição da tag do Clã [TAG] (Fase 17, #180).
import { Link } from 'react-router-dom'
import { EMBLEMAS_CLA, renderIconeEmblema } from '../lib/clas'

interface TagClaProps {
  tag: string
  emblema?: string
  comLink?: boolean
  className?: string
}

export default function TagCla({ tag, emblema, comLink = true, className = '' }: TagClaProps) {
  if (!tag) return null

  const limpa = tag.toUpperCase().trim()
  const conf = emblema ? EMBLEMAS_CLA[emblema] : null
  const pillStyle = conf ? conf.classePill : 'bg-holo-3/10 border-holo-3/30 text-holo-3 hover:border-holo-3/60'

  const content = (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-mono font-black tracking-wider uppercase select-none transition-colors ${pillStyle} ${className}`}
      title={`Clã [${limpa}]`}
    >
      {emblema && renderIconeEmblema(emblema, 11)}
      <span>[{limpa}]</span>
    </span>
  )

  if (comLink) {
    return (
      <Link to={`/clas/${limpa}`} onClick={(e) => e.stopPropagation()}>
        {content}
      </Link>
    )
  }

  return content
}
