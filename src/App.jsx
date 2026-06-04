import { useState, useEffect, lazy, Suspense } from 'react'
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth'
import { auth, db } from './firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { UserContext } from './context/UserContext'
import OnboardingWizard from './components/OnboardingWizard'
import PageTransition from './components/PageTransition'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/Layout'

const Login = lazy(() => import('./components/pages/Login'))
const Home = lazy(() => import('./components/pages/Home'))
const Dieta = lazy(() => import('./components/pages/Dieta'))
const Execucao = lazy(() => import('./components/pages/Execucao'))
const Evolucao = lazy(() => import('./components/pages/Evolucao'))
const Configuracao = lazy(() => import('./components/pages/Configuracao'))

const USER_CONFIG = (uid) => doc(db, 'users', uid, 'config', 'data')

async function ensureUserConfig(uid) {
  const snap = await getDoc(USER_CONFIG(uid))
  if (snap.exists()) return
  await setDoc(USER_CONFIG(uid), { onboardingConcluido: false, criadoEm: new Date().toISOString() })
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

  if (!user) return <ErrorBoundary><Suspense fallback={<div className="skeleton skeleton-card" />}><Login /></Suspense></ErrorBoundary>

  const renderPage = () => {
    switch (activeTab) {
      case 'home':
        return <Suspense fallback={<div className="skeleton skeleton-card" />}><Home onStartWorkout={() => setActiveTab('treinar')} /></Suspense>
      case 'dieta':
        return <Suspense fallback={<div className="skeleton skeleton-card" />}><Dieta onIrParaConfig={() => { setAbaInicialConfig('dieta'); setActiveTab('configurar') }} /></Suspense>
      case 'treinar':
        return <Suspense fallback={<div className="skeleton skeleton-card" />}><Execucao onFinish={() => setActiveTab('home')} activeTab={activeTab} /></Suspense>
      case 'evolucao':
        return <Suspense fallback={<div className="skeleton skeleton-card" />}><Evolucao /></Suspense>
      case 'configurar':
        return <Suspense fallback={<div className="skeleton skeleton-card" />}><Configuracao abaInicial={abaInicialConfig} /></Suspense>
      default:
        return <Suspense fallback={<div className="skeleton skeleton-card" />}><Home onStartWorkout={() => setActiveTab('treinar')} /></Suspense>
    }
  }

  return (
    <UserContext.Provider value={user}>
      {mostrarOnboarding ? (
        <ErrorBoundary>
          <OnboardingWizard onComplete={() => setMostrarOnboarding(false)} />
        </ErrorBoundary>
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
