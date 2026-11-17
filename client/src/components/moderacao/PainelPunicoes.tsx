// client/src/components/moderacao/PainelPunicoes.tsx
// Painel Admin › Moderação: denúncias de perfil e de avaliação, punição por @ (com a
// tabela de gravidade preenchendo o formulário) e histórico de punições de cada membro.
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Gavel, Loader2, RotateCcw, Search } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import {
  aplicarPunicao,
  decidirDenuncia,
  historicoPunicoes,
  listarDenuncias,
  MOTIVOS_DENUNCIA,
  PADRAO_POR_GRAVIDADE,
  revogarPunicao,
  ROTULO_GRAVIDADE,
  ROTULO_PUNICAO,
  type DenunciaAdmin,
  type Gravidade,
  type PunicaoRegistrada,
  type TipoPunicao,
} from '../../lib/moderacao'

const campo = 'w-full bg-panel-2 border border-line rounded-lg px-3 py-2 text-sm text-text'
const rotuloMotivo = (m: string) => MOTIVOS_DENUNCIA.find(x => x.id === m)?.rotulo ?? m

export default function PainelPunicoes() {
  const { showToast } = useToast()
  const [denuncias, setDenuncias] = useState<DenunciaAdmin[] | null>(null)

  // Formulário de punição
  const [handle, setHandle] = useState('')
  const [gravidade, setGravidade] = useState<Gravidade>('leve')
  const [tipo, setTipo] = useState<TipoPunicao>(PADRAO_POR_GRAVIDADE.leve.tipo)
  const [motivo, setMotivo] = useState('')
  const [anicoins, setAnicoins] = useState(String(PADRAO_POR_GRAVIDADE.leve.anicoins))
  const [xp, setXp] = useState(String(PADRAO_POR_GRAVIDADE.leve.xp))
  const [dias, setDias] = useState('')
  const [denunciaId, setDenunciaId] = useState<string | undefined>()
  const [aplicando, setAplicando] = useState(false)

  // Histórico
  const [historico, setHistorico] = useState<PunicaoRegistrada[] | null>(null)
  const [handleHistorico, setHandleHistorico] = useState('')

  const carregar = useCallback(() => {
    listarDenuncias().then(setDenuncias).catch(() => setDenuncias([]))
  }, [])
  useEffect(carregar, [carregar])

  const escolherGravidade = (g: Gravidade) => {
    const p = PADRAO_POR_GRAVIDADE[g]
    setGravidade(g)
    setTipo(p.tipo)
    setAnicoins(String(p.anicoins))
    setXp(String(p.xp))
    setDias(p.dias === null ? '' : String(p.dias))
  }

  const punirDenuncia = (d: DenunciaAdmin) => {
    setHandle(d.alvo?.handle ?? '')
    setMotivo(`${rotuloMotivo(d.motivo)}${d.detalhe ? `: ${d.detalhe}` : ''}`)
    setDenunciaId(d.id)
    document.getElementById('form-punicao')?.scrollIntoView({ behavior: 'smooth' })
  }

  const verHistorico = async (h: string) => {
    setHandleHistorico(h)
    try {
      setHistorico(await historicoPunicoes(h))
    } catch (e) {
      setHistorico(null)
      showToast((e as Error).message, 'error')
    }
  }

  const aplicar = async () => {
    if (!handle.trim()) return showToast('Informe o @ do membro.', 'error')
    setAplicando(true)
    const erro = await aplicarPunicao({
      handle: handle.trim(), tipo, gravidade, motivo: motivo.trim(),
      anicoins: tipo === 'multa' ? Number(anicoins) || 0 : 0,
      xp: tipo === 'multa' ? Number(xp) || 0 : 0,
      dias: (tipo === 'silenciar' || tipo === 'banir') && dias ? Number(dias) : null,
      denuncia_id: denunciaId,
    })
    setAplicando(false)
    if (erro) return showToast(erro, 'error')
    showToast(`${ROTULO_PUNICAO[tipo]} aplicada em @${handle.trim().replace(/^@/, '')}.`)
    setDenunciaId(undefined)
    setMotivo('')
    carregar()
    verHistorico(handle.trim())
  }

  const descartar = async (d: DenunciaAdmin) => {
    const erro = await decidirDenuncia(d.id, 'descartada', 'Sem violação')
    if (erro) return showToast(erro, 'error')
    carregar()
  }

  const revogar = async (p: PunicaoRegistrada) => {
    const erro = await revogarPunicao(p.id)
    if (erro) return showToast(erro, 'error')
    showToast('Punição revogada.')
    verHistorico(handleHistorico)
  }

  const comDias = tipo === 'silenciar' || tipo === 'banir'

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-panel p-4 sm:p-5">
        <h3 className="font-anton text-lg uppercase m-0 mb-3">Denúncias de perfil e avaliação</h3>
        {denuncias === null ? (
          <Loader2 className="animate-spin text-muted" aria-label="Carregando" />
        ) : denuncias.length === 0 ? (
          <p className="m-0 text-sm text-muted">Nenhuma denúncia pendente.</p>
        ) : (
          <ul className="m-0 p-0 list-none space-y-3">
            {denuncias.map(d => (
              <li key={d.id} className="rounded-xl border border-line bg-panel-2 p-3">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-muted mb-1">
                  <span className="px-2 py-0.5 rounded-full bg-coral/15 text-coral font-bold">{rotuloMotivo(d.motivo)}</span>
                  <span>{d.alvo_tipo === 'perfil' ? 'Perfil' : 'Avaliação'}</span>
                  <span>· de @{d.denunciante?.handle ?? '?'}</span>
                  <span>· {new Date(d.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="m-0 text-sm">
                  Contra{' '}
                  {d.alvo?.handle ? <Link to={`/u/${d.alvo.handle}`} className="font-bold text-holo-3">@{d.alvo.handle}</Link> : <b>membro sem perfil</b>}
                  {d.alvo?.nome && <span className="text-muted"> ({d.alvo.nome})</span>}
                </p>
                {d.detalhe && <p className="m-0 mt-1 text-sm text-muted">“{d.detalhe}”</p>}
                {d.avaliacao?.texto && (
                  <p className="m-0 mt-2 p-2 rounded-lg bg-void/50 text-xs text-muted line-clamp-4">{d.avaliacao.texto}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  <button type="button" onClick={() => punirDenuncia(d)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-coral/15 text-coral border border-coral/40 cursor-pointer">Punir</button>
                  <button type="button" onClick={() => descartar(d)} className="px-3 py-1.5 rounded-lg text-xs font-bold border border-line text-muted cursor-pointer">Descartar</button>
                  {d.alvo?.handle && (
                    <button type="button" onClick={() => verHistorico(d.alvo!.handle!)} className="px-3 py-1.5 rounded-lg text-xs font-bold border border-line text-muted cursor-pointer">Histórico</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="form-punicao" className="rounded-2xl border border-coral/30 bg-panel p-4 sm:p-5">
        <h3 className="font-anton text-lg uppercase m-0 mb-1 inline-flex items-center gap-2"><Gavel size={18} className="text-coral" /> Aplicar punição</h3>
        <p className="m-0 mb-4 text-xs text-muted">A gravidade preenche uma sugestão; ajuste o que quiser antes de aplicar. O motivo aparece para a pessoa.</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="block text-xs font-bold text-muted mb-1">@ do membro</span>
            <input value={handle} onChange={e => setHandle(e.target.value)} className={campo} placeholder="beto" />
          </label>
          <div>
            <span className="block text-xs font-bold text-muted mb-1">Gravidade</span>
            <div className="grid grid-cols-4 gap-1">
              {(Object.keys(ROTULO_GRAVIDADE) as Gravidade[]).map(g => (
                <button key={g} type="button" aria-pressed={gravidade === g} onClick={() => escolherGravidade(g)}
                  className={`px-1 py-2 rounded-lg text-xs font-bold border cursor-pointer ${gravidade === g ? 'border-coral bg-coral/15 text-coral' : 'border-line text-muted'}`}>
                  {ROTULO_GRAVIDADE[g]}
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="block text-xs font-bold text-muted mb-1">Punição</span>
            <select value={tipo} onChange={e => setTipo(e.target.value as TipoPunicao)} className={campo}>
              {(Object.keys(ROTULO_PUNICAO) as TipoPunicao[]).map(t => <option key={t} value={t}>{ROTULO_PUNICAO[t]}</option>)}
            </select>
          </label>
          {comDias && (
            <label className="block">
              <span className="block text-xs font-bold text-muted mb-1">Dias (vazio = sem fim)</span>
              <input type="number" min={1} inputMode="numeric" value={dias} onChange={e => setDias(e.target.value)} className={campo} />
            </label>
          )}
          {tipo === 'multa' && (
            <>
              <label className="block">
                <span className="block text-xs font-bold text-muted mb-1">AniCoins</span>
                <input type="number" min={0} inputMode="numeric" value={anicoins} onChange={e => setAnicoins(e.target.value)} className={campo} />
              </label>
              <label className="block">
                <span className="block text-xs font-bold text-muted mb-1">XP</span>
                <input type="number" min={0} inputMode="numeric" value={xp} onChange={e => setXp(e.target.value)} className={campo} />
              </label>
            </>
          )}
          <label className="block sm:col-span-2">
            <span className="block text-xs font-bold text-muted mb-1">Motivo</span>
            <textarea value={motivo} maxLength={300} rows={2} onChange={e => setMotivo(e.target.value)} className={campo} />
          </label>
        </div>
        {tipo === 'bloqueio_email' && (
          <p className="mt-3 mb-0 text-xs text-coral">Bloqueia o e-mail da conta para novos cadastros (variações com ponto e +apelido também). Combine com Banir para tirar o acesso atual.</p>
        )}
        {denunciaId && <p className="mt-3 mb-0 text-xs text-muted">Vinculada a uma denúncia: ela será marcada como resolvida.</p>}
        <button type="button" disabled={aplicando} onClick={aplicar}
          className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-coral text-void disabled:opacity-60 cursor-pointer">
          {aplicando && <Loader2 size={15} className="animate-spin" />} Aplicar {ROTULO_PUNICAO[tipo].toLowerCase()}
        </button>
      </section>

      <section className="rounded-2xl border border-line bg-panel p-4 sm:p-5">
        <h3 className="font-anton text-lg uppercase m-0 mb-3">Histórico de punições</h3>
        <form onSubmit={e => { e.preventDefault(); if (handleHistorico.trim()) verHistorico(handleHistorico.trim()) }} className="flex gap-2 mb-3">
          <input value={handleHistorico} onChange={e => setHandleHistorico(e.target.value)} className={campo} placeholder="@ do membro" />
          <button type="submit" className="px-3 rounded-lg border border-line text-muted cursor-pointer" aria-label="Buscar histórico"><Search size={15} /></button>
        </form>
        {historico && (historico.length === 0 ? (
          <p className="m-0 text-sm text-muted">Nenhuma punição registrada.</p>
        ) : (
          <ul className="m-0 p-0 list-none space-y-2">
            {historico.map(p => (
              <li key={p.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line p-3 ${p.revogada_em ? 'opacity-50' : ''}`}>
                <span className="text-sm">
                  <b>{ROTULO_PUNICAO[p.tipo]}</b> · {ROTULO_GRAVIDADE[p.gravidade]}
                  {p.tipo === 'multa' && <span className="text-muted"> · −{p.anicoins} ₳ · −{p.xp} XP</span>}
                  {p.ate && <span className="text-muted"> · até {new Date(p.ate).toLocaleDateString('pt-BR')}</span>}
                  <span className="block text-xs text-muted">{p.motivo} · {new Date(p.created_at).toLocaleDateString('pt-BR')}{p.revogada_em ? ' · revogada' : ''}</span>
                </span>
                {!p.revogada_em && p.tipo !== 'advertencia' && (
                  <button type="button" onClick={() => revogar(p)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border border-line text-muted cursor-pointer">
                    <RotateCcw size={12} /> Revogar
                  </button>
                )}
              </li>
            ))}
          </ul>
        ))}
      </section>
    </div>
  )
}
