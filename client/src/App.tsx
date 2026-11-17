import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import MeuDeck from './pages/MeuDeck.tsx'
import Landing from './pages/Landing'
import RotaProtegida from './components/RotaProtegida'
import Layout from './components/Layout'
import CarregandoPagina from './components/CarregandoPagina'
import LimiteDeErro from './components/LimiteDeErro'
import { ToastProvider } from './contexts/ToastContext'
import { SessaoProvider, useSessao } from './contexts/SessaoContext'
import { CARREGAR } from './lib/rotasPreguicosas'

// Cada página abaixo vira um arquivo JS separado, baixado só quando alguém abre a rota
// (ou quando o mouse passa pelo link no menu: ver lib/rotasPreguicosas.ts).
//
// Antes, o app inteiro era um bundle só: quem abria o Meu Deck baixava e executava
// também o Painel Admin, o editor de imagens (browser-image-compression), o
// react-markdown e o framer-motion (só usados em Detalhes e no Admin). No
// Lighthouse, executar esse bundle era a primeira tarefa longa da página (~1 s) e,
// até ela acabar, nenhuma requisição de dados saía.
//
// MeuDeck e Landing continuam no bundle principal: são as portas de entrada
// (logado e visitante). Separá-las custaria um pedido a mais justo na primeira tela.
const Auth = lazy(CARREGAR.auth)
const Busca = lazy(CARREGAR.busca)
const Detalhes = lazy(CARREGAR.detalhes)
const Calendario = lazy(CARREGAR.calendario)
const Rankings = lazy(CARREGAR.rankings)
const PainelAdmin = lazy(CARREGAR.painelAdmin)
const Estatisticas = lazy(CARREGAR.estatisticas)
const Configuracoes = lazy(CARREGAR.configuracoes)
const Privacidade = lazy(CARREGAR.privacidade)
const Inicio = lazy(CARREGAR.inicio)
const Guilda = lazy(CARREGAR.guilda)
const Personagem = lazy(CARREGAR.personagem)
const Expedicoes = lazy(CARREGAR.expedicoes)
const Masmorras = lazy(CARREGAR.masmorras)
const Invocacao = lazy(CARREGAR.invocacao)
const Membros = lazy(CARREGAR.membros)
const PerfilMembro = lazy(CARREGAR.perfilMembro)
const Loja = lazy(CARREGAR.loja)
const Clas = lazy(CARREGAR.clas)
const ClaDetalhe = lazy(CARREGAR.claDetalhe)
const SalaEstreia = lazy(CARREGAR.salaEstreia)
const Chefao = lazy(CARREGAR.chefao)
const Wrapped = lazy(CARREGAR.wrapped)

// "/" é a Landing para o visitante e a Início para quem está logado.
function RaizDoSite() {
  const { session, carregando } = useSessao()
  if (carregando) return <CarregandoPagina />
  return session ? <Inicio /> : <Landing />
}

function App() {
  const { pathname } = useLocation()
  return (
    <SessaoProvider>
      <ToastProvider>
        {/* Limite de erro das rotas sem Navbar (login, admin, retrospectiva) e do próprio
            Layout. As páginas de dentro do Layout têm o delas, que mantém o menu de pé. */}
        <LimiteDeErro chave={pathname}>
        {/* Este Suspense cobre as rotas sem Navbar (login e admin). As de dentro do
            Layout têm o próprio, em volta do <Outlet />, para a Navbar não piscar. */}
        <Suspense fallback={<CarregandoPagina />}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<RaizDoSite />} />
              <Route path="/descobrir" element={<Busca />} />
              <Route path="/deck" element={<RotaProtegida><MeuDeck /></RotaProtegida>} />
              <Route path="/calendario" element={<RotaProtegida><Calendario /></RotaProtegida>} />
              <Route path="/anime/:id" element={<Detalhes />} />
              <Route path="/rankings" element={<Rankings />} />
              <Route path="/membros" element={<Membros />} />
              <Route path="/u/:handle" element={<PerfilMembro />} />
              <Route path="/privacidade" element={<Privacidade />} />
              <Route path="/meu-gosto" element={<RotaProtegida><Estatisticas /></RotaProtegida>} />
              <Route path="/guilda" element={<RotaProtegida><Guilda /></RotaProtegida>} />
              <Route path="/personagem" element={<RotaProtegida><Personagem /></RotaProtegida>} />
              <Route path="/expedicoes" element={<RotaProtegida><Expedicoes /></RotaProtegida>} />
              <Route path="/masmorras" element={<RotaProtegida><Masmorras /></RotaProtegida>} />
              <Route path="/invocacao" element={<RotaProtegida><Invocacao /></RotaProtegida>} />
              <Route path="/loja" element={<RotaProtegida><Loja /></RotaProtegida>} />
              <Route path="/clas" element={<Clas />} />
              <Route path="/clas/:tag" element={<ClaDetalhe />} />
              <Route path="/sala-estreia/:id" element={<SalaEstreia />} />
              <Route path="/chefao" element={<Chefao />} />
              {/* Endereço antigo da tela, mantido para link salvo e histórico do navegador. */}
              <Route path="/estatisticas" element={<Navigate to="/meu-gosto" replace />} />
              <Route path="/configuracoes" element={<RotaProtegida><Configuracoes /></RotaProtegida>} />
            </Route>

            {/* Rotas independentes (sem Navbar) */}
            <Route path="/login" element={<Auth />} />
            <Route path="/admin" element={<RotaProtegida><PainelAdmin /></RotaProtegida>} />
            <Route path="/wrapped/:ano" element={<RotaProtegida><Wrapped /></RotaProtegida>} />
            <Route path="/u/:handle/wrapped/:ano" element={<Wrapped />} />
          </Routes>
        </Suspense>
        </LimiteDeErro>
      </ToastProvider>
    </SessaoProvider>
  )
}

export default App
