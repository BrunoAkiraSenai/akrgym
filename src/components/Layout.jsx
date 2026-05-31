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
    <div className="flex flex-col h-full max-w-full md:max-w-2xl lg:max-w-4xl mx-auto md:my-4 md:h-[calc(100vh-2rem)] md:rounded-2xl overflow-hidden">
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 pt-6 pb-4">
        {children}
      </main>

      <nav className="bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-3xl h-16 flex items-center justify-around px-1 mx-3 sm:mx-4 mb-3 sm:mb-4 mt-auto z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 4px)', paddingTop: '4px' }}>
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={`flex flex-col items-center justify-center gap-0 h-full flex-1 rounded-2xl transition-all active:scale-90 ${
              activeTab === key
                ? 'text-emerald-400 bg-emerald-500/10'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Icon size={20} className={activeTab === key ? 'drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]' : ''} />
            <span className="text-[9px] leading-none font-medium">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
