import { useState, useEffect } from 'react'
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth'
import { auth, db } from './firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { UserContext } from './context/UserContext'
import OnboardingWizard from './components/OnboardingWizard'
import PageTransition from './components/PageTransition'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/Layout'
import Login from './components/pages/Login'
import Home from './components/pages/Home'
import Dieta from './components/pages/Dieta'
import Execucao from './components/pages/Execucao'
import Evolucao from './components/pages/Evolucao'
import Configuracao from './components/pages/Configuracao'
import { REFEICOES, METAS_DIARIAS } from './config/dieta'
import PROTOCOLO_BASE from './config/protocolo'

const USER_CONFIG = (uid) => doc(db, 'users', uid, 'config', 'data')

const SEED_CONFIG = {
  metas: METAS_DIARIAS,
  refeicoes: REFEICOES,
  treinos: PROTOCOLO_BASE,
  onboardingConcluido: false,
}

async function ensureUserConfig(uid) {
  const snap = await getDoc(USER_CONFIG(uid))
  if (snap.exists()) return
  // Se houver migração de dados anônimos em andamento,
  // o seed será sobrescrito pelos dados reais — sem perda de dados.
  await setDoc(USER_CONFIG(uid), SEED_CONFIG)
}

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('home')
  const [initializing, setInitializing] = useState(true)
  const [abaInicialConfig, setAbaInicialConfig] = useState('treinos')
  const [mostrarOnboarding, setMostrarOnboarding] = useState(true)

  useEffect(() => {
    let cancelado = false
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (cancelado) return
      if (u) {
        try { await ensureUserConfig(u.uid) }
        catch (e) { console.warn('ensureUserConfig falhou:', e) }
        setUser(u)
        setLoading(false)
        setInitializing(false)
      } else {
        // Só tenta anônimo se realmente não houver sessão
        try {
          const anon = await signInAnonymously(auth)
          if (!cancelado && anon?.user) {
            await ensureUserConfig(anon.user.uid)
            setUser(anon.user)
          }
        } catch (err) {
          console.warn('Login anônimo não disponível:', err.code)
        }
        if (!cancelado) {
          setLoading(false)
          setInitializing(false)
        }
      }
    })
    return () => { cancelado = true; unsub() }
  }, [])

  if (loading || initializing) {
    return (
      <ErrorBoundary>
        <div className="flex items-center justify-center h-full bg-[#050505]">
          <div className="animate-spin w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full" />
        </div>
      </ErrorBoundary>
    )
  }

  if (!user) return <ErrorBoundary><Login /></ErrorBoundary>

  const renderPage = () => {
    switch (activeTab) {
      case 'home':
        return <Home onStartWorkout={() => setActiveTab('treinar')} />
      case 'dieta':
        return <Dieta onIrParaConfig={() => { setAbaInicialConfig('dieta'); setActiveTab('configurar') }} />
      case 'treinar':
        return <Execucao onFinish={() => setActiveTab('home')} />
      case 'evolucao':
        return <Evolucao />
      case 'configurar':
        return <Configuracao abaInicial={abaInicialConfig} />
      default:
        return <Home onStartWorkout={() => setActiveTab('treinar')} />
    }
  }

  return (
    <UserContext.Provider value={user}>
      {mostrarOnboarding ? (
        <OnboardingWizard onComplete={() => setMostrarOnboarding(false)} />
      ) : (
        <Layout activeTab={activeTab} onTabChange={setActiveTab}>
          <ErrorBoundary>
            <PageTransition activeTab={activeTab}>
              {renderPage()}
            </PageTransition>
          </ErrorBoundary>
        </Layout>
      )}
    </UserContext.Provider>
  )
}
