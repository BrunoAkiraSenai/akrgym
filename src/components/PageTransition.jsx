import { useState, useEffect, useRef } from 'react'

export default function PageTransition({ activeTab, children }) {
  const [exibindo, setExibindo] = useState(children)
  const [classe, setClasse] = useState('fade-enter-active')
  const prevTab = useRef(activeTab)

  useEffect(() => {
    if (prevTab.current === activeTab) return
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
    }, 200)
    return () => clearTimeout(timer)
  }, [activeTab])

  return (
    <div className={`transition-page ${classe}`}>
      {exibindo}
    </div>
  )
}
