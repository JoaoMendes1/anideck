import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Importando BrowserRouter, que é o motor de rotas para web
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Envelopamos o App com o BrowserRouter.
        A partir de agora, o React sabe ler a URL do navegador. */}
        <BrowserRouter>
          <App />
        </BrowserRouter>
  </StrictMode>,
)
