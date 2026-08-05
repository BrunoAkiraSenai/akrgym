import { useState, useEffect, useRef } from 'react'

export default function PageTransition({ activeTab, children }) {
  const [exibindo, setExibindo] = useState(children)
  const [classe, setClasse] = useState('fade-enter-active')
  const [direcao, setDirecao] = useState(1)
  const prevTab = useRef(activeTab)
  const ordemTabs = useRef(['home', 'dieta', 'treinar', 'evolucao', 'configurar'])

  useEffect(() => {
    if (prevTab.current === activeTab) return
    const prevIdx = ordemTabs.current.indexOf(prevTab.current)
    const nextIdx = ordemTabs.current.indexOf(activeTab)
    setDirecao(nextIdx >= prevIdx ? 1 : -1)
    prevTab.current = activeTab
    setClasse('fade-exit-active')
    const timer = setTimeout(() => {
      setExibindo(children)
      setClasse('fade-enter')
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setClasse('fade-enter-active')
        })
      })
    }, 220)
    return () => clearTimeout(timer)
  }, [activeTab])

  // Aplica direção do slide dinamicamente via estilo inline
  const slide = direcao >= 0 ? '28px' : '-28px'
  const slideOut = direcao >= 0 ? '-28px' : '28px'

  return (
    <div
      className={`transition-page ${classe}`}
      style={
        classe === 'fade-enter'
          ? { transform: `translateX(${slide}) scale(0.97)`, opacity: 0 }
          : classe === 'fade-exit-active'
            ? { transform: `translateX(${slideOut}) scale(0.97)`, opacity: 0 }
            : undefined
      }
    >
      {exibindo}
    </div>
  )
}
