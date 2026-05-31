import { useState } from 'react'
import Layout from './components/Layout'
import Home from './components/pages/Home'
import Dieta from './components/pages/Dieta'
import Execucao from './components/pages/Execucao'
import Evolucao from './components/pages/Evolucao'
import Configuracao from './components/pages/Configuracao'

export default function App() {
  const [activeTab, setActiveTab] = useState('home')

  const renderPage = () => {
    switch (activeTab) {
      case 'home':
        return <Home onStartWorkout={() => setActiveTab('treinar')} />
      case 'dieta':
        return <Dieta />
      case 'treinar':
        return <Execucao onFinish={() => setActiveTab('home')} />
      case 'evolucao':
        return <Evolucao />
      case 'configurar':
        return <Configuracao />
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
