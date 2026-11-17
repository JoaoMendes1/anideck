// client/src/lib/missoes.ts
// Textos das missões que não dependem de React.

/** Texto do prazo das missões da semana: "termina em 3 dias", "termina em 5h". */
export function textoDoPrazo(fimIso: string, agora = new Date()): string {
  const fim = new Date(fimIso)
  if (Number.isNaN(fim.getTime())) return ''
  const horas = (fim.getTime() - agora.getTime()) / 3_600_000
  if (horas <= 0) return 'trocando agora'
  if (horas < 24) return `termina em ${Math.max(1, Math.ceil(horas))}h`
  const dias = Math.ceil(horas / 24)
  return `termina em ${dias} ${dias === 1 ? 'dia' : 'dias'}`
}
