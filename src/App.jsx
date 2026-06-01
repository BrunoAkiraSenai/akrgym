import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from './firebase'
import { collection, doc, getDocs, getDoc, setDoc, deleteDoc } from 'firebase/firestore'
import Layout from './components/Layout'
import Login from './components/pages/Login'
import Home from './components/pages/Home'
import Dieta from './components/pages/Dieta'
import Execucao from './components/pages/Execucao'
import Evolucao from './components/pages/Evolucao'
import Configuracao from './components/pages/Configuracao'

async function migrateData(uid) {
  const collectionsToMigrate = ['historico_treinos', 'diario_dieta', 'historico_corporal']
  for (const colName of collectionsToMigrate) {
    const snap = await getDocs(collection(db, colName))
    if (!snap.empty) {
      for (const docSnap of snap.docs) {
        await setDoc(doc(db, 'users', uid, colName, docSnap.id), docSnap.data())
        await deleteDoc(doc(db, colName, docSnap.id))
      }
    }
  }
  const configDocs = ['overrides', 'dieta_base']
  for (const docName of configDocs) {
    const snap = await getDoc(doc(db, 'config', docName))
    if (snap.exists()) {
      await setDoc(doc(db, 'users', uid, 'config', docName), snap.data())
      await deleteDoc(doc(db, 'config', docName))
    }
  }
}

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('home')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        await migrateData(u.uid)
      }
      setUser(u)
      setLoading(false)
    })
    return () => unsub()
  }, [])

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
