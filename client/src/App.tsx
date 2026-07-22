import { Routes, Route } from 'react-router-dom'
import Auth from './pages/Auth'

const BuscaPlaceHolder = () => (
  <div className="p-10 text-center">
    <h1 className="text-2xl font-anton text-holo">Buscador de Animes (Pública)</h1>
  </div>
)

const DashboardPlaceHolder = () => (
  <div className="p-10 text-center">
    <h1 className="text-2xl font-anton text-green">Meu Deck (Privada)</h1>
  </div>
)

function App() {
  return (
    <Routes>
      {/* Rota pública inicial */}
      <Route path="/" element={<BuscaPlaceHolder />} />

      {/* Nova Rota Real de Autenticação */}
      <Route path="/login" element={<Auth />} />

      {/* Rota do Deck do usuário (em breve protegeremos essa rota) */}
      <Route path="/deck" element={<DashboardPlaceHolder />} />
    </Routes>
  )
}

export default App