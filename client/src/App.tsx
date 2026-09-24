import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import MeuDeck from './pages/MeuDeck.tsx'
import Landing from './pages/Landing'
import RotaProtegida from './components/RotaProtegida'
import Layout from './components/Layout'
import CarregandoPagina from './components/CarregandoPagina'
import { ToastProvider } from './contexts/ToastContext'
import { SessaoProvider } from './contexts/SessaoContext'

// Cada página abaixo vira um arquivo JS separado, baixado só quando alguém abre a rota.
//
// Antes, o app inteiro era um bundle só: quem abria o Meu Deck baixava e executava
// também o Painel Admin, o editor de imagens (browser-image-compression), o
// react-markdown e o framer-motion (só usados em Detalhes e no Admin). No
// Lighthouse, executar esse bundle era a primeira tarefa longa da página (~1 s) e,
// até ela acabar, nenhuma requisição de dados saía.
//
// MeuDeck e Landing continuam no bundle principal: são as portas de entrada
// (logado e visitante). Separá-las custaria um pedido a mais justo na primeira tela.
const Auth = lazy(() => import('./pages/Auth'))
const Busca = lazy(() => import('./pages/Busca'))
const Detalhes = lazy(() => import('./pages/Detalhes'))
const Calendario = lazy(() => import('./pages/Calendario'))
const Rankings = lazy(() => import('./pages/Rankings'))
const PainelAdmin = lazy(() => import('./pages/PainelAdmin'))
const Estatisticas = lazy(() => import('./pages/Estatisticas'))
const Configuracoes = lazy(() => import('./pages/Configuracoes'))
const Privacidade = lazy(() => import('./pages/Privacidade'))

function App() {
  return (
    <SessaoProvider>
      <ToastProvider>
        {/* Este Suspense cobre as rotas sem Navbar (login e admin). As de dentro do
            Layout têm o próprio, em volta do <Outlet />, para a Navbar não piscar. */}
        <Suspense fallback={<CarregandoPagina />}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Landing />} />
              <Route path="/descobrir" element={<Busca />} />
              <Route path="/deck" element={<RotaProtegida><MeuDeck /></RotaProtegida>} />
              <Route path="/calendario" element={<RotaProtegida><Calendario /></RotaProtegida>} />
              <Route path="/anime/:id" element={<Detalhes />} />
              <Route path="/rankings" element={<Rankings />} />
              <Route path="/privacidade" element={<Privacidade />} />
              <Route path="/estatisticas" element={<RotaProtegida><Estatisticas /></RotaProtegida>} />
              <Route path="/configuracoes" element={<RotaProtegida><Configuracoes /></RotaProtegida>} />
            </Route>

            {/* Rotas independentes (sem Navbar) */}
            <Route path="/login" element={<Auth />} />
            <Route path="/admin" element={<RotaProtegida><PainelAdmin /></RotaProtegida>} />
          </Routes>
        </Suspense>
      </ToastProvider>
    </SessaoProvider>
  )
}

export default App
