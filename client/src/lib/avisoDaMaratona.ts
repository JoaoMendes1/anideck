// client/src/lib/avisoDaMaratona.ts
// O aviso antes de marcar um episódio cedo demais durante a maratona, usado pela grade de
// episódios e pelo botão de próximo episódio.
import type { OpcoesDeConfirmacao } from '../components/DialogoConfirmacao'
import { formatarDuracao, segundosParaLiberar } from './maratona'

/** Pergunta antes de marcar cedo demais durante uma maratona; true é seguir marcando. */
export async function confirmarMarcacaoNaMaratona(
  malId: number,
  episodio: number,
  confirmar: (o: OpcoesDeConfirmacao) => Promise<boolean>,
): Promise<boolean> {
  const falta = segundosParaLiberar(malId, episodio)
  if (falta <= 0) return true
  return confirmar({
    titulo: 'Marcar agora perde a maratona',
    mensagem: `Ainda faltam ${formatarDuracao(falta)} para liberar o próximo episódio da maratona. Se marcar agora, a maratona deste anime termina sem prêmio.`,
    rotuloConfirmar: 'Marcar mesmo assim',
    rotuloCancelar: 'Esperar',
    perigoso: true,
  })
}
