import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { applyStoredTheme } from './utils/themes'
import App from './App.jsx'

applyStoredTheme()
// Marca o aparelho como de quem usa o app: a página inicial "/" manda direto para "/app".
try { localStorage.setItem('akrgym-app', '1') } catch { /* Sem armazenamento, a "/" mostra a apresentação. */ }

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
