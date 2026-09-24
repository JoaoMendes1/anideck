// Aparece enquanto o código de uma página ainda está chegando (ver o lazy() no App.tsx).
// Na prática, só na primeira visita a cada página: depois o navegador já tem o
// arquivo, e o React Router mantém a tela anterior visível durante a troca.
export default function CarregandoPagina() {
  return <div className="p-10 text-center text-muted font-mono text-sm">Carregando...</div>
}
