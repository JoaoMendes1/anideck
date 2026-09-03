import { Routes, Route } from 'react-router-dom'
import Auth from './pages/Auth'
import Busca from './pages/Busca'
import Detalhes from './pages/Detalhes'
import MeuDeck from './pages/MeuDeck.tsx'
import Calendario from './pages/Calendario'
import RotaProtegida from './components/RotaProtegida'
import Rankings from './pages/Rankings'
import PainelAdmin from './pages/PainelAdmin'
import Layout from './components/Layout'
import { ToastProvider } from './contexts/ToastContext'
import { SessaoProvider } from './contexts/SessaoContext'
import Landing from './pages/Landing'
import Estatisticas from './pages/Estatisticas'
import Configuracoes from './pages/Configuracoes'
import Privacidade from './pages/Privacidade'

function App() {
  return (
    <SessaoProvider>
      <ToastProvider>
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
      </ToastProvider>
    </SessaoProvider>
  )
}

export default App