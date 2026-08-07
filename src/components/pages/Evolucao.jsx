import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { collection, getDocs, query, orderBy, limit, startAfter, addDoc, deleteDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import PROTOCOLO_BASE from '../../config/protocolo'
import { useUser } from '../../context/UserContext'
import { useThemeColor } from '../../utils/themes'
import TrendChart from '../../components/TrendChart'
import {
  Dumbbell, BarChart3, Trophy, Target, Flame,
  Activity, Save, ChevronDown, ChevronUp, Minus, Weight, Trash, Pencil, X,
  Search, Clock3, TrendingUp, Gauge, CalendarDays, Check, RefreshCw,
} from 'lucide-react'

function dataLocalStr(data) {
  const d = data || new Date()
  const offset = d.getTimezoneOffset()
  const local = new Date(d.getTime() - offset * 60000)
  return local.toISOString().split('T')[0]
}

const PAD = { top: 24, right: 16, bottom: 44, left: 56 }
const H = 280

function encontrarMeta(nome) {
  for (const rotina of Object.values(PROTOCOLO_BASE)) {
    const ex = (rotina.exercicios || []).find(e => e.nome === nome)
    if (ex) return ex.meta_reps
  }
  return null
}

function nomeRotina(id) {
  return PROTOCOLO_BASE[id]?.nome || id
}

function parseMetaTeto(meta) {
  if (!meta) return Infinity
  const parts = meta.split('-').map(Number)
  return parts.length === 2 ? Math.max(...parts) : parts[0]
}

function normalizarTexto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function epley1RM(carga, reps) {
  return Math.round((Number(carga) || 0) * (1 + Math.min(Number(reps) || 0, 12) / 30))
}

function volumePorTreino(treino) {
  return (treino.exercicios || []).reduce(
    (total, ex) => total + ((Number(ex.carga_top) || 0) * (Number(ex.reps_top) || 0)),
    0,
  )
}

function diasDesde(data, agora = new Date()) {
  if (!data) return null
  const inicio = new Date(data)
  inicio.setHours(0, 0, 0, 0)
  const hoje = new Date(agora)
  hoje.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((hoje - inicio) / 86400000))
}

function formatarVolume(valor) {
  if (valor >= 1000000) return `${(valor / 1000000).toFixed(1).replace('.', ',')} mi`
  if (valor >= 1000) return `${(valor / 1000).toFixed(1).replace('.', ',')} mil`
  return valor.toLocaleString('pt-BR')
}

const CAMPOS_MEDIDA = [
  { key: 'peso', label: 'Peso', unidade: 'kg', lowerBetter: false },
  { key: 'cintura', label: 'Cintura', unidade: 'cm', lowerBetter: true },
  { key: 'abdomen', label: 'Abdômen', unidade: 'cm', lowerBetter: true },
  { key: 'braco_dir', label: 'Braço', unidade: 'cm', lowerBetter: false },
  { key: 'peito', label: 'Peito', unidade: 'cm', lowerBetter: false },
  { key: 'coxa_dir', label: 'Coxa', unidade: 'cm', lowerBetter: false },
]

