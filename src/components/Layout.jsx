import { Home, Dumbbell, TrendingUp, Settings, Apple } from 'lucide-react'

const tabs = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'dieta', label: 'Dieta', icon: Apple },
  { key: 'treinar', label: 'Treinar', icon: Dumbbell },
  { key: 'evolucao', label: 'Evolução', icon: TrendingUp },
  { key: 'configurar', label: 'Configurar', icon: Settings },
]

export default function Layout({ activeTab, onTabChange, children }) {
  return (
    <div className="flex flex-col h-full max-w-full md:max-w-2xl lg:max-w-4xl mx-auto md:my-4 md:h-[calc(100vh-2rem)] relative">
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 pt-6 pb-24 scrollbar-thin">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 md:absolute md:bottom-4 md:left-4 md:right-4 bg-neutral-900/70 backdrop-blur-2xl border border-white/10 rounded-3xl h-16 flex items-center justify-around px-2 mx-3 md:mx-auto md:max-w-2xl lg:max-w-4xl mb-0 md:mb-4 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 4px)', paddingTop: '4px' }}>
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={`flex flex-col items-center justify-center gap-0.5 h-full flex-1 rounded-2xl transition-all active:scale-90 relative ${
              activeTab === key
                ? 'text-emerald-400'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {activeTab === key && (
              <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full" />
            )}
            <Icon size={20} className={activeTab === key ? 'drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]' : ''} />
            <span className="text-[9px] leading-none font-medium">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
