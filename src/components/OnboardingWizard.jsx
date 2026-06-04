import { useState, useEffect, useCallback } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useUser } from '../context/UserContext'
import PROTOCOLO_BASE from '../config/protocolo'
import { REFEICOES, METAS_DIARIAS } from '../config/dieta'
import { Dumbbell, Sparkles, Zap, ChevronRight, Check, Loader, Apple } from 'lucide-react'

const ETAPAS_OPCAO_A = ['experiencia', 'objetivo', 'revisao']

const TEMPLATES = {
  experiencia: {
    iniciante: {
      treinos: {
        upper_a: { nome: 'Upper A', exercicios: [
          { nome: 'Supino Reto Máquina', base_top: 0, meta_reps: '10-12', tem_aquecimento: false, carga: '', reps: '' },
          { nome: 'Remada Curvada Barra', base_top: 0, meta_reps: '10-12', tem_aquecimento: false, carga: '', reps: '' },
          { nome: 'Desenvolvimento Halter', base_top: 0, meta_reps: '10-12', tem_aquecimento: false, carga: '', reps: '' },
        ]},
        lower: { nome: 'Lower', exercicios: [
          { nome: 'Agachamento', base_top: 0, meta_reps: '10-12', tem_aquecimento: true, IsAgachamento: true, carga: '', reps: '' },
          { nome: 'Stiff', base_top: 0, meta_reps: '10-12', tem_aquecimento: false, carga: '', reps: '' },
          { nome: 'Panturrilha', base_top: 0, meta_reps: '12-15', tem_aquecimento: false, carga: '', reps: '' },
        ]},
        upper_b: { nome: 'Upper B', exercicios: [
          { nome: 'Puxada Aberta', base_top: 0, meta_reps: '10-12', tem_aquecimento: false, carga: '', reps: '' },
          { nome: 'Supino Inclinado Halter', base_top: 0, meta_reps: '10-12', tem_aquecimento: false, carga: '', reps: '' },
          { nome: 'Tríceps Polia', base_top: 0, meta_reps: '10-12', tem_aquecimento: false, carga: '', reps: '' },
        ]},
      },
    },
    intermediario: {
      treinos: {
        upper_a: { nome: 'Upper A', exercicios: [
          { nome: 'Supino Reto Máquina', base_top: 0, meta_reps: '8-10', tem_aquecimento: true, carga: '', reps: '' },
          { nome: 'Remada Curvada Barra', base_top: 0, meta_reps: '8-10', tem_aquecimento: false, carga: '', reps: '' },
          { nome: 'Desenvolvimento Halter', base_top: 0, meta_reps: '8-10', tem_aquecimento: false, carga: '', reps: '' },
          { nome: 'Crucifixo', base_top: 0, meta_reps: '10-12', tem_aquecimento: false, carga: '', reps: '' },
        ]},
        lower: { nome: 'Lower', exercicios: [
          { nome: 'Agachamento', base_top: 0, meta_reps: '8-10', tem_aquecimento: true, IsAgachamento: true, carga: '', reps: '' },
          { nome: 'Stiff', base_top: 0, meta_reps: '8-10', tem_aquecimento: false, carga: '', reps: '' },
          { nome: 'Extensora', base_top: 0, meta_reps: '10-12', tem_aquecimento: false, carga: '', reps: '' },
          { nome: 'Panturrilha', base_top: 0, meta_reps: '12-15', tem_aquecimento: false, carga: '', reps: '' },
        ]},
        upper_b: { nome: 'Upper B', exercicios: [
          { nome: 'Puxada Aberta', base_top: 0, meta_reps: '8-10', tem_aquecimento: false, carga: '', reps: '' },
          { nome: 'Supino Inclinado Halter', base_top: 0, meta_reps: '8-10', tem_aquecimento: false, carga: '', reps: '' },
          { nome: 'Tríceps Polia', base_top: 0, meta_reps: '8-10', tem_aquecimento: false, carga: '', reps: '' },
          { nome: 'Rosca Direta', base_top: 0, meta_reps: '10-12', tem_aquecimento: false, carga: '', reps: '' },
        ]},
      },
    },
    avancado: {
      treinos: {
        upper_a: { nome: 'Upper A', exercicios: [
          { nome: 'Supino Reto Máquina', base_top: 0, meta_reps: '6-8', tem_aquecimento: true, carga: '', reps: '' },
          { nome: 'Remada Curvada Barra', base_top: 0, meta_reps: '6-8', tem_aquecimento: true, carga: '', reps: '' },
          { nome: 'Desenvolvimento Halter', base_top: 0, meta_reps: '6-8', tem_aquecimento: false, carga: '', reps: '' },
          { nome: 'Crucifixo', base_top: 0, meta_reps: '8-10', tem_aquecimento: false, carga: '', reps: '' },
        ]},
        lower: { nome: 'Lower', exercicios: [
          { nome: 'Agachamento', base_top: 0, meta_reps: '6-8', tem_aquecimento: true, IsAgachamento: true, carga: '', reps: '' },
          { nome: 'Terra', base_top: 0, meta_reps: '6-8', tem_aquecimento: false, carga: '', reps: '' },
          { nome: 'Stiff', base_top: 0, meta_reps: '8-10', tem_aquecimento: false, carga: '', reps: '' },
          { nome: 'Panturrilha', base_top: 0, meta_reps: '12-15', tem_aquecimento: false, carga: '', reps: '' },
        ]},
        upper_b: { nome: 'Upper B', exercicios: [
          { nome: 'Puxada Aberta', base_top: 0, meta_reps: '6-8', tem_aquecimento: true, carga: '', reps: '' },
          { nome: 'Supino Inclinado Halter', base_top: 0, meta_reps: '6-8', tem_aquecimento: false, carga: '', reps: '' },
          { nome: 'Rosca Direta', base_top: 0, meta_reps: '8-10', tem_aquecimento: false, carga: '', reps: '' },
          { nome: 'Tríceps Corda', base_top: 0, meta_reps: '8-10', tem_aquecimento: false, carga: '', reps: '' },
        ]},
      },
    },
  },
  objetivo: {
    perder_peso: {
      metas: { kcal: 1700, proteinas: 170, carboidratos: 128, gorduras: 57 },
      refeicoes: [
        { id: 'cafe', nome: 'Café da Manhã', horario: '08:00', alimentos: ['3 Ovos', '1 fatia Pão Integral'], kcal: 300, proteinas: 24, carboidratos: 20, gorduras: 14 },
        { id: 'almoco', nome: 'Almoço', horario: '12:30', alimentos: ['150g Frango', '100g Arroz', 'Salada'], kcal: 450, proteinas: 48, carboidratos: 40, gorduras: 8 },
        { id: 'lanche', nome: 'Lanche', horario: '16:00', alimentos: ['1 Whey', '1 Banana'], kcal: 250, proteinas: 30, carboidratos: 30, gorduras: 3 },
        { id: 'jantar', nome: 'Jantar', horario: '20:00', alimentos: ['200g Peixe', 'Legumes'], kcal: 350, proteinas: 45, carboidratos: 20, gorduras: 10 },
      ],
    },
    ganhar_massa: {
      metas: { kcal: 2500, proteinas: 219, carboidratos: 281, gorduras: 56 },
      refeicoes: [
        { id: 'cafe', nome: 'Café da Manhã', horario: '08:00', alimentos: ['4 Ovos', '2 fatias Pão Integral', '30g Aveia'], kcal: 520, proteinas: 35, carboidratos: 50, gorduras: 18 },
        { id: 'almoco', nome: 'Almoço', horario: '12:30', alimentos: ['200g Frango', '200g Arroz', '100g Feijão'], kcal: 650, proteinas: 60, carboidratos: 75, gorduras: 8 },
        { id: 'lanche', nome: 'Pré-Treino', horario: '16:30', alimentos: ['150g Frango', '150g Arroz', '10g Azeite'], kcal: 480, proteinas: 40, carboidratos: 45, gorduras: 14 },
        { id: 'jantar', nome: 'Jantar', horario: '20:30', alimentos: ['200g Patinho', '250g Arroz'], kcal: 650, proteinas: 55, carboidratos: 85, gorduras: 10 },
      ],
    },
    manter_saude: {
      metas: { kcal: 2000, proteinas: 150, carboidratos: 200, gorduras: 67 },
      refeicoes: [
        { id: 'cafe', nome: 'Café da Manhã', horario: '08:30', alimentos: ['3 Ovos', '2 fatias Pão Integral', '30g Aveia'], kcal: 460, proteinas: 29, carboidratos: 42, gorduras: 19 },
        { id: 'almoco', nome: 'Almoço', horario: '12:30', alimentos: ['150g Frango', '150g Arroz', '100g Feijão', 'Salada'], kcal: 490, proteinas: 55, carboidratos: 56, gorduras: 4 },
        { id: 'lanche', nome: 'Pré-Treino', horario: '16:30', alimentos: ['100g Frango', '150g Arroz', '10g Azeite'], kcal: 430, proteinas: 35, carboidratos: 42, gorduras: 13 },
        { id: 'jantar', nome: 'Jantar', horario: '20:30', alimentos: ['150g Patinho', '200g Arroz', '400g Melancia'], kcal: 590, proteinas: 46, carboidratos: 86, gorduras: 7 },
      ],
    },
  },
}

