import { useState, useEffect, useCallback, useRef } from 'react'
import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { auth, db } from '../../firebase'
import { ArrowDown, ArrowUp, Plus, AlertTriangle, Loader, ChevronDown, X, Trash, LogOut, UserCircle, Sparkles, RefreshCw, Palette, Dumbbell, Apple, CheckCircle2, Download, Clock3, Copy, Pencil, Check, CircleDot, Timer, Settings2, NotebookPen, Flame } from 'lucide-react'
import { useUser } from '../../context/UserContext'
import { calcularMacrosIA } from '../../utils/gemini'
import { THEMES, useTheme } from '../../utils/themes'
import { buildUserDataExport, formatExportFilename } from '../../utils/exportData'
import { LIMITE_NOTA, comNomesGravaveis, prepararConfigParaSalvar } from '../../utils/configValidation'
import ContaPlano, { ExcluirConta } from '../conta/ContaPlano'
import { focusTabWithArrowKey } from '../../utils/rovingTabs'
import { dataTreinoParaDate, normalizarMetaSemanal } from '../../utils/fitness'
import { duplicarRotina, estimarDuracaoMinutos, exerciseId, garantirIdsExercicios, gerarIdRotina, moverRotina, nomesDeExerciciosCompativeis, novoIdExercicio, ordenarRotinas, reordenarExercicios, sugerirProximaDivisao, valoresDoExercicio } from '../../utils/workoutSession'
import ConfirmModal from '../ConfirmModal'

function gerarIdRefeicao() {
  return `refeicao_${Date.now()}`
}

function normalizarListaAlimentos(texto) {
  return String(texto || '').split(',').map(item => item.trim()).filter(Boolean)
}

const CONFIG_REF = (uid) => doc(db, 'users', uid, 'config', 'data')
const METAS_PADRAO = { kcal: 1970, proteinas: 165, carboidratos: 226, gorduras: 43, fibras: 30 }

function numeroNutricional(valor, fallback = 0) {
  const numero = Number(typeof valor === 'string' ? valor.replace(',', '.') : valor)
  return Number.isFinite(numero) && numero >= 0 ? numero : fallback
}

// Cada exercício passa a ter identidade própria: a posição vira só a ordem.
function normalizarTreinos(treinos) {
  return Object.fromEntries(Object.entries(treinos || {}).map(([key, rotina]) => [key, {
    ...rotina,
    exercicios: garantirIdsExercicios(rotina?.exercicios),
  }]))
}

function exercicioSemNome(config) {
  return Object.values(config.treinos || {}).flatMap(rotina => rotina?.exercicios || []).find(ex => !String(ex?.nome || '').trim())
}

function normalizarConfigNutricional(data) {
  return {
    ...data,
    treinos: normalizarTreinos(data.treinos),
    metas: { ...METAS_PADRAO, ...(data.metas || {}), fibras: numeroNutricional(data.metas?.fibras, METAS_PADRAO.fibras) },
    refeicoes: (Array.isArray(data.refeicoes) ? data.refeicoes : []).map(ref => ({
      ...ref,
      fibras: numeroNutricional(ref.fibras),
    })),
  }
}

