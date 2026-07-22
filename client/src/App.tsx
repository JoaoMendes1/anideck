function App() {
  return (
    // Usa classes flexbox padrão do Tailwind para centralizar o conteúdo 
    <div className="flex min-h-screen items-center justify-center p-4">
      {/* Usa as nossas cores exclusivas 'bg-panel' e 'border-line' configuradas no @theme */}
      <div className="bg-panel border-line border p-8 rounded-2xl text-center shadow-xl">

         {/* Usa a tipografia 'font-anton' e o utilitário 'text-holo' criados por nós */}
           <h1 className="font-anton text-4xl uppercase mb-2">
          Ani<span className="text-holo">Deck</span>
        </h1>

        <p className="text-muted font-mono text-sm">
          Fase 2 inicializada: Setup Frontend e Tailwind v4 prontos.
        </p>
      </div>
    </div>
  )
}

export default App