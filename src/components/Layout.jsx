import { useState, useEffect, useRef, useCallback } from 'react'
import { Home, Dumbbell, TrendingUp, Settings, Apple } from 'lucide-react'

const tabs = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'dieta', label: 'Dieta', icon: Apple },
  { key: 'treinar', label: 'Treinar', icon: Dumbbell },
  { key: 'evolucao', label: 'Evolução', icon: TrendingUp },
  { key: 'configurar', label: 'Configurar', icon: Settings },
]

export default function Layout({ activeTab, onTabChange, children }) {
  const navRef = useRef(null)
  const tabRefs = useRef({})
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false })

  // Move o indicador de luz horizontalmente até a aba ativa
  const atualizarIndicador = useCallback(() => {
    const el = tabRefs.current[activeTab]
    const nav = navRef.current
    if (!el || !nav) return
    setIndicator({
      left: el.offsetLeft,
      width: el.offsetWidth,
      ready: true,
    })
  }, [activeTab])

  useEffect(() => {
    atualizarIndicador()
  }, [atualizarIndicador])

  // Recalcula no resize e após fonts/carregamento
  useEffect(() => {
    const r = () => atualizarIndicador()
    window.addEventListener('resize', r)
    const t1 = setTimeout(r, 120)
    const t2 = setTimeout(r, 400)
    return () => {
      window.removeEventListener('resize', r)
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [atualizarIndicador])

  return (
    <div className="flex flex-col h-full max-w-full md:max-w-2xl lg:max-w-4xl mx-auto md:my-4 md:h-[calc(100vh-2rem)] relative">
      {/* A barra ocupa a própria linha abaixo do conteúdo (.aether-nav é position: relative),
          então o conteúdo não passa por trás dela e não precisa de espaço extra no fim. */}
      <main className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 pt-6 pb-6 scrollbar-thin"
        style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top, 1.5rem))' }}>
        {children}
      </main>

      <nav
        ref={navRef}
        className="aether-nav shrink-0 rounded-3xl h-16 flex items-center justify-around px-2 mx-3 md:mx-auto md:max-w-2xl lg:max-w-4xl mb-0 md:mt-2 z-50"
        aria-label="Navegação principal"
        style={{ paddingBottom: 'max(6px, env(safe-area-inset-bottom, 0px))', paddingTop: '6px', height: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {indicator.ready && (
          <span
            className="aether-nav-indicator"
            style={{ transform: `translateX(${indicator.left}px)`, width: `${indicator.width}px` }}
          />
        )}

        {tabs.map(({ key, label, icon: Icon }) => {
          const active = activeTab === key
          return (
            <button
              key={key}
              type="button"
              aria-current={active ? 'page' : undefined}
              ref={(el) => { tabRefs.current[key] = el }}
              onClick={() => onTabChange(key)}
              className={`aether-tab flex flex-col items-center justify-center gap-1.5 h-full flex-1 rounded-2xl transition active:scale-[0.97] relative z-10 ${
                active ? 'text-emerald-300' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <span className="relative flex items-center justify-center" style={{ height: 22, width: 22 }}>
                {active && (
                  <span className="absolute inset-0 rounded-full bg-emerald-400/15 blur-[6px]" />
                )}
                <Icon
                  size={active ? 22 : 20}
                  className={`relative ${active ? 'aether-tab-icon-active' : ''}`}
                />
              </span>
              <span className="aether-tab-label">{label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