export default function Evolucao() {
  const user = useUser()
  const uid = user?.uid
  const [aba, setAba] = useState('treino')

  const [todosTreinos, setTodosTreinos] = useState([])
  const [exercicios, setExercicios] = useState([])
  const [selecionado, setSelecionado] = useState('')
  const [rotinaFiltro, setRotinaFiltro] = useState('todas')
  const [buscaExercicio, setBuscaExercicio] = useState('')
  const [menuExercicioAberto, setMenuExercicioAberto] = useState(false)
  const [graficoMetrica, setGraficoMetrica] = useState('carga')
  const [janelaGrafico, setJanelaGrafico] = useState('todos')
  const [janelaDashboard, setJanelaDashboard] = useState(28)
  const [tooltip, setTooltip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)

  const [medidas, setMedidas] = useState([])
  const [medidaData, setMedidaData] = useState(dataLocalStr())
  const [novaMedida, setNovaMedida] = useState({ peso: '', cintura: '', abdomen: '', braco_dir: '', peito: '', coxa_dir: '' })
  const [savingMedida, setSavingMedida] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [medidaGrafico, setMedidaGrafico] = useState('peso')
  const [filtroPeriodo, setFiltroPeriodo] = useState('tudo')
  const [limiteRegistros, setLimiteRegistros] = useState(5)
  const [lastTreinoDoc, setLastTreinoDoc] = useState(null)
  const [lastCorporalDoc, setLastCorporalDoc] = useState(null)
  const [carregandoMaisTreinos, setCarregandoMaisTreinos] = useState(false)
  const [carregandoMaisCorporais, setCarregandoMaisCorporais] = useState(false)
  const exercicioBuscaRef = useRef(null)
  const pageRef = useRef(null)
  const [agora] = useState(() => new Date())
  const brandColor = useThemeColor('--brand')
  const accentColor = useThemeColor('--accent')
  const [containerWidth, setContainerWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 375)

  // Mede o conteúdo real da página. Usar window.innerWidth aqui fazia o SVG
  // ignorar o max-width do Layout e estourar o card em telas grandes.
  useEffect(() => {
    const elemento = pageRef.current
    if (!elemento) return undefined
    const medir = () => setContainerWidth(Math.max(280, Math.floor(elemento.getBoundingClientRect().width)))
    medir()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', medir)
      return () => window.removeEventListener('resize', medir)
    }
    const observer = new ResizeObserver(medir)
    observer.observe(elemento)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const fecharMenu = (event) => {
      if (!exercicioBuscaRef.current?.contains(event.target)) setMenuExercicioAberto(false)
    }
    document.addEventListener('pointerdown', fecharMenu)
    return () => document.removeEventListener('pointerdown', fecharMenu)
  }, [])

  const carregarTreinos = useCallback(async () => {
    setLoading(true); setErro(null)
    try {
      if (!db || !uid) { setErro('Sessão do usuário ainda não está pronta.'); setLoading(false); return }
      const q = query(
        collection(db, 'users', uid, 'historico_treinos'),
        orderBy('data', 'desc'),
        limit(20)
      )
      const snap = await getDocs(q)
      const docs = snap.docs.map(d => {
        const raw = d.data()
        return { id: d.id, ...raw, data: raw.data?.toDate?.() || (raw.data ? new Date(raw.data) : new Date()) }
      })
      setTodosTreinos([...docs].reverse())
      setLastTreinoDoc(snap.docs[snap.docs.length - 1] || null)
      const nomes = new Set()
      docs.forEach(t => { if (t.exercicios) t.exercicios.forEach(ex => { if (ex.nome) nomes.add(ex.nome) }) })
      setExercicios([...nomes].sort())
    } catch (err) { setErro(`Erro: ${err.message}`) }
    setLoading(false)
  }, [uid])

  const carregarMedidas = useCallback(async () => {
    try {
      if (!uid) return
      const q = query(
        collection(db, 'users', uid, 'historico_corporal'),
        orderBy('data', 'desc'),
        limit(20)
      )
      const snap = await getDocs(q)
      const docs = snap.docs.map(d => {
        const raw = d.data()
        return { id: d.id, ...raw, data: raw.data?.toDate?.() || (raw.data ? new Date(raw.data) : new Date()) }
      })
      setMedidas(docs)
      setLastCorporalDoc(snap.docs[snap.docs.length - 1] || null)
    } catch (err) { setErro(`Erro ao carregar medidas: ${err.message}`) }
  }, [uid])

  const carregarMaisTreinos = async () => {
    if (!lastTreinoDoc) return
    setCarregandoMaisTreinos(true)
    try {
      const q = query(
        collection(db, 'users', user.uid, 'historico_treinos'),
        orderBy('data', 'desc'),
        startAfter(lastTreinoDoc),
        limit(20)
      )
      const snap = await getDocs(q)
      const docs = snap.docs.map(d => {
        const raw = d.data()
        return { id: d.id, ...raw, data: raw.data?.toDate?.() || (raw.data ? new Date(raw.data) : new Date()) }
      })
      setTodosTreinos(prev => [...docs.reverse(), ...prev])
      setLastTreinoDoc(snap.docs[snap.docs.length - 1] || null)
      const nomes = new Set()
      docs.forEach(t => { if (t.exercicios) t.exercicios.forEach(ex => { if (ex.nome) nomes.add(ex.nome) }) })
      setExercicios(prev => [...new Set([...prev, ...nomes])].sort())
    } catch (err) { setErro(`Erro: ${err.message}`) }
    setCarregandoMaisTreinos(false)
  }

  const carregarMaisCorporais = async () => {
    if (!lastCorporalDoc) return
    setCarregandoMaisCorporais(true)
    try {
      const q = query(
        collection(db, 'users', user.uid, 'historico_corporal'),
        orderBy('data', 'desc'),
        startAfter(lastCorporalDoc),
        limit(20)
      )
      const snap = await getDocs(q)
      const docs = snap.docs.map(d => {
        const raw = d.data()
        return { id: d.id, ...raw, data: raw.data?.toDate?.() || (raw.data ? new Date(raw.data) : new Date()) }
      })
      setMedidas(prev => [...prev, ...docs])
      setLastCorporalDoc(snap.docs[snap.docs.length - 1] || null)
    } catch (err) { setErro(`Erro: ${err.message}`) }
    setCarregandoMaisCorporais(false)
  }

  // O carregamento sincroniza o estado local com o Firestore ao montar a tela.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { carregarTreinos() }, [carregarTreinos])

  function validarMedida(valor, min, max, nome) {
    const v = parseFloat(String(valor || '').replace(',', '.'))
    if (isNaN(v) || v < min || v > max) { setErro(`${nome} inválido — deve ser entre ${min} e ${max}.`); return null }
    return v
  }

  const registrarMedida = async () => {
    const camposPreenchidos = CAMPOS_MEDIDA.every(c => novaMedida[c.key] !== '')
    if (!camposPreenchidos) return
    setSavingMedida(true); setErro(null)
    const limites = { peso: [0, 500], cintura: [0, 200], abdomen: [0, 200], braco_dir: [0, 100], peito: [0, 200], coxa_dir: [0, 100] }
    const registro = { data: new Date(medidaData + 'T12:00:00') }
    for (const c of CAMPOS_MEDIDA) {
      const v = validarMedida(novaMedida[c.key], ...limites[c.key], c.label)
      if (v === null) { setSavingMedida(false); return }
      registro[c.key] = v
    }
    try {
      if (editandoId) {
        await updateDoc(doc(db, 'users', user.uid, 'historico_corporal', editandoId), { ...registro, updatedAt: serverTimestamp() })
      } else {
        await addDoc(collection(db, 'users', user.uid, 'historico_corporal'), { ...registro, createdAt: serverTimestamp() })
      }
      setNovaMedida({ peso: '', cintura: '', abdomen: '', braco_dir: '', peito: '', coxa_dir: '' })
      setEditandoId(null)
      await carregarMedidas()
    } catch (err) { setErro(`Erro ao salvar: ${err.message}`) }
    setSavingMedida(false)
  }

  const editarMedida = (m) => {
    setEditandoId(m.id)
    setMedidaData(dataLocalStr(m.data))
    setNovaMedida({
      peso: String(m.peso ?? ''),
      cintura: String(m.cintura ?? ''),
      abdomen: String(m.abdomen ?? ''),
      braco_dir: String(m.braco_dir ?? ''),
      peito: String(m.peito ?? ''),
      coxa_dir: String(m.coxa_dir ?? ''),
    })
  }

  const cancelarEdicao = () => {
    setEditandoId(null)
    setNovaMedida({ peso: '', cintura: '', abdomen: '', braco_dir: '', peito: '', coxa_dir: '' })
    setMedidaData(dataLocalStr())
  }

  const deletarMedida = async (id, dataStr) => {
    if (!window.confirm(`Deseja apagar a medida do dia ${dataStr}? Essa ação não pode ser desfeita.`)) return
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'historico_corporal', id))
      if (editandoId === id) cancelarEdicao()
      await carregarMedidas()
    } catch (err) { setErro(`Erro ao deletar: ${err.message}`) }
  }

  const rotinasDisponiveis = [...new Set(todosTreinos.map(t => t.rotina_id).filter(Boolean))]

  const exerciciosFiltrados = useMemo(() => {
    const termo = normalizarTexto(buscaExercicio)
    if (!termo) return exercicios.slice(0, 8)
    return exercicios.filter(nome => normalizarTexto(nome).includes(termo)).slice(0, 12)
  }, [buscaExercicio, exercicios])

  const dadosTreino = useMemo(() => {
    if (!selecionado) return []
    return todosTreinos
      .filter(t => rotinaFiltro === 'todas' || t.rotina_id === rotinaFiltro)
      .filter(t => t.exercicios?.some(ex => ex.nome === selecionado))
      .map(t => {
        const ex = t.exercicios.find(e => e.nome === selecionado)
        if (!ex || ex.carga_top == null) return null
        return {
          data: t.data,
          carga: Number(ex.carga_top) || 0,
          reps: Number(ex.reps_top) || 0,
          estimado: epley1RM(ex.carga_top, ex.reps_top),
        }
      })
      .filter(Boolean)
  }, [todosTreinos, rotinaFiltro, selecionado])

  const dadosTreinoVisiveis = useMemo(() => {
    if (janelaGrafico === 'todos') return dadosTreino
    return dadosTreino.slice(-Number(janelaGrafico))
  }, [dadosTreino, janelaGrafico])

  const ultimoTreino = dadosTreino.length > 0 ? dadosTreino[dadosTreino.length - 1] : null
  const recorde = dadosTreino.length > 0 ? Math.max(...dadosTreino.map(d => d.carga)) : null
  const metaReps = encontrarMeta(selecionado)
  const tetoMeta = parseMetaTeto(metaReps)
  const atingiuMeta = ultimoTreino && tetoMeta !== Infinity ? ultimoTreino.reps >= tetoMeta : false

  const stats = useMemo(() => {
    const treinos = todosTreinos
    const limite = new Date(agora)
    limite.setDate(limite.getDate() - janelaDashboard)
    limite.setHours(0, 0, 0, 0)
    const limiteAnterior = new Date(limite)
    limiteAnterior.setDate(limiteAnterior.getDate() - janelaDashboard)

    const treinosTotal = treinos.length
    const volumeTotal = treinos.reduce((acc, t) => acc + volumePorTreino(t), 0)
    const treinosPeriodo = treinos.filter(t => t.data >= limite)
    const treinosPeriodoAnterior = treinos.filter(t => t.data >= limiteAnterior && t.data < limite)
    const volumePeriodo = treinosPeriodo.reduce((acc, t) => acc + volumePorTreino(t), 0)
    const volumePeriodoAnterior = treinosPeriodoAnterior.reduce((acc, t) => acc + volumePorTreino(t), 0)

    const inicioSemana = new Date(agora)
    inicioSemana.setHours(0, 0, 0, 0)
    inicioSemana.setDate(agora.getDate() - agora.getDay() + (agora.getDay() === 0 ? -6 : 1)) // segunda
    const inicioSemanaAnterior = new Date(inicioSemana)
    inicioSemanaAnterior.setDate(inicioSemanaAnterior.getDate() - 7)

    const treinosSemana = treinos.filter(t => t.data >= inicioSemana).length
    const treinosSemanaAnterior = treinos.filter(t => t.data >= inicioSemanaAnterior && t.data < inicioSemana).length
    const volumeSemana = treinos.filter(t => t.data >= inicioSemana).reduce((acc, t) => acc + volumePorTreino(t), 0)
    const volumeSemanaAnterior = treinos.filter(t => t.data >= inicioSemanaAnterior && t.data < inicioSemana).reduce((acc, t) => acc + volumePorTreino(t), 0)

    // Sequência atual (dias consecutivos com treino)
    const diasComTreino = new Set()
    treinos.forEach(t => {
      const d = new Date(t.data); d.setHours(0, 0, 0, 0); diasComTreino.add(d.getTime())
    })
    let sequenciaAtual = 0
    let cursor = new Date(agora); cursor.setHours(0, 0, 0, 0)
    while (diasComTreino.has(cursor.getTime())) {
      sequenciaAtual++
      cursor.setDate(cursor.getDate() - 1)
    }

    // Melhor 1RM estimado entre todos os exercícios
    let melhor1RM = null
    treinos.forEach(t => {
      (t.exercicios || []).forEach(ex => {
        if (ex.carga_top && ex.reps_top) {
          const um = epley1RM(ex.carga_top, ex.reps_top)
          if (!melhor1RM || um > melhor1RM.um) {
            melhor1RM = { nome: ex.nome, carga: ex.carga_top, reps: ex.reps_top, um }
          }
        }
      })
    })

    const exerciciosAtivos = new Set()
    treinosPeriodo.forEach(t => (t.exercicios || []).forEach(ex => ex.nome && exerciciosAtivos.add(ex.nome)))
    const ultimo = treinos[treinos.length - 1]
    const diasSemTreino = ultimo ? diasDesde(ultimo.data, agora) : null
    const progressoPeriodo = volumePeriodoAnterior > 0
      ? Math.round(((volumePeriodo - volumePeriodoAnterior) / volumePeriodoAnterior) * 100)
      : null
    const ritmo = treinosPeriodo.length ? (treinosPeriodo.length / Math.max(janelaDashboard / 7, 1)).toFixed(1) : '0,0'

    return {
      treinosTotal, volumeTotal, volumeSemana, volumeSemanaAnterior,
      treinosSemana, treinosSemanaAnterior, sequenciaAtual, melhor1RM,
      treinosPeriodo: treinosPeriodo.length, volumePeriodo, volumePeriodoAnterior,
      progressoPeriodo, exerciciosAtivos: exerciciosAtivos.size, diasSemTreino, ritmo,
    }
  }, [agora, todosTreinos, janelaDashboard])

  // Top PRs (top 5 por carga máxima) por exercício
  const topPRs = useMemo(() => {
    const prMap = new Map() // nome → { carga, reps, data }
    todosTreinos.forEach(t => {
      (t.exercicios || []).forEach(ex => {
        if (!ex.carga_top) return
        const atual = prMap.get(ex.nome)
        if (!atual || ex.carga_top > atual.carga) {
          prMap.set(ex.nome, { carga: ex.carga_top, reps: ex.reps_top, data: t.data })
        }
      })
    })
    return [...prMap.entries()]
      .map(([nome, v]) => ({ nome, ...v, um: epley1RM(v.carga, v.reps) }))
      .sort((a, b) => b.carga - a.carga)
      .slice(0, 5)
  }, [todosTreinos])


  const recomendacao = useMemo(() => {
    if (!stats.treinosTotal) return {
      titulo: 'Seu próximo passo começa aqui',
      texto: 'Registre seu primeiro treino para transformar esforço em dados úteis.',
      tom: 'brand',
    }
    if (stats.diasSemTreino > 7) return {
      titulo: `Você está há ${stats.diasSemTreino} dias sem treinar`,
      texto: 'Uma sessão curta já recoloca sua sequência em movimento.',
      tom: 'warning',
    }
    if (selecionado && atingiuMeta) return {
      titulo: 'Meta de repetições alcançada',
      texto: `Suba a carga de ${selecionado} na próxima sessão e mantenha a técnica.`,
      tom: 'success',
    }
    if (stats.progressoPeriodo != null && stats.progressoPeriodo < -10) return {
      titulo: 'Seu volume caiu nesta janela',
      texto: 'Compare a rotina e reduza a distância entre as sessões desta semana.',
      tom: 'warning',
    }
    return {
      titulo: 'Ritmo consistente',
      texto: `Você está fazendo ${stats.ritmo} sessões por semana. Continue registrando cada top set.`,
      tom: 'success',
    }
  }, [atingiuMeta, selecionado, stats])

  const chartDims = (() => {
    if (dadosTreinoVisiveis.length < 2) return null
    const w = Math.max(containerWidth - 32, 280)
    const plotW = w - PAD.left - PAD.right
    const plotH = H - PAD.top - PAD.bottom
    const valores = dadosTreinoVisiveis.map(d => graficoMetrica === 'carga' ? d.carga : d.estimado)
    const maxValor = Math.max(...valores)
    const minValor = Math.min(...valores)
    const margem = Math.max((maxValor - minValor) * 0.15, maxValor * 0.05, 2)
    const floor = Math.max(0, Math.floor((minValor - margem) / 5) * 5)
    const ceiling = Math.ceil((maxValor + margem) / 5) * 5 || 5
    const amplitude = Math.max(ceiling - floor, 1)

    const points = dadosTreinoVisiveis.map((d, i) => ({
      ...d,
      valor: graficoMetrica === 'carga' ? d.carga : d.estimado,
      x: PAD.left + (i / (dadosTreinoVisiveis.length - 1)) * plotW,
      y: PAD.top + plotH - ((graficoMetrica === 'carga' ? d.carga : d.estimado) - floor) / amplitude * plotH,
    }))

    const step = Math.max(1, Math.round(amplitude / 4))
    const yTicks = []
    for (let v = floor; v <= ceiling; v += step) {
      yTicks.push({ value: v, y: PAD.top + plotH - ((v - floor) / amplitude) * plotH })
    }

    return { w, points, yTicks, floor, ceiling }
  })()

  const ultimaMedida = medidas[0]
  const medidaAnterior = medidas[1]

  const medidasFiltradas = useMemo(() => {
    if (filtroPeriodo === 'tudo') return [...medidas]
    const corte = new Date()
    corte.setDate(corte.getDate() - (filtroPeriodo === 'semana' ? 7 : 30))
    return medidas.filter(m => m.data >= corte)
  }, [medidas, filtroPeriodo])

  const primeiraMedida = medidasFiltradas.length > 0 ? medidasFiltradas[medidasFiltradas.length - 1] : null

  function diffValor(atual, anterior) {
    if (atual == null || anterior == null) return null
    return (atual - anterior).toFixed(1)
  }

  return (
    <div ref={pageRef} className="evolution-page flex flex-col gap-3 pt-2 pb-4">
      <header className="evolution-header">
        <div><p className="home-kicker">Dados que mostram seu trabalho</p><h1 className="text-2xl font-bold tracking-tight text-white">Sua evolução</h1><p>Entenda o que está avançando e onde ajustar a próxima sessão.</p></div>
        <div className="evolution-header-mark" aria-hidden="true"><BarChart3 size={18} /></div>
      </header>

      <div className="evolution-tabs" role="tablist" aria-label="Visões da evolução">
        <button
          type="button"
          role="tab"
          aria-selected={aba === 'treino'}
          onClick={() => setAba('treino')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            aba === 'treino' ? 'tab-active' : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          Dashboard & Gráficos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={aba === 'corporal'}
          onClick={() => { setAba('corporal'); if (medidas.length === 0) carregarMedidas() }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            aba === 'corporal' ? 'tab-active' : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          Medidas Corporais
        </button>
      </div>

      {erro && <div className="evolution-feedback" role="alert"><span>{erro}</span><button type="button" onClick={() => setErro(null)} aria-label="Fechar aviso"><X size={14} /></button></div>}

      {aba === 'treino' ? (
        <>
          {/* === DASHBOARD DE TREINO === */}
          <div className="space-y-3">
            <div className="card-premium p-4 overflow-hidden">
              <div className="relative z-[1] flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="section-label">Leitura do treino</span>
                  <h2 className="mt-3 text-lg font-bold text-white leading-tight">{recomendacao.titulo}</h2>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-400 max-w-[34rem]">{recomendacao.texto}</p>
                </div>
                <div className={`shrink-0 rounded-2xl p-2.5 ${recomendacao.tom === 'warning' ? 'bg-amber-400/10 text-amber-300' : recomendacao.tom === 'success' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-[var(--brand)]/15 text-[var(--brand-bright)]'}`}>
                  {recomendacao.tom === 'warning' ? <Clock3 size={18} /> : recomendacao.tom === 'success' ? <TrendingUp size={18} /> : <Gauge size={18} />}
                </div>
              </div>
              <div className="relative z-[1] mt-4 flex flex-wrap items-center gap-2 text-[10px] text-neutral-500">
                <span className="inline-flex items-center gap-1.5"><CalendarDays size={12} /> Janela: {janelaDashboard} dias</span>
                <span className="h-3 w-px bg-white/10" />
                <span>{stats.treinosPeriodo} sessões analisadas</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="section-label">Resumo de performance</span>
              <div className="flex rounded-xl border border-white/10 bg-black/20 p-0.5" role="group" aria-label="Período do dashboard">
                {[{ value: 28, label: '4 sem' }, { value: 56, label: '8 sem' }, { value: 84, label: '12 sem' }].map(opcao => (
                  <button key={opcao.value} type="button" onClick={() => setJanelaDashboard(opcao.value)}
                    className={`rounded-lg px-2 py-1 text-[10px] font-semibold transition ${janelaDashboard === opcao.value ? 'bg-[var(--brand)]/20 text-[var(--brand-bright)]' : 'text-neutral-500 hover:text-white'}`}>
                    {opcao.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Activity, label: 'Sessões', value: stats.treinosPeriodo, detail: `${stats.ritmo}/semana`, color: 'text-[var(--brand-bright)]' },
                { icon: BarChart3, label: 'Volume', value: formatarVolume(stats.volumePeriodo), detail: 'kg × reps', color: 'text-[var(--accent-bright)]' },
                { icon: Dumbbell, label: 'Exercícios', value: stats.exerciciosAtivos, detail: 'com histórico', color: 'text-[var(--highlight)]' },
                { icon: Flame, label: 'Sequência', value: stats.sequenciaAtual, detail: stats.sequenciaAtual === 1 ? 'dia ativo' : 'dias ativos', color: 'text-amber-300' },
              ].map(item => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="card-premium p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase tracking-[0.12em] text-neutral-500">{item.label}</span>
                      <Icon size={14} className={item.color} aria-hidden="true" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold tracking-tight text-white num">{item.value}</span>
                    </div>
                    <p className="mt-1 truncate text-[10px] text-neutral-500">{item.detail}</p>
                  </div>
                )
              })}
            </div>

            <div className="card-premium p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="section-label">Recordes recentes</span>
                  <p className="mt-1 text-[10px] text-neutral-500">Maior carga registrada por exercício</p>
                </div>
                {stats.melhor1RM && <span className="text-right text-[10px] text-neutral-500">Melhor 1RM<br /><strong className="text-sm text-white num">{stats.melhor1RM.um} kg</strong></span>}
              </div>
              {topPRs.length > 0 ? (
                <div className="mt-3 grid gap-1.5">
                  {topPRs.map((pr, i) => (
                    <button key={pr.nome} type="button" onClick={() => { setSelecionado(pr.nome); setBuscaExercicio(pr.nome); setTooltip(null) }}
                      className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-left transition hover:border-[var(--brand)]/30 hover:bg-[var(--brand)]/10 active:scale-[0.99]">
                      <span className="flex min-w-0 items-center gap-2"><span className="w-4 shrink-0 font-mono text-[10px] text-neutral-600">{i + 1}</span><span className="truncate text-xs text-neutral-200">{pr.nome}</span></span>
                      <span className="shrink-0 text-right"><strong className="text-xs text-white num">{pr.carga} kg</strong><span className="ml-1.5 text-[10px] text-neutral-500 num">×{pr.reps}</span></span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-xl border border-dashed border-white/10 p-3 text-center text-xs text-neutral-500">Seus recordes aparecerão depois do primeiro treino.</p>
              )}
            </div>
          </div>

          {loading ? (
            <div className="space-y-2"><div className="skeleton skeleton-card" /><div className="skeleton skeleton-card" /></div>
          ) : !exercicios.length ? (
            <p className="text-neutral-600 text-center py-8 text-sm">Nenhum treino registrado ainda.</p>
          ) : (
            <>
              <div ref={exercicioBuscaRef} className="relative z-20">
                <label htmlFor="buscar-exercicio" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">Exercício</label>
                <div className={`flex items-center gap-2 rounded-2xl border bg-neutral-900/70 px-3 transition ${menuExercicioAberto ? 'border-[var(--brand)]/60 shadow-[0_0_0_3px_rgba(var(--brand-rgb),0.12)]' : 'border-white/10'}`}>
                  <Search size={16} className="shrink-0 text-neutral-500" aria-hidden="true" />
                  <input
                    id="buscar-exercicio"
                    type="search"
                    value={buscaExercicio}
                    onChange={event => { setBuscaExercicio(event.target.value); setMenuExercicioAberto(true) }}
                    onFocus={() => setMenuExercicioAberto(true)}
                    onKeyDown={event => {
                      if (event.key === 'Escape') setMenuExercicioAberto(false)
                      if (event.key === 'Enter' && exerciciosFiltrados[0]) {
                        setSelecionado(exerciciosFiltrados[0]); setBuscaExercicio(exerciciosFiltrados[0]); setMenuExercicioAberto(false); setTooltip(null)
                      }
                    }}
                    placeholder="Buscar exercício..."
                    autoComplete="off"
                    className="min-w-0 flex-1 border-0 bg-transparent px-0 py-3 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-0 focus:shadow-none"
                  />
                  {selecionado && <button type="button" aria-label="Limpar exercício" onClick={() => { setSelecionado(''); setBuscaExercicio(''); setTooltip(null) }} className="rounded-full p-1 text-neutral-500 hover:bg-white/10 hover:text-white"><X size={14} /></button>}
                </div>
                {menuExercicioAberto && (
                  <div className="absolute left-0 right-0 top-[calc(100%+0.45rem)] max-h-64 overflow-y-auto rounded-2xl border border-white/10 bg-[#110e19] p-1.5 shadow-2xl shadow-black/50" role="listbox" aria-label="Exercícios encontrados">
                    {exerciciosFiltrados.length > 0 ? exerciciosFiltrados.map(nome => (
                      <button key={nome} type="button" role="option" aria-selected={selecionado === nome}
                        onClick={() => { setSelecionado(nome); setBuscaExercicio(nome); setMenuExercicioAberto(false); setTooltip(null) }}
                        className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition ${selecionado === nome ? 'bg-[var(--brand)]/20 text-white' : 'text-neutral-300 hover:bg-white/8 hover:text-white'}`}>
                        <span className="truncate">{nome}</span>
                        {selecionado === nome && <Check size={14} className="shrink-0 text-[var(--brand-bright)]" />}
                      </button>
                    )) : <p className="px-3 py-4 text-center text-xs text-neutral-500">Nenhum exercício encontrado.</p>}
                  </div>
                )}
              </div>

              {rotinasDisponiveis.length > 1 && (
                <div className="relative">
                  <select value={rotinaFiltro} onChange={e => { setRotinaFiltro(e.target.value); setTooltip(null) }}
                    className="w-full color-scheme-dark bg-neutral-900/70 backdrop-blur-md border border-white/10 text-white p-3 rounded-2xl text-sm appearance-none outline-none focus:ring-2 focus:ring-cyan-400/30 transition-all">
                    <option value="todas">Todas as rotinas</option>
                    {rotinasDisponiveis.map(id => <option key={id} value={id}>{nomeRotina(id)}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-neutral-500">
                    <BarChart3 size={14} />
                  </div>
                </div>
              )}

              {selecionado && dadosTreino.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="card-premium p-3 flex flex-col items-center justify-center text-center gap-1">
                    <Trophy size={16} className="text-cyan-400" />
                    <span className="text-lg font-bold text-white tracking-tight">{recorde} <span className="text-xs font-normal text-neutral-400">kg</span></span>
                    <span className="text-[9px] text-neutral-500 uppercase tracking-wider">Recorde Absoluto</span>
                  </div>

                  <div className="card-premium p-3 flex flex-col items-center justify-center text-center gap-1">
                    <Flame size={16} className="text-emerald-400" />
                    <span className="text-lg font-bold text-white tracking-tight">
                      {ultimoTreino.carga} <span className="text-xs font-normal text-neutral-400">kg</span>
                      <span className="text-base text-neutral-300 font-normal"> × </span>
                      {ultimoTreino.reps}
                    </span>
                    <span className="text-[9px] text-neutral-500 uppercase tracking-wider">Última Top Set</span>
                  </div>

                  <div className={`rounded-2xl p-3 flex flex-col items-center justify-center text-center gap-1 border ${
                    atingiuMeta ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-cyan-500/10 border-cyan-500/20'
                  }`}>
                    <Target size={16} className={atingiuMeta ? 'text-emerald-400' : 'text-cyan-400'} />
                    <span className={`text-sm font-bold tracking-tight ${atingiuMeta ? 'text-emerald-400' : 'text-cyan-400'}`}>
                      {atingiuMeta ? 'Subir Carga! 🔥' : 'Buscar +1 Rep 🎯'}
                    </span>
                    <span className="text-[9px] text-neutral-500 uppercase tracking-wider">Próximo Objetivo</span>
                  </div>
                </div>
              )}

              {!selecionado && <p className="text-neutral-600 text-center py-8 text-sm">Escolha um exercício.</p>}

              {selecionado && dadosTreino.length < 2 && (
                <div className="card-premium p-6 text-center">
                  <Dumbbell size={28} className="mx-auto text-neutral-700 mb-3" />
                  <p className="text-neutral-500 text-sm">
                    {dadosTreino.length === 0 ? 'Sem dados ainda. Vá treinar!' : 'Mais um treino para gerar o gráfico.'}
                  </p>
                </div>
              )}

              {selecionado && dadosTreino.length >= 2 && chartDims && (
                <div className="relative card-premium p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 px-1">
                    <div>
                      <span className="section-label">Progressão</span>
                      <p className="mt-1 text-[10px] text-neutral-500">{dadosTreinoVisiveis.length} registros · {graficoMetrica === 'carga' ? 'carga da top set' : '1RM estimado'}</p>
                    </div>
                    {(() => {
                      if (dadosTreino.length < 2) return null
                      const primeiro = dadosTreino[0].carga
                      const ultimo = dadosTreino[dadosTreino.length - 1].carga
                      const diff = ultimo - primeiro
                      const pct = primeiro > 0 ? ((diff / primeiro) * 100).toFixed(1) : 0
                      if (diff > 0) return <span className="text-[10px] font-mono text-emerald-400 num">+{diff}kg (+{pct}%) ↑</span>
                      if (diff < 0) return <span className="text-[10px] font-mono text-red-400 num">{diff}kg ({pct}%) ↓</span>
                      return <span className="text-[10px] font-mono text-neutral-500 num">estável =</span>
                    })()}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex rounded-xl border border-white/10 bg-black/20 p-0.5" role="group" aria-label="Métrica do gráfico">
                      {[{ value: 'carga', label: 'Carga' }, { value: 'estimado', label: '1RM estimado' }].map(opcao => (
                        <button key={opcao.value} type="button" onClick={() => { setGraficoMetrica(opcao.value); setTooltip(null) }}
                          className={`rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition ${graficoMetrica === opcao.value ? 'bg-[var(--brand)]/20 text-[var(--brand-bright)]' : 'text-neutral-500 hover:text-white'}`}>
                          {opcao.label}
                        </button>
                      ))}
                    </div>
                    <select value={janelaGrafico} onChange={event => { setJanelaGrafico(event.target.value); setTooltip(null) }}
                      className="color-scheme-dark rounded-xl border border-white/10 bg-black/20 px-2.5 py-1.5 text-[10px] text-neutral-300 outline-none focus:border-[var(--brand)]/50">
                      <option value="todos">Todos os registros</option>
                      <option value="6">Últimos 6</option>
                      <option value="12">Últimos 12</option>
                    </select>
                  </div>
                  <div className="relative">
                  <svg viewBox={`0 0 ${chartDims.w} ${H}`} className="mt-3 h-auto w-full" role="img" aria-label={`Gráfico de evolução de ${selecionado}`} style={{ touchAction: 'manipulation' }}>
                    <defs>
                      <filter id="line-glow">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                    </defs>
                    {chartDims.yTicks.map(t => (
                      <g key={t.value}>
                        <line x1={PAD.left} y1={t.y} x2={chartDims.w - PAD.right} y2={t.y} stroke="var(--chart-grid)" strokeWidth="1" />
                        <text x={PAD.left - 8} y={t.y + 3} textAnchor="end" fill="var(--chart-muted)" fontSize="10" fontFamily="Inter, sans-serif">{t.value}</text>
                      </g>
                    ))}
                    {chartDims.points.map((p, i) => (
                      <text key={`l-${i}`} x={p.x} y={H - 8} textAnchor="middle" fill="var(--chart-muted)" fontSize="9" fontFamily="Inter, sans-serif">
                        {p.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </text>
                    ))}
                    <polyline fill="none" stroke={graficoMetrica === 'carga' ? brandColor : accentColor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
                      filter="url(#line-glow)" points={chartDims.points.map(p => `${p.x},${p.y}`).join(' ')} />
                    {/* Hit areas maiores (invisíveis) para toque fácil em mobile */}
                    {chartDims.points.map((p, i) => (
                      <rect key={`hit-${i}`} x={p.x - 18} y={0} width={36} height={H} fill="transparent"
                        onClick={() => setTooltip(tooltip === i ? null : i)}
                        className="cursor-pointer" />
                    ))}
                    {chartDims.points.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r={tooltip === i ? 7 : 5} fill="var(--chart-fill)" stroke={graficoMetrica === 'carga' ? brandColor : accentColor}
                        strokeWidth="2.5" className="cursor-pointer transition-all"
                        style={{ filter: `drop-shadow(0 0 4px ${brandColor}66)`, transition: 'r 150ms ease-out' }} />
                    ))}
                  </svg>
                  </div>
                  {tooltip !== null && chartDims.points[tooltip] && (() => {
                    const p = chartDims.points[tooltip]
                    const prev = tooltip > 0 ? chartDims.points[tooltip - 1] : null
                    const diffCarga = prev ? p.carga - prev.carga : 0
                    return (
                      <div className="absolute z-10 pointer-events-none"
                        style={{ left: Math.min(Math.max(p.x - 50, 4), chartDims.w - 110), top: Math.max(p.y - 60, 4) }}>
                        <div className="bg-neutral-900/95 backdrop-blur-md text-white rounded-xl shadow-2xl border border-white/15 px-3 py-2 min-w-[100px]">
                          <p className="text-[10px] text-neutral-500 uppercase tracking-wider leading-none">{p.data.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}</p>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-lg font-bold text-white num">{p.valor}</span>
                            <span className="text-[10px] text-neutral-500">kg</span>
                            <span className="text-base text-neutral-400 mx-0.5">×</span>
                            <span className="text-base font-semibold text-white num">{p.reps}</span>
                            <span className="text-[10px] text-neutral-500">reps</span>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-1 text-[10px]">
                            <span className="text-neutral-500 num">Top set: {p.carga} kg × {p.reps}</span>
                            {prev && (
                              <span className={`font-mono num ${diffCarga > 0 ? 'text-emerald-400' : diffCarga < 0 ? 'text-red-400' : 'text-neutral-500'}`}>
                                {diffCarga > 0 ? '+' : ''}{diffCarga}kg
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}

              {selecionado && dadosTreino.length >= 2 && (
                <div className="card-premium p-4">
                  <span className="section-label">Últimos registros</span>
                  <div className="space-y-1 mt-2">
                    {[...dadosTreino].reverse().slice(0, limiteRegistros).map((d, i) => {
                      const idxReal = dadosTreino.length - 1 - i
                      const prev = idxReal > 0 ? dadosTreino[idxReal - 1] : null
                      const diff = prev ? d.carga - prev.carga : 0
                      return (
                        <div key={i} className="flex items-center justify-between text-sm py-1.5 px-1">
                          <span className="text-neutral-500 font-mono text-xs">{d.data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-white font-semibold num">{d.carga}<span className="text-[10px] text-neutral-500 ml-0.5">kg</span></span>
                            <span className="text-[10px] text-neutral-500 num">×{d.reps}</span>
                            {prev && diff !== 0 && (
                              <span className={`text-[10px] font-mono num ${diff > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {diff > 0 ? '+' : ''}{diff}kg
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {dadosTreino.length > limiteRegistros && (
                    <button type="button" onClick={() => setLimiteRegistros(p => p + 5)}
                      className="btn-secondary w-full py-2 text-xs mt-2">
                      Carregar mais ({dadosTreino.length - limiteRegistros} restantes)
                    </button>
                  )}
                  {lastTreinoDoc && (
                    <button type="button" onClick={carregarMaisTreinos} disabled={carregandoMaisTreinos}
                      className="btn-secondary flex w-full items-center justify-center gap-2 py-2 text-xs mt-1">
                      <RefreshCw size={13} className={carregandoMaisTreinos ? 'animate-spin' : ''} />
                      {carregandoMaisTreinos ? 'Carregando...' : 'Carregar mais treinos'}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <>
            <div className="card-premium p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="section-label flex items-center gap-1.5">
                <Activity size={12} className="text-cyan-400" /> {editandoId ? 'Editar Medida' : 'Novo Registro'}
              </span>
              {editandoId && (
                <button type="button" onClick={cancelarEdicao}
                  className="text-neutral-500 hover:text-white flex items-center gap-1 text-xs transition-all active:scale-90">
                  <X size={14} /> Cancelar
                </button>
              )}
            </div>
            <div className="mb-2">
              <label className="text-[9px] text-neutral-600 uppercase tracking-wider block mb-0.5">Data</label>
              <input type="date" value={medidaData} onChange={e => setMedidaData(e.target.value)}
                className="w-full bg-neutral-800 text-white p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-400/30 transition-all" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {CAMPOS_MEDIDA.map(c => (
                <div key={c.key}>
                  <label className="text-[9px] text-neutral-600 uppercase tracking-wider block mb-0.5">{c.label} ({c.unidade})</label>
                  <input type="number" inputMode="decimal" placeholder="0"
                    value={novaMedida[c.key]}
                    onChange={e => setNovaMedida(p => ({ ...p, [c.key]: e.target.value }))}
                    className="w-full bg-neutral-800 text-white placeholder-neutral-700 p-3 rounded-xl text-sm text-center outline-none focus:ring-2 focus:ring-cyan-400/30 transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
                </div>
              ))}
            </div>
            <button type="button" onClick={registrarMedida} disabled={savingMedida || CAMPOS_MEDIDA.some(c => novaMedida[c.key] === '')}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3">
              {savingMedida ? <><Save size={16} className="animate-spin" /> Salvando...</>
              : <><Save size={16} /> {editandoId ? 'Atualizar Medida' : 'Registrar Medidas'}</>}
            </button>
          </div>

          <div className="flex gap-1.5">
            {[
              { key: 'semana', label: 'Semana' },
              { key: 'mes', label: 'Mês' },
              { key: 'tudo', label: 'Tudo' },
            ].map(p => (
              <button type="button" key={p.key} onClick={() => setFiltroPeriodo(p.key)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${filtroPeriodo === p.key ? 'tab-active bg-emerald-500/10' : 'text-neutral-500 hover:text-neutral-300'}`}>
                {p.label}
              </button>
            ))}
          </div>

          {medidas.length > 0 && ultimaMedida && (
            <div className="card-premium p-4">
              <span className="section-label flex items-center gap-1.5 mb-3">
                <Weight size={12} className="text-cyan-400" /> Último Registro
              </span>
              <div className="grid grid-cols-3 gap-2">
                {CAMPOS_MEDIDA.map(c => {
                  const atual = ultimaMedida[c.key]
                  const ant = medidaAnterior ? medidaAnterior[c.key] : null
                  const diff = diffValor(atual, ant)
                  const melhorou = c.lowerBetter ? diff < 0 : diff > 0

                  return (
                    <div key={c.key} className="bg-black/30 rounded-xl p-3 text-center border border-white/5">
                      <div className="text-xs text-neutral-500 font-mono mb-0.5">{c.label}</div>
                      <div className="text-base font-bold text-white tracking-tight">
                        {atual} <span className="text-[10px] font-normal text-neutral-500">{c.unidade}</span>
                      </div>
                      {diff !== null && (
                        <div className={`flex items-center justify-center gap-0.5 text-[10px] font-mono mt-0.5 ${
                          diff === 0 ? 'text-neutral-500' : melhorou ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {diff === 0 ? <Minus size={10} /> : diff > 0 ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                          {Math.abs(diff).toFixed(1)}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {primeiraMedida && ultimaMedida && (
            <div className="card-premium p-4">
              <span className="section-label flex items-center gap-1.5 mb-3">
                <BarChart3 size={12} className="text-cyan-400" /> Comparação
              </span>
              <div className="grid grid-cols-3 gap-2">
                {CAMPOS_MEDIDA.map(c => {
                  const diff = ultimaMedida[c.key] - primeiraMedida[c.key]
                  if (diff === 0) return null
                  const melhorou = c.lowerBetter ? diff < 0 : diff > 0
                  return (
                    <div key={c.key} className="bg-black/30 rounded-xl p-2 text-center border border-white/5">
                      <div className="text-[9px] text-neutral-500">{c.label}</div>
                      <div className={`text-sm font-bold ${melhorou ? 'text-emerald-400' : 'text-red-400'}`}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(1)} <span className="text-[9px] font-normal text-neutral-500">{c.unidade}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {medidas.length >= 2 && (
            <div className="card-premium p-4">
              <span className="section-label flex items-center gap-1.5 mb-2">
                <Activity size={12} className="text-cyan-400" /> Evolução Gráfica
              </span>
              <div className="relative mb-2">
                <select value={medidaGrafico} onChange={e => setMedidaGrafico(e.target.value)}
                  className="w-full bg-neutral-800 text-white p-3 rounded-xl text-xs appearance-none outline-none focus:ring-2 focus:ring-cyan-400/30 transition-all">
                  {CAMPOS_MEDIDA.map(c => <option key={c.key} value={c.key}>{c.label} ({c.unidade})</option>)}
                </select>
              </div>
              {(() => {
                const sorted = [...medidas].sort((a, b) => a.data - b.data)
                const valores = sorted.map(m => m[medidaGrafico]).filter(v => v != null)
                if (valores.length < 2) return <p className="text-neutral-600 text-xs text-center py-4">Mais registros para gerar gráfico.</p>
                const maxVal = Math.max(...valores)
                const minVal = Math.min(...valores)
                const margem = (maxVal - minVal) * 0.15 || maxVal * 0.15 || 5
                const ceiling = Math.ceil((maxVal + margem) / 5) * 5
                const floor = Math.floor(Math.max(minVal - margem, 0) / 5) * 5
                const gH = 200
                const gPad = { top: 16, right: 12, bottom: 32, left: 40 }
                const gW = Math.max(containerWidth - 64, 240)
                const plotW = gW - gPad.left - gPad.right
                const plotH = gH - gPad.top - gPad.bottom
                const amplitude = ceiling - floor || 1

                const pontos = sorted.filter(m => m[medidaGrafico] != null).map((m, i, arr) => ({
                  valor: m[medidaGrafico],
                  data: m.data,
                  x: gPad.left + (i / (arr.length - 1)) * plotW,
                  y: gPad.top + plotH - ((m[medidaGrafico] - floor) / amplitude) * plotH,
                }))

                const yTicks = []
                const step = Math.max(1, Math.round((ceiling - floor) / 4))
                for (let v = floor; v <= ceiling; v += step) {
                  yTicks.push({ valor: v, y: gPad.top + plotH - ((v - floor) / amplitude) * plotH })
                }

                return (
                  <svg viewBox={`0 0 ${gW} ${gH}`} className="w-full h-auto" style={{ touchAction: 'manipulation' }}>
                    <defs>
                      <filter id="m-glow">
                        <feGaussianBlur stdDeviation="2.5" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                    </defs>
                    {yTicks.map(t => (
                      <g key={t.valor}>
                        <line x1={gPad.left} y1={t.y} x2={gW - gPad.right} y2={t.y} stroke="var(--chart-grid)" strokeWidth="1" />
                        <text x={gPad.left - 6} y={t.y + 3} textAnchor="end" fill="var(--chart-muted)" fontSize="9" fontFamily="Inter, sans-serif">{t.valor}</text>
                      </g>
                    ))}
                    {pontos.map((p, i) => (
                      <text key={`xl-${i}`} x={p.x} y={gH - 6} textAnchor="middle" fill="var(--chart-muted)" fontSize="8" fontFamily="Inter, sans-serif">
                        {p.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </text>
                    ))}
                    <polyline fill="none" stroke={accentColor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
                      filter="url(#m-glow)" points={pontos.map(p => `${p.x},${p.y}`).join(' ')} />
                    {pontos.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r="4" fill="var(--chart-fill)" stroke={accentColor} strokeWidth="2"
                        style={{ filter: `drop-shadow(0 0 3px ${accentColor}66)` }} />
                    ))}
                  </svg>
                )
              })()}
            </div>
          )}

          {medidasFiltradas.length >= 2 && (
            <div className="card-premium p-4">
              <span className="section-label flex items-center gap-1.5 mb-2">
                <Activity size={12} className="text-cyan-400" /> Tendência de Peso
              </span>
              <div className="flex justify-center">
                <TrendChart
                  data={[...medidasFiltradas].sort((a, b) => a.data - b.data).filter(m => m.peso != null).map(m => ({ data: m.data, valor: m.peso }))}
                  width={Math.max(containerWidth - 96, 240)}
                  height={200}
                  cor={brandColor} />
              </div>
            </div>
          )}

          {medidas.length >= 1 && (
            <div className="card-premium p-4">
              <span className="section-label flex items-center gap-1.5 mb-2">
                <Activity size={12} className="text-cyan-400" /> Histórico
              </span>
              {/* Tabela em telas maiores */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-neutral-600 border-b border-white/5">
                      <th className="text-left py-2 pr-2 font-medium">Data</th>
                      {CAMPOS_MEDIDA.map(c => <th key={c.key} className="text-center py-2 px-1 font-medium">{c.label}</th>)}
                      <th className="text-right py-2 pl-2 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {medidas.map((m, i) => (
                      <tr key={m.id || i} className="border-b border-white/5 last:border-0">
                        <td className="text-neutral-500 font-mono py-2 pr-2 whitespace-nowrap">
                          {m.data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </td>
                        {CAMPOS_MEDIDA.map(c => (
                          <td key={c.key} className="text-center text-white font-mono py-2 px-1">{m[c.key]}</td>
                        ))}
                        <td className="text-right py-2 pl-2 whitespace-nowrap">
                          <button type="button" onClick={() => editarMedida(m)} aria-label={`Editar medida de ${m.data.toLocaleDateString('pt-BR')}`}
                            className="text-amber-400/70 hover:text-amber-400 p-1.5 transition-all active:scale-90">
                            <Pencil size={14} />
                          </button>
                          <button type="button" onClick={() => deletarMedida(
                            m.id,
                            m.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                          )} aria-label={`Excluir medida de ${m.data.toLocaleDateString('pt-BR')}`} className="icon-hover text-red-400/70 p-1.5">
                            <Trash size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Cards empilhados em telas pequenas */}
              <div className="sm:hidden space-y-2">
                {medidas.map((m, i) => (
                  <div key={m.id || i} className="bg-black/30 rounded-xl p-3 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-neutral-400 font-mono text-xs">
                        {m.data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </span>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => editarMedida(m)} aria-label={`Editar medida de ${m.data.toLocaleDateString('pt-BR')}`}
                          className="text-amber-400/70 hover:text-amber-400 p-1.5 transition-all active:scale-90">
                          <Pencil size={14} />
                        </button>
                        <button type="button" onClick={() => deletarMedida(
                          m.id,
                          m.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                        )} aria-label={`Excluir medida de ${m.data.toLocaleDateString('pt-BR')}`} className="icon-hover text-red-400/70 p-1.5">
                          <Trash size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {CAMPOS_MEDIDA.map(c => (
                        <div key={c.key} className="text-center">
                          <div className="text-[9px] text-neutral-600">{c.label}</div>
                          <div className="text-white font-mono text-xs">{m[c.key]}{c.unidade}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {lastCorporalDoc && (
            <button type="button" onClick={carregarMaisCorporais} disabled={carregandoMaisCorporais}
              className="btn-secondary w-full py-2 text-xs">
              {carregandoMaisCorporais ? 'Carregando...' : 'Carregar mais medidas'}
            </button>
          )}
          {medidas.length === 0 && !loading && (
            <p className="text-neutral-600 text-center py-8 text-sm">Nenhuma medida registrada ainda.</p>
          )}
        </>
      )}
    </div>
  )
}
