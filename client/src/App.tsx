import { Routes, Route } from 'react-router-dom'
import Auth from './pages/Auth'
import Busca from './pages/Busca'
import Detalhes from './pages/Detalhes'
import MeuDeck from './pages/MeuDeck.tsx'
import RotaProtegida from './components/RotaProtegida'
import Rankings from './pages/Rankings'
import PainelAdmin from './pages/PainelAdmin'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Busca />} />
      <Route path="/login" element={<Auth />} />
      <Route path="/deck" element={<RotaProtegida><MeuDeck /></RotaProtegida>} />
      <Route path="/anime/:id" element={<Detalhes />} />
      <Route path="/rankings" element={<Rankings />} />
      <Route path="/admin" element={<RotaProtegida><PainelAdmin /></RotaProtegida>} />
    </Routes>
  )
}

export default App