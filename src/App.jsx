import { useState, useEffect } from 'react'
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth'
import { auth, db } from './firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
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
  metas: { kcal: 1970, proteinas: 165, carboidratos: 226, gorduras: 43 },
  refeicoes: REFEICOES,
  treinos: PROTOCOLO_BASE,
}

async function ensureUserConfig(uid) {
  const snap = await getDoc(USER_CONFIG(uid))
  if (!snap.exists()) {
    await setDoc(USER_CONFIG(uid), SEED_CONFIG)
  }
}

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [activeTab, setActiveTab] = useState('home')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setIsAnonymous(u.isAnonymous)
        await ensureUserConfig(u.uid)
      }
      setUser(u)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!user && !loading) {
      signInAnonymously(auth).catch(() => {})
    }
  }, [user, loading])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#050505]">
        <div className="animate-spin w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!user) return <Login />

  const renderPage = () => {
    switch (activeTab) {
      case 'home':
        return <Home user={user} onStartWorkout={() => setActiveTab('treinar')} />
      case 'dieta':
        return <Dieta user={user} />
      case 'treinar':
        return <Execucao user={user} onFinish={() => setActiveTab('home')} />
      case 'evolucao':
        return <Evolucao user={user} />
      case 'configurar':
        return <Configuracao user={user} />
      default:
        return null
    }
  }

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderPage()}
    </Layout>
  )
}
