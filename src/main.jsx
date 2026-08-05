import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { applyStoredTheme } from './utils/themes'
import App from './App.jsx'

applyStoredTheme()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
