import { useState, useEffect, useRef } from 'react'
import { Home, Dumbbell, TrendingUp, Settings, Apple } from 'lucide-react'

const tabs = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'dieta', label: 'Dieta', icon: Apple },
  { key: 'treinar', label: 'Treinar', icon: Dumbbell },
  { key: 'evolucao', label: 'Evolução', icon: TrendingUp },
  { key: 'configurar', label: 'Configurar', icon: Settings },
]

/* Partículas flutuantes Aether (≤30) — CSS puro, sem dependências.
   Geradas após a montagem para manter o render puro. */
function AetherParticles() {
  const [particles, setParticles] = useState([])

  useEffect(() => {
    const colors = ['', 'gold', 'cyan', 'purple']
    const count = 26
    setParticles(
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 2 + Math.random() * 3,
        color: colors[i % colors.length],
        duration: 14 + Math.random() * 14,
        delay: Math.random() * 12,
        x: `${(Math.random() - 0.5) * 60}px`,
        y: `${-40 - Math.random() * 80}px`,
      }))
    )
  }, [])

  return (
    <div className="aether-particles" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className={`aether-particle ${p.color}`}
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            '--p-duration': `${p.duration}s`,
            '--p-delay': `${p.delay}s`,
            '--p-x': p.x,
            '--p-y': p.y,
          }}
        />
      ))}
    </div>
  )
}

export default function Layout({ activeTab, onTabChange, children }) {
  const navRef = useRef(null)
  const tabRefs = useRef({})
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false })

  // Move o indicador de luz horizontalmente até a aba ativa
  const atualizarIndicador = () => {
    const el = tabRefs.current[activeTab]
    const nav = navRef.current
    if (!el || !nav) return
    setIndicator({
      left: el.offsetLeft,
      width: el.offsetWidth,
      ready: true,
    })
  }

  useEffect(() => {
    atualizarIndicador()
  }, [activeTab])

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
  }, [])

  return (
    <div className="flex flex-col h-full max-w-full md:max-w-2xl lg:max-w-4xl mx-auto md:my-4 md:h-[calc(100vh-2rem)] relative">
      <AetherParticles />

      <main className="flex-1 overflow-y-auto px-4 sm:px-6 pt-6 pb-28 scrollbar-thin"
        style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top, 1.5rem))' }}>
        {children}
      </main>

      <nav
        ref={navRef}
        className="aether-nav fixed bottom-0 left-0 right-0 md:absolute md:bottom-4 md:left-4 md:right-4 rounded-3xl h-16 flex items-center justify-around px-2 mx-3 md:mx-auto md:max-w-2xl lg:max-w-4xl mb-0 md:mb-4 z-50"
        style={{ paddingBottom: '6px', paddingTop: '6px' }}
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
              ref={(el) => { tabRefs.current[key] = el }}
              onClick={() => onTabChange(key)}
              className={`aether-tab flex flex-col items-center justify-center gap-1.5 h-full flex-1 rounded-2xl transition-all active:scale-90 relative z-10 ${
                active ? 'text-emerald-300' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <span className="relative flex items-center justify-center" style={{ height: 22, width: 22 }}>
                {active && (
                  <span className="absolute inset-0 rounded-full bg-emerald-400/15 blur-[6px]" />
                )}
                <Icon
                  size={active ? 22 : 20}
                  className={`relative ${active ? 'drop-shadow-[0_0_8px_rgba(244,114,182,0.5)]' : ''}`}
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