export default function Configuracao({ abaInicial }) {
  const user = useUser()
  const [themeId, setThemeId] = useTheme()
  const [config, setConfig] = useState({ treinos: {}, refeicoes: [], metas: METAS_PADRAO })
  const [loading, setLoading] = useState(true)
  const [configCarregada, setConfigCarregada] = useState(false)
  const [moduloCatalogoExercicios, setModuloCatalogoExercicios] = useState(null)
  const [catalogoExerciciosCarregando, setCatalogoExerciciosCarregando] = useState(false)
  const [campoBuscaExercicio, setCampoBuscaExercicio] = useState(null)
  const [erroCatalogoExercicios, setErroCatalogoExercicios] = useState(null)
  const [alteracaoPendente, setAlteracaoPendente] = useState(false)
  const [erro, setErro] = useState(null)
  const [sucesso, setSucesso] = useState(null)
  const [sincronizando, setSincronizando] = useState(false)
  const [exportando, setExportando] = useState(false)
  const [aba, setAba] = useState(abaInicial || 'treinos')
  const [expandedKey, setExpandedKey] = useState(null)
  const [expandedMeal, setExpandedMeal] = useState(null)
  // Divisão que a Home sugere como próxima (pela ordem e pelo último treino).
  const [proximaChave, setProximaChave] = useState(null)
  const [showNewRoutine, setShowNewRoutine] = useState(false)
  const [newNome, setNewNome] = useState('')
  const [textoAlimentos, setTextoAlimentos] = useState({})
  const textoAlimentosRef = useRef(textoAlimentos)
  useEffect(() => { textoAlimentosRef.current = textoAlimentos }, [textoAlimentos])
  const [aiLoadingIdx, setAiLoadingIdx] = useState(null)
  const [confirmacao, setConfirmacao] = useState(null)
  const sucessoTimerRef = useRef(null)
  const pendingFocusRef = useRef(null)
  const routineRefs = useRef({})
  const exerciseRefs = useRef({})
  const mealRefs = useRef({})
  const mountedRef = useRef(false)
  const loadedUidRef = useRef(null)
  const loadSequenceRef = useRef(0)
  const aiSequenceRef = useRef(0)
  // Última versão que está no banco: referência para nomes apagados no meio da digitação.
  const salvoRef = useRef(null)
  // Indicador do cabeçalho: só mostra "salvo" depois que o banco confirmou a gravação,
  // com o horário dessa confirmação (ou o do último salvamento guardado no plano).
  const [salvamento, setSalvamento] = useState({ estado: 'salvo', em: null })
  const gravacoesRef = useRef(0)

  const gravarConfig = useCallback(async (novo) => {
    gravacoesRef.current += 1
    setSalvamento(atual => ({ ...atual, estado: 'salvando' }))
    try {
      const agora = new Date()
      const dados = { ...prepararConfigParaSalvar(comNomesGravaveis(novo, salvoRef.current)), atualizadoEm: agora }
      await setDoc(CONFIG_REF(user.uid), dados)
      salvoRef.current = dados
      gravacoesRef.current -= 1
      if (mountedRef.current) setSalvamento(atual => (gravacoesRef.current > 0 ? atual : { estado: 'salvo', em: agora }))
    } catch (err) {
      gravacoesRef.current -= 1
      if (mountedRef.current) setSalvamento(atual => ({ estado: 'erro', em: atual.em }))
      throw err
    }
  }, [user.uid])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      loadedUidRef.current = null
      loadSequenceRef.current += 1
      aiSequenceRef.current += 1
    }
  }, [])

  const mostrarSucesso = useCallback((mensagem) => {
    if (sucessoTimerRef.current) clearTimeout(sucessoTimerRef.current)
    setSucesso(mensagem)
    sucessoTimerRef.current = setTimeout(() => setSucesso(null), 3500)
  }, [])

  useEffect(() => () => {
    if (sucessoTimerRef.current) clearTimeout(sucessoTimerRef.current)
  }, [])

  useEffect(() => {
    const pending = pendingFocusRef.current
    if (!pending) return

    const refs = pending.type === 'routine' ? routineRefs.current : pending.type === 'exercise' ? exerciseRefs.current : mealRefs.current
    const node = refs[pending.key]
    if (!node) return

    pendingFocusRef.current = null
    node.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const timer = setTimeout(() => {
      const target = node.querySelector(pending.selector || (pending.type === 'routine' ? 'button' : 'input'))
      target?.focus({ preventScroll: true })
    }, 350)
    return () => clearTimeout(timer)
  }, [config])

  const carregar = useCallback(async () => {
    const sequence = ++loadSequenceRef.current
    loadedUidRef.current = null
    setConfigCarregada(false)
    setLoading(true); setErro(null)
    try {
      const snap = await getDoc(CONFIG_REF(user.uid))
      if (!mountedRef.current || sequence !== loadSequenceRef.current) return
      if (snap.exists()) {
        const dados = normalizarConfigNutricional(snap.data())
        salvoRef.current = dados
        setConfig(dados)
        const refs = dados.refeicoes || []
        const init = {}
        refs.forEach(r => { init[r.id] = (r.alimentos || []).join(', ') })
        setTextoAlimentos(init)
        setAlteracaoPendente(false)
        setSalvamento({ estado: 'salvo', em: dataTreinoParaDate(snap.data().atualizadoEm) })
        loadedUidRef.current = user.uid
        setConfigCarregada(true)
      }
    } catch (err) {
      if (mountedRef.current && sequence === loadSequenceRef.current) setErro(`Erro: ${err.message}`)
    }
    if (mountedRef.current && sequence === loadSequenceRef.current) setLoading(false)
  }, [user.uid])

  // Sincroniza a configuração inicial com o Firestore ao montar a tela.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { carregar() }, [carregar])

  // Últimos treinos (só 10 leituras) para marcar a próxima divisão da ordem.
  const ultimosTreinosRef = useRef(null)
  useEffect(() => {
    if (!configCarregada) return
    let ativo = true
    ultimosTreinosRef.current ||= getDocs(query(collection(db, 'users', user.uid, 'historico_treinos'), orderBy('data', 'desc'), limit(10)))
      .then(snap => snap.docs.map(item => item.data()))
      .catch(() => [])
    ultimosTreinosRef.current.then(historico => { if (ativo) setProximaChave(sugerirProximaDivisao(config.treinos, historico)?.chave ?? null) })
    return () => { ativo = false }
  }, [configCarregada, config.treinos, user.uid])


  // "Tentar de novo" do indicador: grava o que está na tela agora.
  const salvar = async (novo) => {
    if (loading || loadedUidRef.current !== user.uid) return
    setErro(null); setSucesso(null)
    try {
      await gravarConfig(novo)
      if (configRef.current === novo) setAlteracaoPendente(false)
      if (exercicioSemNome(novo)) mostrarSucesso('Salvo. Exercício sem nome só é salvo depois de ganhar um nome.')
    } catch (err) { setErro(err.message) }
  }

  const addRoutine = async () => {
    const nome = newNome.trim()
    if (!nome) return
    const key = gerarIdRotina(nome, Object.keys(config.treinos || {}))
    // Nova divisão entra no fim da lista atual.
    const ordem = ordenarRotinas(config.treinos).length
    const treinosOrdenados = Object.fromEntries(ordenarRotinas(config.treinos).map(([k, rotina], i) => [k, { ...rotina, ordem: i }]))
    const n = { ...config, treinos: { ...treinosOrdenados, [key]: { nome, exercicios: [], ordem } } }
    pendingFocusRef.current = { type: 'routine', key }
    setConfig(n)
    try {
      await gravarConfig(n)
      mostrarSucesso(`Divisão "${nome}" criada.`)
    } catch (err) {
      setConfig(config)
      pendingFocusRef.current = null
      setErro('Erro ao salvar treino: ' + err.message)
      return
    }
    setNewNome(''); setShowNewRoutine(false)
    setExpandedKey(key)
  }

  const pedirExclusaoRotina = (key) => {
    const rotina = config.treinos?.[key]
    const total = rotina?.exercicios?.length || 0
    setConfirmacao({
      title: 'Excluir divisão?',
      message: `"${rotina?.nome || key}" e ${total === 1 ? 'seu exercício' : `seus ${total} exercícios`} saem do plano. Os treinos já registrados continuam no histórico.`,
      onConfirm: () => deleteRoutine(key),
    })
  }

  const pedirExclusaoExercicio = (key, idx) => {
    const nome = config.treinos?.[key]?.exercicios?.[idx]?.nome
    setConfirmacao({
      title: 'Excluir exercício?',
      message: `"${nome || 'Este exercício'}" sai desta divisão. Os treinos já registrados continuam no histórico.`,
      onConfirm: () => deleteExercise(key, idx),
    })
  }

  // Exclusões: se o banco recusar, a tela volta ao que estava (antes sumia só da tela).
  const deleteRoutine = async (key) => {
    const anterior = configRef.current
    const n = { ...anterior, treinos: { ...anterior.treinos } }
    delete n.treinos[key]
    configRef.current = n
    setConfig(n)
    try { await gravarConfig(n); mostrarSucesso(`Divisão "${anterior.treinos[key]?.nome || key}" excluída.`) } catch (err) {
      configRef.current = anterior
      setConfig(anterior)
      setErro('Não foi possível excluir: ' + err.message)
      return
    }
    if (expandedKey === key) setExpandedKey(null)
  }

  const duplicarDivisao = async (key) => {
    const anterior = configRef.current
    const { treinos, chave } = duplicarRotina(anterior.treinos, key)
    if (!chave) return
    const n = { ...anterior, treinos }
    pendingFocusRef.current = { type: 'routine', key: chave }
    configRef.current = n
    setConfig(n)
    try {
      await gravarConfig(n)
      mostrarSucesso(`"${treinos[chave].nome}" criada. Renomeie e ajuste como quiser.`)
      setExpandedKey(chave)
    } catch (err) {
      pendingFocusRef.current = null
      configRef.current = anterior
      setConfig(anterior)
      setErro('Não foi possível duplicar: ' + err.message)
    }
  }

  const renomearDivisao = (key, nome) => {
    const n = { ...config, treinos: { ...config.treinos, [key]: { ...config.treinos[key], nome } } }
    configRef.current = n
    setConfig(n)
    setAlteracaoPendente(true)
  }

  // "Concluir": grava agora o que ainda estiver pendente e fecha o editor.
  const concluirEdicao = async () => {
    if (alteracaoPendente) {
      try { await gravarConfig(configRef.current); setAlteracaoPendente(false) } catch (err) { setErro('Erro ao salvar: ' + err.message); return }
    }
    setExpandedKey(null)
    setExpandedMeal(null)
  }

  // Nasce em branco, com o foco no nome; vai para o banco quando ganhar nome (autosave).
  const addExercise = (key) => {
    const n = { ...config, treinos: { ...config.treinos } }
    const exercicios = [...(n.treinos[key].exercicios || []), { id: novoIdExercicio(), nome: '', base_top: '', meta_reps: '', descanso_segundos: 90, tem_aquecimento: false }]
    n.treinos[key] = { ...n.treinos[key], exercicios }
    pendingFocusRef.current = { type: 'exercise', key: `${key}:${exercicios.length - 1}` }
    configRef.current = n
    setConfig(n)
    setAlteracaoPendente(true)
  }

  // Edição de campo salva pelo autosave (600 ms depois da última tecla), não a cada tecla.
  const updateExercise = (key, idx, campo, valor) => {
    const n = { ...config, treinos: { ...config.treinos } }
    const exs = [...(n.treinos[key].exercicios || [])]
    exs[idx] = { ...exs[idx], [campo]: valor }
    n.treinos[key] = { ...n.treinos[key], exercicios: exs }
    // Quem lê logo em seguida (troca de exercício, autosave) precisa do valor novo.
    configRef.current = n
    setConfig(n)
    setAlteracaoPendente(true)
  }

  const moveExercise = async (key, idx, delta) => {
    const atuais = config.treinos[key]?.exercicios || []
    const destino = idx + delta
    if (destino < 0 || destino >= atuais.length) return
    const exercicios = reordenarExercicios(atuais, idx, destino)
    const n = { ...config, treinos: { ...config.treinos, [key]: { ...config.treinos[key], exercicios } } }
    // O foco acompanha o exercício; na ponta da lista, o botão usado fica desativado.
    const direcao = delta < 0 ? (destino === 0 ? 'down' : 'up') : (destino === exercicios.length - 1 ? 'up' : 'down')
    pendingFocusRef.current = { type: 'exercise', key: `${key}:${destino}`, selector: `[data-move="${direcao}"]` }
    setCampoBuscaExercicio(null)
    setConfig(n)
    try {
      await gravarConfig(n)
      mostrarSucesso(`"${atuais[idx].nome || 'Exercício'}" agora é o ${destino + 1}º exercício.`)
    } catch (err) {
      pendingFocusRef.current = null
      setConfig(config)
      setErro('Erro ao salvar a nova ordem: ' + err.message)
    }
  }

  const moveRoutine = async (key, delta) => {
    const treinos = moverRotina(config.treinos, key, delta)
    if (treinos === config.treinos) return
    const lista = ordenarRotinas(treinos)
    const destino = lista.findIndex(([k]) => k === key)
    const direcao = delta < 0 ? (destino === 0 ? 'down' : 'up') : (destino === lista.length - 1 ? 'up' : 'down')
    pendingFocusRef.current = { type: 'routine', key, selector: `[data-move-rotina="${direcao}"]` }
    const n = { ...config, treinos }
    setConfig(n)
    try {
      await gravarConfig(n)
      mostrarSucesso(`"${treinos[key].nome || key}" agora é a ${destino + 1}ª divisão.`)
    } catch (err) {
      pendingFocusRef.current = null
      setConfig(config)
      setErro('Erro ao salvar a nova ordem: ' + err.message)
    }
  }

  // Histórico só é lido quando a pessoa troca um exercício, e uma vez por tela.
  const historicoRef = useRef(null)
  const garantirHistorico = () => {
    historicoRef.current ||= getDocs(query(collection(db, 'users', user.uid, 'historico_treinos'), orderBy('data', 'desc'), limit(200)))
      .then(snap => snap.docs.map(item => item.data()))
      .catch(() => { historicoRef.current = null; return [] })
    return historicoRef.current
  }

  // Nome que o campo tinha quando recebeu o foco: é a referência para saber se
  // a pessoa trocou de exercício ou só corrigiu a digitação.
  const nomeNoFocoRef = useRef(new Map())

  const aplicarExercicioEscolhido = async (key, idx, nome) => {
    const exAntes = configRef.current.treinos?.[key]?.exercicios?.[idx]
    if (!exAntes) return
    const id = exerciseId(exAntes, idx)
    nomeNoFocoRef.current.set(`${key}:${idx}`, nome)
    const historico = await garantirHistorico()
    const atual = configRef.current
    const lista = atual.treinos?.[key]?.exercicios || []
    const posicao = lista.findIndex((ex, i) => exerciseId(ex, i) === id)
    // A pessoa apagou, moveu ou renomeou de novo enquanto o histórico carregava.
    if (posicao < 0 || lista[posicao].nome !== nome) return
    const { origem, ...valores } = valoresDoExercicio(nome, { historico, treinos: atual.treinos, ignorar: { key, idx: posicao } })
    const exercicios = lista.map((ex, i) => (i === posicao ? { ...ex, ...valores } : ex))
    const novo = { ...atual, treinos: { ...atual.treinos, [key]: { ...atual.treinos[key], exercicios } } }
    configRef.current = novo
    setConfig(novo)
    setAlteracaoPendente(true)
    if (origem?.tipo === 'historico') {
      const data = dataTreinoParaDate(origem.data)
      mostrarSucesso(`${nome}: carga e repetições do último treino${data ? ` (${data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })})` : ''}.`)
    } else if (origem?.tipo === 'plano') {
      mostrarSucesso(`${nome}: carga e repetições copiadas de ${origem.rotina}.`)
    } else {
      mostrarSucesso(`${nome} ainda não tem treino registrado: carga e repetições ficaram em branco.`)
    }
  }

  const trocouDeExercicio = (key, idx, nome) => {
    const anterior = nomeNoFocoRef.current.get(`${key}:${idx}`)
    return Boolean(String(nome || '').trim()) && anterior !== undefined && !nomesDeExerciciosCompativeis(anterior, nome)
  }

  const aoFocarNomeExercicio = (campoId, nome) => {
    if (!nomeNoFocoRef.current.has(campoId)) nomeNoFocoRef.current.set(campoId, nome)
    void abrirCatalogoExercicio(campoId)
  }

  // Nome digitado à mão também conta como troca de exercício.
  const aoSairDoNomeExercicio = (key, idx, campoId) => {
    const nomeAtual = configRef.current.treinos?.[key]?.exercicios?.[idx]?.nome
    if (trocouDeExercicio(key, idx, nomeAtual)) void aplicarExercicioEscolhido(key, idx, nomeAtual)
    nomeNoFocoRef.current.delete(campoId)
  }

  const aoEscolherExercicio = (key, idx, nome) => {
    setCampoBuscaExercicio(null)
    const trocou = trocouDeExercicio(key, idx, nome)
    updateExercise(key, idx, 'nome', nome)
    if (trocou) void aplicarExercicioEscolhido(key, idx, nome)
  }

  const limparNomeExercicio = (key, idx, campoId) => {
    setCampoBuscaExercicio(campoId)
    void updateExercise(key, idx, 'nome', '')
    exerciseRefs.current[`${key}:${idx}`]?.querySelector('.settings-exercise-name input')?.focus()
  }

  const abrirCatalogoExercicio = async (campo) => {
    setCampoBuscaExercicio(campo)
    setErroCatalogoExercicios(null)
    if (moduloCatalogoExercicios || catalogoExerciciosCarregando) return
    setCatalogoExerciciosCarregando(true)
    try {
      const modulo = await import('../../config/catalogoExercicios.js')
      setModuloCatalogoExercicios(modulo)
    } catch {
      setErroCatalogoExercicios('Não foi possível carregar o catálogo. Você ainda pode usar o nome personalizado.')
    } finally {
      setCatalogoExerciciosCarregando(false)
    }
  }

  const deleteExercise = async (key, idx) => {
    const anterior = configRef.current
    const n = { ...anterior, treinos: { ...anterior.treinos } }
    n.treinos[key] = { ...n.treinos[key], exercicios: n.treinos[key].exercicios.filter((_, i) => i !== idx) }
    configRef.current = n
    setConfig(n)
    try { await gravarConfig(n); mostrarSucesso('Exercício excluído.') } catch (err) {
      configRef.current = anterior
      setConfig(anterior)
      setErro('Não foi possível excluir: ' + err.message)
    }
  }

  const updateMeta = (campo, valor) => {
    const n = { ...config, metas: { ...(config.metas || {}), [campo]: valor } }
    setConfig(n)
    setAlteracaoPendente(true)
  }

  const updateRefeicao = (idx, campo, valor) => {
    const n = { ...config, refeicoes: (config.refeicoes || []).map((r, i) => i === idx ? { ...r, [campo]: valor } : r) }
    setConfig(n)
    setAlteracaoPendente(true)
  }

  // Debounced save for treinos, metas and refeicoes (600ms after last change)
  const configRef = useRef(config)
  useEffect(() => { configRef.current = config }, [config])
  const pendenteRef = useRef(false)
  useEffect(() => { pendenteRef.current = alteracaoPendente }, [alteracaoPendente])
  useEffect(() => {
    if (loading || !alteracaoPendente || loadedUidRef.current !== user.uid) return
    const timer = setTimeout(async () => {
      try {
        const atual = configRef.current
        await gravarConfig(atual)
        if (mountedRef.current && configRef.current === atual) setAlteracaoPendente(false)
      } catch (err) {
        if (mountedRef.current) setErro('Erro ao salvar: ' + err.message)
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [config.treinos, config.metas, config.refeicoes, user.uid, loading, alteracaoPendente, gravarConfig])

  // Sair da tela antes dos 600 ms não pode descartar a última edição.
  useEffect(() => {
    const uid = user.uid
    return () => {
      if (!pendenteRef.current) return
      pendenteRef.current = false
      const atual = configRef.current
      try { setDoc(CONFIG_REF(uid), prepararConfigParaSalvar(comNomesGravaveis(atual, salvoRef.current))).catch(() => {}) } catch { /* Valor inválido não é gravado. */ }
    }
  }, [user.uid])

  const addRefeicao = async () => {
    const anterior = configRef.current
    const id = gerarIdRefeicao()
    const refeicoes = [...(anterior.refeicoes || []), { id, nome: 'Nova refeição', horario: '12:00', alimentos: [], kcal: 0, proteinas: 0, carboidratos: 0, gorduras: 0, fibras: 0 }]
    const n = { ...anterior, refeicoes }
    pendingFocusRef.current = { type: 'meal', key: id }
    setConfig(n)
    setExpandedMeal(id)
    try { await gravarConfig(n); mostrarSucesso('Refeição adicionada.') } catch (err) {
      pendingFocusRef.current = null
      setConfig(anterior)
      setErro('Não foi possível adicionar: ' + err.message)
    }
  }

  // Mesma confirmação do app usada nas divisões (window.confirm é bloqueado em alguns celulares).
  const pedirExclusaoRefeicao = (idx) => {
    const ref = (config.refeicoes || [])[idx]
    if (!ref) return
    setConfirmacao({
      title: 'Excluir refeição?',
      message: `"${ref.nome || 'Esta refeição'}" sai do seu plano. Os dias já registrados no diário continuam como estão.`,
      onConfirm: () => deleteRefeicao(ref.id),
    })
  }

  const deleteRefeicao = async (id) => {
    const anterior = configRef.current
    const ref = (anterior.refeicoes || []).find(r => r.id === id)
    if (!ref) return
    const n = { ...anterior, refeicoes: (anterior.refeicoes || []).filter(r => r.id !== id) }
    setConfig(n)
    try { await gravarConfig(n); mostrarSucesso(`Refeição "${ref.nome}" excluída.`) } catch (err) {
      setConfig(anterior)
      setErro('Não foi possível excluir: ' + err.message)
    }
  }

  const sincronizarMetas = async () => {
    setSincronizando(true)
    setErro(null)
    let refeicoes
    try { refeicoes = prepararConfigParaSalvar(config).refeicoes }
    catch (err) { setErro(err.message); setSincronizando(false); return }
    const total = refeicoes.reduce((acc, r) => ({
      kcal: acc.kcal + (Number(r.kcal) || 0),
      proteinas: acc.proteinas + (Number(r.proteinas) || 0),
      carboidratos: acc.carboidratos + (Number(r.carboidratos) || 0),
      gorduras: acc.gorduras + (Number(r.gorduras) || 0),
      fibras: acc.fibras + (Number(r.fibras) || 0),
    }), { kcal: 0, proteinas: 0, carboidratos: 0, gorduras: 0, fibras: 0 })
    const n = { ...config, metas: total }
    setConfig(n)
    try {
      await gravarConfig(n)
      mostrarSucesso(`Metas sincronizadas: ${total.kcal} kcal, ${total.proteinas}g P, ${total.carboidratos}g C, ${total.gorduras}g G e ${total.fibras}g de fibras.`)
    } catch (err) { setErro('Erro ao salvar: ' + err.message) }
    setSincronizando(false)
  }

  const calcularMacrosRefeicao = async (idx) => {
    const refeicao = config.refeicoes?.[idx]
    const texto = textoAlimentos[refeicao?.id]
    if (!texto?.trim() || !refeicao || loadedUidRef.current !== user.uid) return
    const sequence = ++aiSequenceRef.current
    // O clique pode ocorrer imediatamente depois de editar o input. Nesse
    // caso, o onBlur já atualizou a refeição no estado mais recente; comparar
    // com a lista capturada antes do blur faria a análise válida ser descartada.
    const alimentosAnalisados = JSON.stringify(normalizarListaAlimentos(texto))
    setAiLoadingIdx(idx)
    const macros = await calcularMacrosIA(texto)
    if (!mountedRef.current || sequence !== aiSequenceRef.current) return
    const atual = configRef.current
    const targetIdx = (atual.refeicoes || []).findIndex(ref => ref.id === refeicao.id)
    if (targetIdx < 0 || textoAlimentosRef.current[refeicao.id] !== texto || JSON.stringify(atual.refeicoes[targetIdx].alimentos || []) !== alimentosAnalisados) {
      setErro('A refeição mudou durante a análise. Analise os alimentos atuais novamente.')
      setAiLoadingIdx(null)
      return
    }
    if (macros._erro) {
      setErro(macros._erro)
      setTimeout(() => setErro(null), 3000)
    } else {
      const n = { ...atual, refeicoes: (atual.refeicoes || []).map((r, i) => i === targetIdx ? { ...r, kcal: macros.kcal, proteinas: macros.proteinas, carboidratos: macros.carboidratos, gorduras: macros.gorduras, fibras: macros.fibras } : r) }
      setConfig(n)
      setAlteracaoPendente(true)
      mostrarSucesso(`Macros de "${n.refeicoes[targetIdx].nome}" preenchidos. Salvamento automático em andamento.`)
    }
    setAiLoadingIdx(null)
  }

  const exportarDados = async () => {
    setExportando(true)
    setErro(null)
    try {
      const [configSnap, treinosSnap, dietaSnap, medidasSnap] = await Promise.all([
        getDoc(CONFIG_REF(user.uid)),
        getDocs(collection(db, 'users', user.uid, 'historico_treinos')),
        getDocs(collection(db, 'users', user.uid, 'diario_dieta')),
        getDocs(collection(db, 'users', user.uid, 'historico_corporal')),
      ])
      const dados = buildUserDataExport({
        config: configSnap.exists() ? configSnap.data() : config,
        treinos: treinosSnap.docs.map(snapshot => ({ id: snapshot.id, ...snapshot.data() })),
        diarioDieta: dietaSnap.docs.map(snapshot => ({ id: snapshot.id, ...snapshot.data() })),
        medidas: medidasSnap.docs.map(snapshot => ({ id: snapshot.id, ...snapshot.data() })),
      })
      const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = formatExportFilename()
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 0)
      mostrarSucesso('Seus dados foram exportados em JSON.')
    } catch (err) {
      setErro(`Não foi possível exportar os dados: ${err.message}`)
    } finally {
      setExportando(false)
    }
  }

  const totalTreinos = Object.keys(config.treinos || {}).length
  const totalRefeicoes = (config.refeicoes || []).length
  // O campo em edição fica de fora: o texto que a pessoa está digitando não é uma sugestão.
  const nomesExerciciosConfig = (campoIgnorado) => Object.entries(config.treinos || {})
    .flatMap(([key, treino]) => (treino?.exercicios || []).map((exercicio, idx) => `${key}:${idx}` === campoIgnorado ? null : exercicio?.nome).filter(Boolean))

  const formatarDescanso = segundos => (segundos < 60 ? `${segundos}s` : segundos % 60 ? `${Math.floor(segundos / 60)} min ${segundos % 60}s` : `${segundos / 60} min`)
  const horaDoSalvamento = em => {
    if (!(em instanceof Date) || Number.isNaN(em.getTime())) return null
    const hora = em.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    return em.toDateString() === new Date().toDateString() ? `Hoje às ${hora}` : `${em.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${hora}`
  }
  // O que o indicador mostra: gravação em andamento e erro vencem; depois, edição ainda não enviada.
  const estadoVisivel = salvamento.estado === 'salvando' ? 'salvando' : salvamento.estado === 'erro' ? 'erro' : alteracaoPendente ? 'pendente' : 'salvo'
  const textoSalvamento = {
    salvo: { titulo: 'Tudo salvo', detalhe: horaDoSalvamento(salvamento.em) || 'Na sua conta', Icone: CheckCircle2 },
    salvando: { titulo: 'Salvando...', detalhe: 'Enviando para a sua conta', Icone: Loader },
    pendente: { titulo: 'Alterações pendentes', detalhe: 'Salvando em instantes', Icone: CircleDot },
    erro: { titulo: 'Erro ao salvar', detalhe: 'As últimas alterações não foram salvas', Icone: AlertTriangle },
  }[estadoVisivel]
  const somaRefeicoes = (config.refeicoes || []).reduce((acc, r) => ({ kcal: acc.kcal + numeroNutricional(r.kcal), proteinas: acc.proteinas + numeroNutricional(r.proteinas), carboidratos: acc.carboidratos + numeroNutricional(r.carboidratos), gorduras: acc.gorduras + numeroNutricional(r.gorduras), fibras: acc.fibras + numeroNutricional(r.fibras) }), { kcal: 0, proteinas: 0, carboidratos: 0, gorduras: 0, fibras: 0 })
  const diferencaKcal = Math.round(somaRefeicoes.kcal - numeroNutricional(config.metas?.kcal))
  const abas = [
    { id: 'treinos', rotulo: 'Treinos', Icone: Dumbbell, total: totalTreinos },
    { id: 'dieta', rotulo: 'Dieta', Icone: Apple, total: totalRefeicoes },
    { id: 'conta', rotulo: 'Conta', Icone: Settings2, total: null },
  ]

  return (
    <div className="settings-page flex flex-col gap-4 pt-2 pb-6">
      <header className="cfg-header">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-white">Configurações</h1>
          <p className="mt-1 text-xs leading-relaxed text-neutral-500">Monte seus treinos, organize sua dieta e ajuste sua conta.</p>
        </div>
        {configCarregada && (
          <div className={`cfg-save-status is-${estadoVisivel}`} role="status" aria-live="polite">
            <textoSalvamento.Icone size={18} aria-hidden="true" className={estadoVisivel === 'salvando' ? 'animate-spin' : ''} />
            <span><strong>{textoSalvamento.titulo}</strong><small>{textoSalvamento.detalhe}</small></span>
            {estadoVisivel === 'erro' && <button type="button" onClick={() => salvar(configRef.current)} className="cfg-save-retry">Tentar de novo</button>}
          </div>
        )}
      </header>

      <div className="settings-tabs cfg-tabs" role="tablist" aria-label="Seções de configuração">
        {abas.map(({ id, rotulo, Icone, total }) => (
          <button key={id} id={`settings-tab-${id}`} type="button" role="tab" aria-controls={`settings-panel-${id}`} aria-selected={aba === id} tabIndex={aba === id ? 0 : -1} onKeyDown={focusTabWithArrowKey} onClick={() => setAba(id)} className={`settings-tab ${aba === id ? 'settings-tab-active' : ''}`}>
            <Icone size={15} aria-hidden="true" /> <span>{rotulo}</span>{total !== null && <small>{total}</small>}
          </button>
        ))}
      </div>

      {erro && <div className="settings-feedback settings-feedback-error" role="alert"><AlertTriangle size={16} /><span>{erro}</span><button type="button" onClick={() => setErro(null)} aria-label="Fechar aviso"><X size={14} /></button></div>}
      {sucesso && <div className="settings-feedback settings-feedback-success" role="status" aria-live="polite"><CheckCircle2 size={16} /><span>{sucesso}</span></div>}

      <div role="tabpanel" id={`settings-panel-${aba}`} aria-labelledby={`settings-tab-${aba}`} tabIndex={0}>
      {aba === 'conta' ? (
        <section className="cfg-section" aria-labelledby="conta-heading">
          <div className="cfg-section-head"><div><h2 id="conta-heading" className="cfg-title">Conta</h2><p className="cfg-subtitle">Seu acesso, seus dados e a aparência do app.</p></div></div>
          <div className="settings-account card-premium">
            <div className="settings-account-avatar"><UserCircle size={24} /></div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">{user.isAnonymous ? 'Visitante' : user.email}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                <span className={`settings-status ${user.isAnonymous ? 'settings-status-warning' : 'settings-status-success'}`}>
                  <span className="settings-status-dot" /> {user.isAnonymous ? 'Conta anônima' : 'Conta sincronizada'}
                </span>
                <span className="font-mono text-white/50">UID {user.uid.slice(0, 8)}...</span>
              </div>
            </div>
            <button type="button" onClick={() => signOut(auth)} className="settings-account-action" title="Sair da conta">
              <LogOut size={15} /> <span className="hidden sm:inline">Sair</span>
            </button>
          </div>

          <ContaPlano user={user} />

          <div className="settings-appearance card-premium cfg-block">
            <div className="flex items-center gap-2">
              <Palette size={16} className="text-emerald-400" aria-hidden="true" />
              <h3 className="cfg-block-title">Aparência</h3>
            </div>
            <p className="cfg-subtitle">A cor escolhida fica salva neste aparelho.</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {THEMES.map((t) => (
                <button type="button" key={t.id} onClick={() => setThemeId(t.id)} className={`theme-swatch ${themeId === t.id ? 'active' : ''}`} title={t.name} aria-pressed={themeId === t.id}>
                  <div className="theme-swatch-preview" style={{ background: t.previewBg || t.bgDeep, color: t.mode === 'light' ? '#2b1a15' : '#ffffff', boxShadow: `inset 0 0 0 1px ${t.brand[500]}44` }}>
                    <span className="theme-swatch-preview-dot" style={{ background: t.brand[500] }} />
                    <span className="theme-swatch-preview-line" style={{ background: t.mode === 'light' ? '#765c50' : '#ffffff99' }} />
                  </div>
                  <div className="theme-swatch-dots justify-center">
                    <span className="theme-swatch-dot" style={{ background: t.brand[500], color: t.brand[500] }} />
                    <span className="theme-swatch-dot" style={{ background: t.accent[500], color: t.accent[500] }} />
                    <span className="theme-swatch-dot" style={{ background: t.highlightHex, color: t.highlightHex }} />
                  </div>
                  <span className="text-xs font-semibold text-neutral-300 block leading-tight">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          <section className="settings-export card-premium" aria-labelledby="exportar-dados-heading">
            <div className="settings-account-avatar"><Download size={18} /></div>
            <div className="min-w-0 flex-1">
              <h3 id="exportar-dados-heading" className="text-sm font-semibold text-white">Seus dados</h3>
              <p className="mt-1 text-xs leading-relaxed text-neutral-500">Baixe uma cópia da sua configuração, treinos, diário alimentar e medidas.</p>
            </div>
            <button type="button" onClick={exportarDados} disabled={exportando} className="settings-action settings-action-outline shrink-0">
              {exportando ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
              {exportando ? 'Preparando...' : 'Exportar JSON'}
            </button>
          </section>

          <ExcluirConta user={user} />
        </section>
      ) : loading ? (
        <div className="space-y-2"><div className="skeleton skeleton-card" /><div className="skeleton skeleton-card" /></div>
      ) : !configCarregada ? (
        <div role="status" className="cfg-empty card-premium"><p>Não foi possível carregar seu plano com segurança.</p><button type="button" onClick={carregar} className="settings-action settings-action-outline">Tentar novamente</button></div>
      ) : aba === 'treinos' ? (
          <section className="cfg-section" aria-labelledby="treinos-heading">
            <div className="cfg-section-head">
              <div><h2 id="treinos-heading" className="cfg-title">Meus treinos</h2><p className="cfg-subtitle">Suas divisões na ordem em que você treina. Toque em Editar para mudar exercícios, cargas e descanso.</p></div>
              <button type="button" onClick={() => setShowNewRoutine(true)} className="cfg-btn cfg-btn-primary"><Plus size={16} aria-hidden="true" /> Nova divisão</button>
            </div>

            <label className="settings-weekly-goal card-premium">
              <span><strong>Meta de treinos por semana</strong><small>Usada na constância da Home e da Evolução.</small></span>
              <select value={normalizarMetaSemanal(config.metaTreinosSemana)} onChange={e => { setConfig(atual => ({ ...atual, metaTreinosSemana: Number(e.target.value) })); setAlteracaoPendente(true) }}>
                {[1, 2, 3, 4, 5, 6, 7].map(n => <option key={n} value={n}>{n} {n === 1 ? 'treino' : 'treinos'}</option>)}
              </select>
            </label>

            {showNewRoutine && (
              <div className="cfg-card card-premium cfg-new">
                <label className="settings-field"><span>Nome da nova divisão</span><input type="text" maxLength={60} placeholder="Ex.: Upper A, Pernas, Push" value={newNome} onChange={e => setNewNome(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addRoutine() }} autoFocus /></label>
                <div className="cfg-actions-end"><button type="button" onClick={() => { setShowNewRoutine(false); setNewNome('') }} className="cfg-btn cfg-btn-ghost">Cancelar</button><button type="button" onClick={addRoutine} disabled={!newNome.trim()} className="cfg-btn cfg-btn-primary"><Plus size={16} aria-hidden="true" /> Criar divisão</button></div>
              </div>
            )}

            {Object.entries(config.treinos || {}).length === 0 && !showNewRoutine && <div className="settings-empty card-premium"><Dumbbell size={22} /><h2>Nenhuma divisão criada</h2><p>Crie sua primeira divisão para começar a montar o treino.</p></div>}

            <div className="cfg-list">
              {/* As refs só são lidas nos eventos (foco, saída e escolha do exercício), não ao desenhar. */}
              {/* eslint-disable-next-line react-hooks/refs */}
              {ordenarRotinas(config.treinos).map(([key, rotina], index, lista) => {
                const isOpen = expandedKey === key
                const exerciseCount = (rotina.exercicios || []).length
                const duracao = estimarDuracaoMinutos(rotina.exercicios)
                const nomeRotina = rotina.nome || key
                return (
                  <article key={key} ref={node => { if (node) routineRefs.current[key] = node; else delete routineRefs.current[key] }} className={`cfg-card card-premium ${isOpen ? 'is-open' : ''}`}>
                    <div className="cfg-card-head">
                      <span className="cfg-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                      <div className="cfg-card-info">
                        <strong>{nomeRotina}</strong>
                        <small>{exerciseCount} {exerciseCount === 1 ? 'exercício' : 'exercícios'}{duracao ? ` · ≈ ${duracao} min` : ''}</small>
                      </div>
                      {proximaChave === key && <span className="cfg-badge" title="A Home sugere esta divisão no próximo treino">Próximo</span>}
                      <div className="cfg-card-actions">
                        <button type="button" onClick={() => setExpandedKey(isOpen ? null : key)} className={`cfg-btn ${isOpen ? 'cfg-btn-ghost' : 'cfg-btn-outline'}`} aria-expanded={isOpen}>
                          {isOpen ? <><ChevronDown size={16} aria-hidden="true" className="rotate-180" /> Fechar</> : <><Pencil size={15} aria-hidden="true" /> Editar</>}
                        </button>
                        <button type="button" onClick={() => duplicarDivisao(key)} className="cfg-icon-btn" aria-label={`Duplicar ${nomeRotina}`} title="Duplicar divisão"><Copy size={16} aria-hidden="true" /></button>
                        <button type="button" onClick={() => pedirExclusaoRotina(key)} className="cfg-icon-btn cfg-icon-danger" aria-label={`Excluir ${nomeRotina}`} title="Excluir divisão"><Trash size={16} aria-hidden="true" /></button>
                      </div>
                    </div>

                    {isOpen && <div className="cfg-editor">
                      <div className="cfg-editor-row">
                        <label className="settings-field settings-field-grow"><span>Nome da divisão</span><input type="text" maxLength={60} value={rotina.nome ?? ''} onChange={e => renomearDivisao(key, e.target.value)} onBlur={e => { if (!e.target.value.trim()) renomearDivisao(key, salvoRef.current?.treinos?.[key]?.nome || key) }} /></label>
                        <div className="cfg-order" role="group" aria-label={`Posição de ${nomeRotina} na ordem`}>
                          <span className="cfg-order-label">Ordem</span>
                          <div>
                            <button type="button" data-move-rotina="up" onClick={() => moveRoutine(key, -1)} disabled={index === 0} className="cfg-icon-btn" aria-label={`Mover ${nomeRotina} para cima`} title="Mover para cima"><ArrowUp size={16} aria-hidden="true" /></button>
                            <button type="button" data-move-rotina="down" onClick={() => moveRoutine(key, 1)} disabled={index === lista.length - 1} className="cfg-icon-btn" aria-label={`Mover ${nomeRotina} para baixo`} title="Mover para baixo"><ArrowDown size={16} aria-hidden="true" /></button>
                          </div>
                        </div>
                      </div>

                      <div className="cfg-subhead">
                        <div><h3 className="cfg-block-title">Exercícios</h3><p className="cfg-subtitle">A carga inicial vale até o primeiro registro; depois o treino usa a sua última sessão.</p></div>
                        <button type="button" onClick={() => addExercise(key)} className="cfg-btn cfg-btn-outline"><Plus size={16} aria-hidden="true" /> Adicionar exercício</button>
                      </div>

                      {exerciseCount === 0 && <p className="cfg-hint">Nenhum exercício ainda. Toque em "Adicionar exercício" para começar.</p>}

                      {(rotina.exercicios || []).map((ex, idx) => (
                        (() => {
                          const campoId = `${key}:${idx}`
                          const listId = `catalogo-exercicio-${encodeURIComponent(key)}-${idx}`
                          const inputId = `nome-exercicio-${encodeURIComponent(key)}-${idx}`
                          const buscaAtiva = campoBuscaExercicio === campoId
                          const textoBusca = String(ex.nome || '').trim()
                          const queryUtil = textoBusca && textoBusca.toLocaleLowerCase('pt-BR') !== 'novo'
                          const opcoes = buscaAtiva && queryUtil && moduloCatalogoExercicios
                            ? moduloCatalogoExercicios.buscarExercicios(textoBusca, nomesExerciciosConfig(campoId))
                            : []
                          const rotuloEx = ex.nome || `exercício ${idx + 1}`

                          return (
                        <div key={exerciseId(ex, idx)} ref={node => { const refKey = `${key}:${idx}`; if (node) exerciseRefs.current[refKey] = node; else delete exerciseRefs.current[refKey] }} className="settings-exercise cfg-exercise">
                          <div className="cfg-exercise-top">
                            <span className="cfg-number" aria-hidden="true">{idx + 1}</span>
                            <div className="settings-exercise-name">
                              <div className="settings-field settings-field-grow">
                                <label className="sr-only" htmlFor={inputId}>Nome do exercício {idx + 1}</label>
                                <div className="settings-exercise-input-wrap">
                                  <input id={inputId} type="text" value={ex.nome} placeholder="Digite ou escolha um exercício" role="combobox" aria-autocomplete="list"
                                    aria-expanded={buscaAtiva} aria-controls={listId} className="cfg-exercise-name-input"
                                    onFocus={() => aoFocarNomeExercicio(campoId, ex.nome)}
                                    onBlur={() => window.setTimeout(() => {
                                      const nomeField = exerciseRefs.current[`${key}:${idx}`]?.querySelector('.settings-exercise-name')
                                      if (nomeField?.contains(document.activeElement)) return
                                      setCampoBuscaExercicio(atual => atual === campoId ? null : atual)
                                      aoSairDoNomeExercicio(key, idx, campoId)
                                    }, 150)}
                                    onChange={e => { void updateExercise(key, idx, 'nome', e.target.value) }} />
                                  {ex.nome && <button type="button" className="settings-exercise-clear"
                                    aria-label={`Limpar nome do exercício ${ex.nome}`} title="Limpar campo"
                                    onMouseDown={e => e.preventDefault()}
                                    onClick={() => limparNomeExercicio(key, idx, campoId)}>
                                    <X size={13} aria-hidden="true" />
                                  </button>}
                                </div>
                              </div>
                              {buscaAtiva && (
                                <div id={listId} className="settings-exercise-catalog" role="listbox" aria-label={`Variações de ${textoBusca || 'exercício'}`}>
                                  {catalogoExerciciosCarregando && !moduloCatalogoExercicios ? (
                                    <p className="settings-exercise-catalog-empty" role="status">Carregando exercícios…</p>
                                  ) : erroCatalogoExercicios ? (
                                    <button type="button" className="settings-exercise-catalog-empty" onMouseDown={e => e.preventDefault()} onClick={() => { void abrirCatalogoExercicio(campoId) }}>{erroCatalogoExercicios} Toque para tentar novamente.</button>
                                  ) : !queryUtil ? (
                                    <p className="settings-exercise-catalog-empty">Digite um exercício para ver opções parecidas.</p>
                                  ) : opcoes.length === 0 ? (
                                    <p className="settings-exercise-catalog-empty">Sem correspondências. Nomes personalizados continuam permitidos.</p>
                                  ) : opcoes.map(opcao => (
                                    <button key={`${opcao.grupo}:${opcao.nome}`} type="button" role="option"
                                      aria-selected={opcao.nome === textoBusca}
                                      className="settings-exercise-catalog-option"
                                      onMouseDown={e => e.preventDefault()}
                                      onClick={() => aoEscolherExercicio(key, idx, opcao.nome)}>
                                      <span><strong>{opcao.nome}</strong><small>{opcao.grupo}</small></span>
                                      {opcao.nome === textoBusca && <CheckCircle2 size={15} aria-hidden="true" />}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="cfg-exercise-tools" role="group" aria-label={`Ações de ${rotuloEx}`}>
                              <button type="button" data-move="up" onClick={() => moveExercise(key, idx, -1)} disabled={idx === 0} className="cfg-icon-btn" aria-label={`Mover ${rotuloEx} para cima`} title="Mover para cima"><ArrowUp size={16} aria-hidden="true" /></button>
                              <button type="button" data-move="down" onClick={() => moveExercise(key, idx, 1)} disabled={idx === exerciseCount - 1} className="cfg-icon-btn" aria-label={`Mover ${rotuloEx} para baixo`} title="Mover para baixo"><ArrowDown size={16} aria-hidden="true" /></button>
                              <button type="button" onClick={() => pedirExclusaoExercicio(key, idx)} className="cfg-icon-btn cfg-icon-danger" aria-label={`Excluir ${rotuloEx}`} title="Excluir exercício"><Trash size={16} aria-hidden="true" /></button>
                            </div>
                          </div>
                          <div className="cfg-fields">
                            <label className="settings-field"><span><Dumbbell size={12} aria-hidden="true" /> Carga (kg)</span><input type="number" min="0" placeholder="Sem carga" value={ex.base_top ?? ''} onChange={e => updateExercise(key, idx, 'base_top', e.target.value === '' ? '' : Number(e.target.value))} inputMode="decimal" /></label>
                            <label className="settings-field"><span><RefreshCw size={12} aria-hidden="true" /> Repetições</span><input type="text" placeholder="Ex.: 8-10" value={ex.meta_reps ?? ''} onChange={e => updateExercise(key, idx, 'meta_reps', e.target.value)} /></label>
                            <label className="settings-field"><span><Clock3 size={12} aria-hidden="true" /> Descanso</span><select value={ex.descanso_segundos ?? 90} onChange={e => updateExercise(key, idx, 'descanso_segundos', Number(e.target.value))}>
                              {[30, 60, 90, 120, 180, 300].map(segundos => <option key={segundos} value={segundos}>{formatarDescanso(segundos)}</option>)}
                            </select></label>
                          </div>
                          <label className="cfg-check">
                            <input type="checkbox" checked={Boolean(ex.tem_aquecimento)} onChange={e => updateExercise(key, idx, 'tem_aquecimento', e.target.checked)} />
                            <span><strong><Flame size={13} aria-hidden="true" /> Série de aquecimento</strong><small>Uma série leve antes da preparatória.</small></span>
                          </label>
                          <label className="settings-field"><span><NotebookPen size={12} aria-hidden="true" /> Observação</span><input type="text" maxLength={LIMITE_NOTA} placeholder="Ex.: descida lenta, pegada fechada" value={ex.nota ?? ''} onChange={e => updateExercise(key, idx, 'nota', e.target.value)} /><small className="cfg-help">Aparece durante o treino, neste exercício.</small></label>
                        </div>
                          )
                        })()
                      ))}

                      <div className="cfg-editor-foot">
                        {exerciseCount > 0 && <button type="button" onClick={() => addExercise(key)} className="cfg-btn cfg-btn-ghost"><Plus size={16} aria-hidden="true" /> Adicionar exercício</button>}
                        <button type="button" onClick={concluirEdicao} className="cfg-btn cfg-btn-solid"><Check size={16} aria-hidden="true" /> Concluir</button>
                      </div>
                    </div>}
                  </article>
                )
              })}
            </div>
          </section>
      ) : (
        <section className="cfg-section" aria-labelledby="dieta-heading">
          <div className="cfg-section-head"><div><h2 id="dieta-heading" className="cfg-title">Plano alimentar</h2><p className="cfg-subtitle">Suas metas do dia e as refeições que aparecem no Diário.</p></div></div>

          <div className="settings-goals card-premium cfg-block">
            <div><h3 className="cfg-block-title">Metas diárias</h3><p className="cfg-subtitle">Orientam o progresso mostrado no Diário.</p></div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {[
                { key: 'kcal', label: 'Calorias', unit: 'kcal', val: config.metas?.kcal ?? 1970 },
                { key: 'proteinas', label: 'Proteínas', unit: 'g', val: config.metas?.proteinas ?? 165 },
                { key: 'carboidratos', label: 'Carboidratos', unit: 'g', val: config.metas?.carboidratos ?? 226 },
                { key: 'gorduras', label: 'Gorduras', unit: 'g', val: config.metas?.gorduras ?? 43 },
                { key: 'fibras', label: 'Fibras', unit: 'g', val: config.metas?.fibras ?? 30 },
              ].map(c => <label key={c.key} className="settings-goal"><span>{c.label}</span><div><input type="text" inputMode="numeric" value={c.val} onChange={e => updateMeta(c.key, e.target.value)} aria-label={`Meta de ${c.label}`} /><small>{c.unit}</small></div></label>)}
            </div>
            <div className="cfg-goals-compare">
              <div>
                <span>Soma das refeições</span>
                <strong>{Math.round(somaRefeicoes.kcal)} kcal · {Math.round(somaRefeicoes.proteinas)}g P · {Math.round(somaRefeicoes.carboidratos)}g C · {Math.round(somaRefeicoes.gorduras)}g G · {Math.round(somaRefeicoes.fibras)}g fibras</strong>
                <small className={diferencaKcal === 0 ? '' : 'cfg-diff'}>{diferencaKcal === 0 ? 'Igual à meta de calorias.' : diferencaKcal < 0 ? `${Math.abs(diferencaKcal)} kcal abaixo da meta.` : `${diferencaKcal} kcal acima da meta.`}</small>
              </div>
              <button type="button" onClick={sincronizarMetas} disabled={sincronizando} className="cfg-btn cfg-btn-outline"><RefreshCw size={15} aria-hidden="true" className={sincronizando ? 'animate-spin' : ''} /> {sincronizando ? 'Aplicando...' : 'Usar a soma como meta'}</button>
            </div>
          </div>

          <div className="cfg-subhead">
            <div><h3 className="cfg-block-title">Refeições</h3><p className="cfg-subtitle">Toque em Editar para mudar horário, alimentos e macros.</p></div>
            <button type="button" onClick={addRefeicao} className="cfg-btn cfg-btn-primary"><Plus size={16} aria-hidden="true" /> Nova refeição</button>
          </div>
          {(config.refeicoes || []).length === 0 && <div className="settings-empty settings-empty-small card-premium"><Apple size={21} /><p>Nenhuma refeição configurada.</p></div>}
          <div className="cfg-list">
            {(config.refeicoes || []).map((ref, i) => {
              const aberta = expandedMeal === ref.id
              const nomeRef = ref.nome || `Refeição ${i + 1}`
              return (
                <article key={ref.id || i} ref={node => { const refKey = ref.id || String(i); if (node) mealRefs.current[refKey] = node; else delete mealRefs.current[refKey] }} className={`cfg-card card-premium ${aberta ? 'is-open' : ''}`}>
                  <div className="cfg-card-head">
                    <span className="cfg-index cfg-index-time" aria-hidden="true"><Timer size={13} /> {ref.horario || '--:--'}</span>
                    <div className="cfg-card-info">
                      <strong>{nomeRef}</strong>
                      <small>{Math.round(numeroNutricional(ref.kcal))} kcal · {Math.round(numeroNutricional(ref.proteinas))}g P · {Math.round(numeroNutricional(ref.carboidratos))}g C · {Math.round(numeroNutricional(ref.gorduras))}g G</small>
                    </div>
                    <div className="cfg-card-actions">
                      <button type="button" onClick={() => setExpandedMeal(aberta ? null : ref.id)} className={`cfg-btn ${aberta ? 'cfg-btn-ghost' : 'cfg-btn-outline'}`} aria-expanded={aberta}>
                        {aberta ? <><ChevronDown size={16} aria-hidden="true" className="rotate-180" /> Fechar</> : <><Pencil size={15} aria-hidden="true" /> Editar</>}
                      </button>
                      <button type="button" onClick={() => pedirExclusaoRefeicao(i)} className="cfg-icon-btn cfg-icon-danger" aria-label={`Excluir ${nomeRef}`} title="Excluir refeição"><Trash size={16} aria-hidden="true" /></button>
                    </div>
                  </div>
                  {aberta && (
                    <div className="cfg-editor">
                      <div className="cfg-editor-row">
                        <label className="settings-field settings-field-grow"><span>Nome da refeição</span><input type="text" maxLength={60} value={ref.nome || ''} onChange={e => updateRefeicao(i, 'nome', e.target.value)} /></label>
                        <label className="settings-field cfg-time"><span>Horário</span><input type="time" value={/^\d{2}:\d{2}$/.test(ref.horario || '') ? ref.horario : ''} onChange={e => updateRefeicao(i, 'horario', e.target.value)} /></label>
                      </div>
                      <div className="cfg-food-row">
                        <label className="settings-field settings-field-grow"><span>Alimentos (separados por vírgula)</span><input type="text" value={textoAlimentos[ref.id] ?? (ref.alimentos || []).join(', ')} onChange={e => setTextoAlimentos(p => ({ ...p, [ref.id]: e.target.value }))} onBlur={e => updateRefeicao(i, 'alimentos', normalizarListaAlimentos(e.target.value))} placeholder="Ex.: 150 g de arroz, 120 g de frango, salada" /></label>
                        <button type="button" onClick={() => calcularMacrosRefeicao(i)} disabled={!textoAlimentos[ref.id]?.trim() || aiLoadingIdx === i} className="cfg-btn cfg-btn-outline" title="Calcular macros com IA">{aiLoadingIdx === i ? <Loader size={15} className="animate-spin" aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />} {aiLoadingIdx === i ? 'Analisando...' : 'Calcular com IA'}</button>
                      </div>
                      <div className="settings-macro-grid">
                        {[{ key: 'kcal', label: 'Calorias', unit: 'kcal' }, { key: 'proteinas', label: 'Proteínas', unit: 'g' }, { key: 'carboidratos', label: 'Carboidratos', unit: 'g' }, { key: 'gorduras', label: 'Gorduras', unit: 'g' }, { key: 'fibras', label: 'Fibras', unit: 'g' }].map(c => <label key={c.key} className="settings-field"><span>{c.label} ({c.unit})</span><input type="text" inputMode="decimal" value={ref[c.key] ?? 0} onChange={e => updateRefeicao(i, c.key, e.target.value)} /></label>)}
                      </div>
                      <div className="cfg-editor-foot"><button type="button" onClick={concluirEdicao} className="cfg-btn cfg-btn-solid"><Check size={16} aria-hidden="true" /> Concluir</button></div>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </section>
      )}
      </div>

      <ConfirmModal
        isOpen={confirmacao !== null}
        title={confirmacao?.title}
        message={confirmacao?.message}
        onConfirm={() => { const acao = confirmacao?.onConfirm; setConfirmacao(null); acao?.() }}
        onCancel={() => setConfirmacao(null)}
      />

      <div className="settings-footer"><button type="button" onClick={() => signOut(auth)} className="settings-logout"><LogOut size={15} /> Sair da conta</button><span>AkrGym v{import.meta.env.VITE_APP_VERSION || '3.2'} · {new Date().getFullYear()}</span></div>
    </div>
  )
}
