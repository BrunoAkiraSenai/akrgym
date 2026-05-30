import { Home, Dumbbell, TrendingUp, Settings } from 'lucide-react'

const tabs = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'treinar', label: 'Treinar', icon: Dumbbell },
  { key: 'evolucao', label: 'Evolução', icon: TrendingUp },
  { key: 'configurar', label: 'Configurar', icon: Settings },
]

export default function Layout({ activeTab, onTabChange, children }) {
  return (
    <div className="flex flex-col h-full max-w-full md:max-w-2xl lg:max-w-4xl mx-auto bg-neutral-900 md:rounded-2xl md:my-4 md:shadow-2xl md:h-[calc(100vh-2rem)]">
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 pt-4 pb-32">
        {children}
      </main>

      <nav
        className="flex items-center justify-around bg-neutral-800 border-t border-neutral-700"
        style={{ paddingBottom: 'var(--safe-bottom)' }}
      >
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={`flex flex-col items-center gap-0.5 py-3 px-3 min-w-0 flex-1 transition-colors active:bg-neutral-700 ${
              activeTab === key
                ? 'text-emerald-400'
                : 'text-neutral-400'
            }`}
          >
            <Icon size={22} />
            <span className="text-[10px] leading-tight">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
