import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

export default function Layout() {
  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Background global definido no index.css */}
      <div className="bg-ambient"></div>

      <Navbar />

      {/* O conteúdo da página vai renderizar aqui.
          Foi colocado um padding top (pt-24) genérico para compensar a Navbar fixa,
          mas algumas páginas como Detalhes podem querer ignorar isso para fazer a
          imagem colar no topo (ajustaremos nessas páginas específicas). */}
      <main className="relative z-10 flex-1 flex flex-col pt-24">
        <Outlet />
      </main>
    </div>
  )
}