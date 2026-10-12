import { useState } from 'react'

const ORDEM_TABS = ['home', 'dieta', 'treinar', 'evolucao', 'configurar']

// A tela nova entra na hora, com um deslize curto no sentido da navegação.
// Esperar a tela antiga sair deixava cada toque na barra com tempo morto.
export default function PageTransition({ activeTab, children }) {
  const [estado, setEstado] = useState({ tab: activeTab, direcao: 0 })
  if (estado.tab !== activeTab) {
    const direcao = ORDEM_TABS.indexOf(activeTab) >= ORDEM_TABS.indexOf(estado.tab) ? 1 : -1
    setEstado({ tab: activeTab, direcao })
  }

  return (
    <div
      key={estado.tab}
      className={`transition-page${estado.direcao ? ' page-enter' : ''}`}
      style={{ '--page-shift': `${estado.direcao * 12}px` }}
    >
      {children}
    </div>
  )
}
