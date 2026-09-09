import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth'
import { auth, db } from './firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { METAS_DIARIAS } from './config/dieta'
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
  if (snap.exists()) {
    const data = snap.data()
    const normalizado = {
      ...data,
      treinos: data.treinos || {},
      refeicoes: Array.isArray(data.refeicoes) ? data.refeicoes : [],
      metas: data.metas || METAS_DIARIAS,
    }
    const precisaAtualizar = !data.treinos || !Array.isArray(data.refeicoes) || !data.metas
    if (precisaAtualizar) await setDoc(USER_CONFIG(uid), normalizado)
    return
  }
  await setDoc(USER_CONFIG(uid), {
    onboardingConcluido: false,
    criadoEm: new Date().toISOString(),
    treinos: {},
    refeicoes: [],
    metas: METAS_DIARIAS,
  })
}

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('home')
  const [initializing, setInitializing] = useState(true)
  const [abaInicialConfig, setAbaInicialConfig] = useState('treinos')
  const [mostrarOnboarding, setMostrarOnboarding] = useState(true)

  // Reseta o estado da UI quando o usuário muda (login/logout)
  const resetUIState = () => {
    setActiveTab('home')
    setAbaInicialConfig('treinos')
    setMostrarOnboarding(true)
    setLoading(true)
    setInitializing(true)
  }

  const prevUidRef = useRef(null)

  useEffect(() => {
    let cancelado = false
    let authSequence = 0
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (cancelado) return
      const sequence = ++authSequence
      const sessaoAtual = () => !cancelado && sequence === authSequence

      const newUid = u?.uid || null
      // Se o usuário mudou (logout ou troca de conta), reseta a UI
      if (newUid !== prevUidRef.current) {
        prevUidRef.current = newUid
        setUser(null)
        resetUIState()
      }

      if (u) {
        try { await ensureUserConfig(u.uid) }
        catch (e) {
          if (import.meta.env.DEV) console.warn('ensureUserConfig falhou:', e?.message)
        }
        if (!sessaoAtual()) return
        setUser(u)
        setLoading(false)
        setInitializing(false)
      } else {
        setUser(null)
        // Só tenta anônimo se realmente não houver sessão
        try {
          // A nova sessão é inicializada pelo próximo callback de Auth.
          await signInAnonymously(auth)
        } catch (err) {
          if (import.meta.env.DEV) console.warn('Login anônimo não disponível:', err.code)
        }
        if (sessaoAtual()) {
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
        <div className="flex items-center justify-center h-full bg-[#07050c]">
          <div className="animate-spin w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full" />
        </div>
      </ErrorBoundary>
    )
  }

  if (!user) return <ErrorBoundary><Suspense fallback={<div className="skeleton skeleton-card" />}><Login /></Suspense></ErrorBoundary>

  const renderPage = () => {
    const pageKey = user?.uid || 'guest'
    switch (activeTab) {
      case 'home':
        return <Suspense key={pageKey} fallback={<div className="skeleton skeleton-card" />}><Home onStartWorkout={() => setActiveTab('treinar')} /></Suspense>
      case 'dieta':
        return <Suspense key={pageKey} fallback={<div className="skeleton skeleton-card" />}><Dieta onIrParaConfig={() => { setAbaInicialConfig('dieta'); setActiveTab('configurar') }} /></Suspense>
      case 'treinar':
        return <Suspense key={pageKey} fallback={<div className="skeleton skeleton-card" />}><Execucao onFinish={() => setActiveTab('home')} onIrParaConfig={() => { setAbaInicialConfig('treinos'); setActiveTab('configurar') }} activeTab={activeTab} /></Suspense>
      case 'evolucao':
        return <Suspense key={pageKey} fallback={<div className="skeleton skeleton-card" />}><Evolucao /></Suspense>
      case 'configurar':
        return <Suspense key={pageKey} fallback={<div className="skeleton skeleton-card" />}><Configuracao abaInicial={abaInicialConfig} /></Suspense>
      default:
        return <Suspense key={pageKey} fallback={<div className="skeleton skeleton-card" />}><Home onStartWorkout={() => setActiveTab('treinar')} /></Suspense>
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
