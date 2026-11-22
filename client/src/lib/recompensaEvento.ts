// client/src/lib/recompensaEvento.ts
// Coordena o toast contextual de ações (marcar episódio, concluir maratona/missão) com o
// PilulaGuilda, evitando que o jogador receba duas notificações para a mesma recompensa.

let ultimoAvisoContextualEm = 0

export function marcarRecompensaContextual(agora = Date.now()) {
  ultimoAvisoContextualEm = agora
}

export function recompensaContextualRecente(janelaMs = 6000, agora = Date.now()): boolean {
  return ultimoAvisoContextualEm > 0 && agora - ultimoAvisoContextualEm < janelaMs
}

export function resetarRecompensaContextual() {
  ultimoAvisoContextualEm = 0
}