export default function OnboardingWizard({ onComplete }) {
  const user = useUser()
  const [etapa, setEtapa] = useState('opcoes')
  const [experience, setExperience] = useState(null)
  const [objetivo, setObjetivo] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)
  const [verificando, setVerificando] = useState(true)

  const verificarPrimeiroAcesso = useCallback(async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    try {
      const snap = await getDoc(doc(db, 'users', user.uid, 'config', 'data'))
      clearTimeout(timeoutId)
      const data = snap.data() || {}
      if (data.onboardingConcluido === true) {
        onComplete()
        return
      }
      const temTreinos = data.treinos && Object.keys(data.treinos).length > 0
      if (temTreinos) {
        onComplete()
        return
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setErro('Tempo limite excedido. Verifique sua conexão.')
      } else {
        setErro('Erro ao carregar configurações. Recarregue a página.')
      }
      console.error('Erro ao verificar onboarding:', err)
    }
    setVerificando(false)
  }, [user.uid, onComplete])

  useEffect(() => { verificarPrimeiroAcesso() }, [verificarPrimeiroAcesso])

  const salvarOpcaoC = async () => {
    setSalvando(true)
    setErro(null)
    try {
      const treinosLimpos = {}
      for (const [chave, treino] of Object.entries(PROTOCOLO_BASE)) {
        treinosLimpos[chave] = {
          ...treino,
          exercicios: treino.exercicios.map(ex => ({
            ...ex,
            base_top: '',
            meta_reps: ex.meta_reps || '',
            tem_aquecimento: ex.tem_aquecimento || false,
          })),
        }
      }
      const refeicoesLimpas = REFEICOES.map(ref => ({
        ...ref,
        alimentos: ref.alimentos ? [...ref.alimentos] : [],
      }))
      await setDoc(doc(db, 'users', user.uid, 'config', 'data'), {
        onboardingConcluido: true,
        treinos: treinosLimpos,
        refeicoes: refeicoesLimpas,
        metas: METAS_DIARIAS,
      })
      onComplete()
    } catch (err) {
      console.error('Erro ao salvar template Akr:', err)
      setErro('Erro ao copiar template. Tente novamente ou escolha outra opção.')
    }
    setSalvando(false)
  }

  const salvarOpcaoA = async () => {
    setSalvando(true)
    setErro(null)
    try {
      const nivel = TEMPLATES.experiencia[experience]
      const obj = TEMPLATES.objetivo[objetivo]
      await setDoc(doc(db, 'users', user.uid, 'config', 'data'), {
        treinos: nivel.treinos,
        refeicoes: obj.refeicoes,
        metas: obj.metas,
        onboardingConcluido: true,
      })
      onComplete()
    } catch (err) {
      setErro('Erro ao salvar plano. Tente novamente.')
    }
    setSalvando(false)
  }

  const salvarOpcaoB = async () => {
    setSalvando(true)
    setErro(null)
    try {
      // Limpa tudo — salva apenas a flag
      await setDoc(doc(db, 'users', user.uid, 'config', 'data'), {
        onboardingConcluido: true,
      })
      onComplete()
    } catch (err) {
      setErro('Erro ao salvar. Tente novamente.')
    }
    setSalvando(false)
  }

  if (verificando) {
    return (
      <div className="flex flex-col gap-3 px-4 py-8 max-w-md mx-auto">
        <div className="skeleton skeleton-circle mx-auto mb-4" />
        <div className="skeleton skeleton-title mx-auto" />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </div>
    )
  }

  if (etapa === 'opcoes') {
    return (
      <div className="flex flex-col gap-4 px-4 py-8 max-w-md mx-auto">
        <div className="text-center mb-2">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
            <Dumbbell size={28} className="text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Bem-vindo ao AkrGym!</h1>
          <p className="text-neutral-400 text-sm mt-1">Configure seu plano para começar</p>
        </div>

        {erro && <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3 text-red-400 text-xs">{erro}</div>}

        <button onClick={() => setEtapa('experiencia')} disabled={salvando}
          className="card-premium p-5 text-left hover:border-emerald-500/30 transition-all active:scale-[0.97] disabled:opacity-40">
          <div className="flex items-start gap-3">
            <Sparkles size={22} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-white font-semibold text-sm">Plano Recomendado</span>
              <p className="text-neutral-500 text-xs mt-0.5">Responda algumas perguntas e eu crio o plano ideal para você</p>
            </div>
          </div>
        </button>

        <button onClick={salvarOpcaoB} disabled={salvando}
          className="card-premium p-5 text-left hover:border-emerald-500/30 transition-all active:scale-[0.97] disabled:opacity-40">
          <div className="flex items-start gap-3">
            <Zap size={22} className="text-neutral-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-white font-semibold text-sm">Começar do Zero</span>
              <p className="text-neutral-500 text-xs mt-0.5">Vou configurar tudo manualmente depois</p>
            </div>
          </div>
        </button>

        <button onClick={salvarOpcaoC} disabled={salvando}
          className="card-premium p-5 text-left hover:border-emerald-500/30 transition-all active:scale-[0.97] disabled:opacity-40">
          <div className="flex items-start gap-3">
            <Apple size={22} className="text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-white font-semibold text-sm">Treino e Dieta do Akr</span>
              <p className="text-neutral-500 text-xs mt-0.5">Usar a estrutura pronta do criador do app (sem dados pessoais)</p>
            </div>
          </div>
        </button>
      </div>
    )
  }

  if (etapa === 'experiencia') {
    return (
      <div className="flex flex-col gap-3 px-4 py-8 max-w-md mx-auto">
        <button onClick={() => setEtapa('opcoes')} className="text-neutral-500 hover:text-white text-xs self-start mb-2">← Voltar</button>
        <h2 className="text-white font-bold text-lg">Qual seu nível?</h2>
        <p className="text-neutral-400 text-xs mb-1">Isso define a quantidade e complexidade dos exercícios</p>
        {['iniciante', 'intermediario', 'avancado'].map(nivel => (
          <button key={nivel} onClick={() => { setExperience(nivel); setEtapa('objetivo') }}
            className={`card-premium p-4 text-left transition-all active:scale-[0.97] ${experience === nivel ? 'border-emerald-500/40' : ''}`}>
            <span className="text-white font-semibold text-sm capitalize">{nivel}</span>
            <p className="text-neutral-500 text-xs mt-0.5">
              {nivel === 'iniciante' ? '3 exercícios por treino' : nivel === 'intermediario' ? '4 exercícios por treino' : '4 exercícios avançados por treino'}
            </p>
          </button>
        ))}
      </div>
    )
  }

  if (etapa === 'objetivo') {
    return (
      <div className="flex flex-col gap-3 px-4 py-8 max-w-md mx-auto">
        <button onClick={() => setEtapa('experiencia')} className="text-neutral-500 hover:text-white text-xs self-start mb-2">← Voltar</button>
        <h2 className="text-white font-bold text-lg">Qual seu objetivo?</h2>
        <p className="text-neutral-400 text-xs mb-1">Isso define as metas calóricas e a dieta</p>
        {[
          { key: 'perder_peso', label: 'Perder Peso', desc: 'Déficit calórico para emagrecimento' },
          { key: 'ganhar_massa', label: 'Ganhar Massa Muscular', desc: 'Superávit calórico controlado' },
          { key: 'manter_saude', label: 'Manter Saúde', desc: 'Equilíbrio entre treino e alimentação' },
        ].map(obj => (
          <button key={obj.key} onClick={() => { setObjetivo(obj.key); setEtapa('revisao') }}
            className={`card-premium p-4 text-left transition-all active:scale-[0.97] ${objetivo === obj.key ? 'border-emerald-500/40' : ''}`}>
            <span className="text-white font-semibold text-sm">{obj.label}</span>
            <p className="text-neutral-500 text-xs mt-0.5">{obj.desc}</p>
          </button>
        ))}
      </div>
    )
  }

  if (etapa === 'revisao') {
    const nivelLabel = { iniciante: 'Iniciante', intermediario: 'Intermediário', avancado: 'Avançado' }
    const objLabel = { perder_peso: 'Perder Peso', ganhar_massa: 'Ganhar Massa', manter_saude: 'Manter Saúde' }
    const objData = TEMPLATES.objetivo[objetivo]
    const nivelNome = TEMPLATES.experiencia[experience]
    const totalExercicios = Object.values(nivelNome.treinos).reduce((s, t) => s + (t.exercicios?.length || 0), 0)
    return (
      <div className="flex flex-col gap-3 px-4 py-8 max-w-md mx-auto">
        <button onClick={() => setEtapa('objetivo')} className="text-neutral-500 hover:text-white text-xs self-start mb-2">← Voltar</button>
        <h2 className="text-white font-bold text-lg">Revisão do Plano</h2>
        <div className="card-premium p-4 space-y-2">
          <div className="flex justify-between text-xs"><span className="text-neutral-400">Nível</span><span className="text-white font-medium">{nivelLabel[experience]}</span></div>
          <div className="flex justify-between text-xs"><span className="text-neutral-400">Objetivo</span><span className="text-white font-medium">{objLabel[objetivo]}</span></div>
          <div className="flex justify-between text-xs"><span className="text-neutral-400">Treinos</span><span className="text-white font-medium">{Object.keys(nivelNome.treinos).length} divisões</span></div>
          <div className="flex justify-between text-xs"><span className="text-neutral-400">Exercícios</span><span className="text-white font-medium">{totalExercicios} no total</span></div>
          <div className="flex justify-between text-xs"><span className="text-neutral-400">Refeições</span><span className="text-white font-medium">{objData.refeicoes.length} por dia</span></div>
          <div className="flex justify-between text-xs"><span className="text-neutral-400">Meta calórica</span><span className="text-white font-medium">{objData.metas.kcal} kcal/dia</span></div>
        </div>
        <button onClick={salvarOpcaoA} disabled={salvando}
          className="btn-primary w-full py-4 flex items-center justify-center gap-2 mt-2">
          {salvando ? <><Loader size={18} className="animate-spin" /> Salvando...</> : <><Check size={18} /> Confirmar Plano</>}
        </button>
      </div>
    )
  }

  return null
}
