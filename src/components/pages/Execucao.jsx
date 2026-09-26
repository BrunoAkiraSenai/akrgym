import { useState, useEffect, useCallback, useRef } from 'react'
import {
  collection, getDocs, query, where, orderBy, limit, runTransaction, doc, getDoc, setDoc, serverTimestamp,
} from 'firebase/firestore'
import { useUser } from '../../context/UserContext'
import { db } from '../../firebase'
import { METAS_DIARIAS } from '../../config/dieta'
import { exercicioPreenchido, encontrarExercicioAnterior, encontrarNomeExercicioExistente, prepareSession, validDraft, routineFingerprint, recordedExercise, createReplacementExercise, normalizarRascunho } from '../../utils/workoutSession'
import ConfirmModal from '../ConfirmModal'
import DescansoTimer from '../DescansoTimer'
import {
  Play, CheckCircle, Loader, ChevronLeft, ChevronRight, X,
  ArrowLeftRight, Flame, Info, RefreshCw, Search, Zap, SkipForward, Dumbbell,
} from 'lucide-react'

export default function Execucao({ onFinish, onIrParaConfig, activeTab }) {
  const user = useUser()
  const STORAGE_KEY = `rascunho_treino_${user.uid}`
  const [step, setStep] = useState('select')
  const [rotinaKey, setRotinaKey] = useState(null)
  const [topSetData, setTopSetData] = useState([])
  const [historicoTreino, setHistoricoTreino] = useState([])
  const [historicoGlobal, setHistoricoGlobal] = useState([])
  const [historicoGlobalCarregado, setHistoricoGlobalCarregado] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingHistorico, setLoadingHistorico] = useState(false)
  const [erro, setErro] = useState(null)
  const [recuperado, setRecuperado] = useState(false)
  const [sucesso, setSucesso] = useState(null)
  const [treinosState, setTreinosState] = useState(null)
  const [filtroBusca, setFiltroBusca] = useState('')
  const [trocaAberta, setTrocaAberta] = useState(null)
  const [buscaTroca, setBuscaTroca] = useState('')
  const [exercicioSelecionado, setExercicioSelecionado] = useState('')
  const [moduloCatalogo, setModuloCatalogo] = useState(null)
  const [carregandoCatalogo, setCarregandoCatalogo] = useState(false)
  const [erroTroca, setErroTroca] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const sessionId = useRef(null)
  const saveLock = useRef(false)
  const historyRequest = useRef(0)
  const catalogRequest = useRef(0)
  useEffect(() => () => { ++historyRequest.current; ++catalogRequest.current }, [])
  const isPrimeiroRender = useRef(true)

  const carregarTreinos = useCallback(async () => {
    try {
      const snap = await getDoc(doc(db, 'users', user.uid, 'config', 'data'))
      if (snap.exists()) {
        const treinosData = snap.data().treinos
        if (treinosData && Object.keys(treinosData).length > 0) {
          setTreinosState(treinosData)
        } else {
          setTreinosState({})
        }
      } else {
        await setDoc(doc(db, 'users', user.uid, 'config', 'data'), {
          treinos: {},
          refeicoes: [],
          metas: METAS_DIARIAS,
          onboardingConcluido: true,
        })
        setTreinosState({})
      }
    } catch (err) {
      console.error('Erro ao carregar treinos:', err)
      setErro('Erro ao carregar treinos. Verifique sua conexão.')
    }
  }, [user.uid])

  // Carrega treinos na montagem
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { carregarTreinos() }, [carregarTreinos])

  // Recarrega sempre que a aba Treinar for reativada (ex: depois de criar treino em Config)
  useEffect(() => {
    if (isPrimeiroRender.current) {
      isPrimeiroRender.current = false
      return
    }
    setStep('select')
    setRotinaKey(null)
    setTopSetData([])
    carregarTreinos()
  }, [activeTab, carregarTreinos])

  // Restaura um rascunho persistido ao entrar na sessão.
  useEffect(() => {
    if (!treinosState) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const draft = JSON.parse(raw)
      if (!draft?.rotinaKey || !draft?.topSetData?.length) return
      const rotinaRascunho = treinosState[draft.rotinaKey]
      if (!rotinaRascunho || !validDraft(draft, rotinaRascunho)) {
        localStorage.removeItem(STORAGE_KEY)
        return
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRotinaKey(draft.rotinaKey)
      setTopSetData(normalizarRascunho(draft, rotinaRascunho).topSetData)
      setStep('active')
      setRecuperado(true)
    } catch {
      // Rascunhos inválidos não interrompem a sessão atual.
    }
  }, [treinosState, STORAGE_KEY])

  const keys = treinosState ? Object.keys(treinosState) : []
  const exerciciosSalvos = [
    ...Object.values(treinosState || {}).flatMap(treino => treino.exercicios || []).map(ex => ex.nome),
    ...historicoTreino.flatMap(sessao => (sessao.exercicios || []).map(ex => ex.nome)),
    ...historicoGlobal.flatMap(sessao => (sessao.exercicios || []).map(ex => ex.nome)),
  ]
  const resultadosTroca = moduloCatalogo && buscaTroca.trim()
    ? moduloCatalogo.buscarExercicios(buscaTroca, exerciciosSalvos)
    : []

  useEffect(() => {
    const timer = setTimeout(() => {
      if (step === 'active' && rotinaKey && topSetData.length > 0) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ rotinaKey, topSetData, sessionId: sessionId.current, fingerprint: routineFingerprint(treinosState?.[rotinaKey]) })) }
        catch { setErro('Não foi possível guardar o rascunho neste navegador. Não feche a aba antes de finalizar.') }
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [rotinaKey, topSetData, step, STORAGE_KEY, treinosState])

  const iniciarTreino = useCallback(async (key) => {
    if (loadingHistorico) return
    if (!treinosState?.[key]) {
      setErro('Rotina não encontrada.')
      return
    }
    const protocolo = treinosState[key]
    const request = ++historyRequest.current
    sessionId.current = crypto.randomUUID()
    setTopSetData([])
    setHistoricoTreino([])
    setHistoricoGlobal([])
    setHistoricoGlobalCarregado(false)
    setRotinaKey(key)
    setStep('active')
    setTrocaAberta(null)
    setBuscaTroca('')
    setErroTroca(null)
    setLoadingHistorico(true)
    setRecuperado(false)
    setErro(null); setSucesso(null)
    try {
      const snap = await getDocs(
        query(collection(db, 'users', user.uid, 'historico_treinos'), where('rotina_id', '==', key), orderBy('data', 'desc'))
      )
      if (request !== historyRequest.current) return
      const historico = snap.docs.map(item => item.data())
      setHistoricoTreino(historico)
      setTopSetData(prepareSession(protocolo, historico))
    } catch {
      if (request !== historyRequest.current) return
      setHistoricoTreino([])
      setErro('Histórico indisponível. As referências abaixo são as cargas do plano, não da última sessão.')
      setTopSetData(prepareSession(protocolo))
    }
    setLoadingHistorico(false)
  }, [loadingHistorico, treinosState, user.uid])

  const atualizar = (exIdx, campo, valor) => {
    setTopSetData(prev => prev.map((ex, i) => i === exIdx ? { ...ex, [campo]: valor, pulado: false } : { ...ex }))
  }

  const alternarPulo = (exIdx) => {
    setTopSetData(prev => prev.map((ex, i) => i === exIdx ? { ...ex, pulado: !ex.pulado } : { ...ex }))
  }

  const abrirTroca = async (exIdx) => {
    setTrocaAberta(exIdx)
    setBuscaTroca('')
    setExercicioSelecionado('')
    setErroTroca(null)
    setErro(null)
    const request = ++catalogRequest.current
    setCarregandoCatalogo(true)
    try {
      const tarefas = []
      if (!moduloCatalogo) {
        tarefas.push(import('../../config/catalogoExercicios.js')
          .then(modulo => ({ tipo: 'catalogo', valor: modulo }))
          .catch(erro => ({ tipo: 'catalogo', erro })))
      }
      if (!historicoGlobalCarregado) {
        tarefas.push(getDocs(query(
          collection(db, 'users', user.uid, 'historico_treinos'),
          orderBy('data', 'desc'),
          limit(100),
        ))
          .then(snap => ({ tipo: 'historico', valor: snap.docs.map(item => item.data()) }))
          .catch(erro => ({ tipo: 'historico', erro })))
      }
      const resultados = await Promise.all(tarefas)
      if (request !== catalogRequest.current) return
      for (const resultado of resultados) {
        if (resultado.erro) {
          if (resultado.tipo === 'catalogo') setErroTroca('Não foi possível carregar a lista de exercícios. Tente novamente.')
          continue
        }
        if (resultado.tipo === 'catalogo') setModuloCatalogo(resultado.valor)
        if (resultado.tipo === 'historico') {
          setHistoricoGlobal(resultado.valor)
          setHistoricoGlobalCarregado(true)
        }
      }
    } catch {
      if (request === catalogRequest.current) setErroTroca('Não foi possível carregar a lista de exercícios. Tente novamente.')
    } finally {
      if (request === catalogRequest.current) setCarregandoCatalogo(false)
    }
  }

  const fecharTroca = () => {
    ++catalogRequest.current
    setTrocaAberta(null)
    setBuscaTroca('')
    setExercicioSelecionado('')
    setCarregandoCatalogo(false)
    setErroTroca(null)
  }

  const substituirExercicio = (exIdx, novoNome) => {
    const nomeBruto = String(novoNome || '')
    if (nomeBruto && !/^[A-Za-zÀ-ÖØ-öø-ÿ]/.test(nomeBruto)) {
      setErroTroca('O nome não pode começar com números ou caracteres especiais.')
      return
    }
    const nome = nomeBruto.trim()
    const atual = topSetData[exIdx]
    if (!atual || !nome) return
    if (nome.toLocaleLowerCase('pt-BR') === atual.nome.toLocaleLowerCase('pt-BR')) {
      setErroTroca('Escolha um exercício diferente do atual.')
      return
    }
    const exerciciosExistentes = [
      ...(moduloCatalogo?.CATALOGO_EXERCICIOS || []).map(ex => ex.nome),
      ...exerciciosSalvos,
    ]
    const nomeReconhecido = encontrarNomeExercicioExistente(nome, exerciciosExistentes)
    if (!nomeReconhecido) {
      setErroTroca('Esse exercício não está nos seus treinos salvos. Confira o nome ou adicione-o em Configurar.')
      return
    }
    const token = crypto.randomUUID()
    const anterior = encontrarExercicioAnterior([...historicoGlobal, ...historicoTreino], nomeReconhecido)
    const associacaoJaUsada = anterior?.id && topSetData.some((ex, index) => index !== exIdx && ex.id === anterior.id)
    const substituto = createReplacementExercise(atual, nomeReconhecido, token, anterior, !associacaoJaUsada)
    setTopSetData(prev => prev.map((ex, i) => i === exIdx ? substituto : ex))
    fecharTroca()
    setSucesso(`${substituto.nome} entrou no lugar de ${substituto.substituidoDe} nesta sessão.`)
  }

  const finalizarTreino = async () => {
    setShowConfirm(true)
  }

  const confirmarFinalizar = async () => {
    if (saveLock.current) return
    setShowConfirm(false)
    const container = document.querySelector('.treino-container')
    if (container) {
      container.classList.add('card-complete-glow')
      setTimeout(() => container.classList.remove('card-complete-glow'), 400)
    }
    setSaving(true); setErro(null); setSucesso(null)
    const exerciciosPendentes = topSetData.filter(ex => !ex.pulado && !exercicioPreenchido(ex))
    const exerciciosConcluidos = topSetData.filter(ex => !ex.pulado && exercicioPreenchido(ex))
    if (exerciciosConcluidos.length === 0) {
      setErro('Registre pelo menos um exercício ou volte a fazer um exercício pulado.')
      setSaving(false)
      return
    }
    if (exerciciosPendentes.length > 0) {
      setErro('Informe carga de 0 a 1000 kg e repetições inteiras de 1 a 1000 nos exercícios não pulados.')
      setSaving(false)
      return
    }
    saveLock.current = true
    try {
      sessionId.current ||= crypto.randomUUID()
      const target = doc(db, 'users', user.uid, 'historico_treinos', sessionId.current)
        const record = {
          rotina_id: rotinaKey,
          rotina_nome: treinosState[rotinaKey]?.nome || rotinaKey,
          data: new Date(),
          createdAt: serverTimestamp(),
          exercicios: exerciciosConcluidos.map(recordedExercise),
          exercicios_pulados: topSetData.filter(ex => ex.pulado).map(ex => ex.nome),
        }
        const substituicoes = exerciciosConcluidos.filter(ex => ex.substituidoDe).map(ex => ({
          original: ex.substituidoDe,
          substituto: ex.nome,
        }))
        if (substituicoes.length > 0) record.exercicios_substituidos = substituicoes
      await runTransaction(db, async transaction => {
        const existing = await transaction.get(target)
        if (!existing.exists()) transaction.set(target, record)
      })
      try { localStorage.removeItem(STORAGE_KEY) } catch { /* Remote record is safe. */ }
      setSucesso('Treino finalizado com sucesso!')
      setStep('select'); setTopSetData([]); setRotinaKey(null); setTrocaAberta(null); setBuscaTroca(''); setErroTroca(null)
      setSaving(false)
      saveLock.current = false
      onFinish()
    } catch (err) {
      console.error('Erro ao salvar treino:', err)
      saveLock.current = false
      setErro('Erro ao salvar treino. Tente novamente; esta sessão não será duplicada.')
      setSaving(false)
    }
  }

  if (step === 'select') {
    return (
      <div className="treino-select flex flex-col gap-3 pt-2 pb-4">
        <header className="treino-page-header">
          <div><p className="home-kicker">Sessão de hoje</p><h1 className="text-2xl font-bold tracking-tight text-white">Qual treino você vai fazer?</h1><p>Escolha uma divisão para começar a registrar.</p></div>
          <div className="treino-header-mark" aria-hidden="true"><Play size={18} fill="currentColor" /></div>
        </header>
        <DescansoTimer storageKey={`descanso_rapido_${user.uid}`} />
        {erro && (
          <div className="exec-feedback exec-feedback-error" role="alert">{erro}</div>
        )}
        {keys.length === 0 ? (
          <div className="treino-empty card-premium">
            <Dumbbell size={28} aria-hidden="true" />
            <strong>Nenhum treino configurado</strong>
            <span>Crie uma divisão em Configurações para começar a registrar suas séries.</span>
            {onIrParaConfig && <button type="button" onClick={onIrParaConfig} className="btn-primary mt-2 px-4 py-2.5 text-xs">Configurar treino</button>}
          </div>
        ) : keys.map(key => {
          const r = treinosState[key]
          return (
            <button
              key={key}
              type="button"
              // eslint-disable-next-line react-hooks/refs
              onClick={() => iniciarTreino(key)}
              disabled={loadingHistorico}
              className="treino-routine-card card-premium"
            >
              <span className="treino-routine-index">{String(keys.indexOf(key) + 1).padStart(2, '0')}</span>
              <span className="treino-routine-copy"><strong>{r?.nome || key}</strong><small>{r?.exercicios?.length || 0} {(r?.exercicios?.length || 0) === 1 ? 'exercício' : 'exercícios'}</small></span>
              <span className="treino-routine-action">Começar <ChevronRight size={17} /></span>
            </button>
          )
        })}
      </div>
    )
  }

  const rotina = treinosState?.[rotinaKey]
  const exerciciosPreenchidos = topSetData.filter(ex => !ex.pulado && exercicioPreenchido(ex)).length
  const exerciciosPulados = topSetData.filter(ex => ex.pulado).length
  const exerciciosSubstituidos = topSetData.filter(ex => ex.substituidoDe).length
  const exerciciosPendentes = topSetData.filter(ex => !ex.pulado && !exercicioPreenchido(ex)).length
  const podeFinalizar = topSetData.length > 0 && exerciciosPreenchidos > 0 && exerciciosPendentes === 0

  return (
    <div className="treino-container flex flex-col gap-3 pt-1 pb-4">
      <div className="treino-active-header">
          <button type="button" onClick={() => { setStep('select'); setRotinaKey(null); setErro(null); setRecuperado(false); setSucesso(null); setTrocaAberta(null); setBuscaTroca(''); setErroTroca(null) }}
          className="treino-back-button" aria-label="Voltar para escolher o treino">
          <ChevronLeft size={22} />
        </button>
        <div className="min-w-0"><p className="home-kicker">Treino em andamento</p><h1 className="truncate text-xl font-bold tracking-tight text-white">{rotina?.nome}</h1></div>
        <span className="treino-progress-badge">{exerciciosPreenchidos}/{topSetData.length}</span>
      </div>

      <DescansoTimer storageKey={`descanso_rapido_${user.uid}`} />

      {recuperado && (
        <div className="exec-feedback exec-feedback-info">
          <span><CheckCircle size={14} /> Rascunho recuperado</span>
          <button type="button" onClick={() => {
            setRecuperado(false)
            setStep('select')
            setRotinaKey(null)
            setTopSetData([])
            setErro(null); setSucesso(null); setTrocaAberta(null); setBuscaTroca(''); setErroTroca(null)
          }} className="exec-discard-button">Descartar</button>
        </div>
      )}

      {erro && (
        <div className="exec-feedback exec-feedback-error" role="alert">
          <span className="flex-1">{erro}</span>
          <button type="button" onClick={() => setErro(null)} aria-label="Fechar aviso" className="exec-close-button">
            <X size={14} />
          </button>
        </div>
      )}

      {sucesso && (
        <div className="exec-feedback exec-feedback-success">
          <CheckCircle size={14} /> {sucesso}
        </div>
      )}

      {loadingHistorico ? (
        <div className="space-y-2"><div className="skeleton skeleton-card" /><div className="skeleton skeleton-card" /></div>
      ) : topSetData.length === 0 ? (
        <p className="text-neutral-600 text-center py-4 text-sm">Nenhum exercício.</p>
      ) : (() => {
        const exercicios = topSetData.map((ex, originalIndex) => ({ ex, originalIndex })).filter(({ ex }) => !filtroBusca || ex.nome.toLowerCase().includes(filtroBusca.toLowerCase()))
        const busca = (
        <div className="exec-search">
          <Search size={15} aria-hidden="true" />
          <input type="search" aria-label="Buscar exercício" placeholder="Buscar exercício" value={filtroBusca}
            onChange={e => setFiltroBusca(e.target.value)}
            className="w-full" />
          {filtroBusca && <button type="button" onClick={() => setFiltroBusca('')} aria-label="Limpar busca"><X size={14} /></button>}
        </div>)
        const cards = exercicios.map(({ ex, originalIndex }) => {
          // Custom replacements do not have catalog metadata, so keep the generic protocol.
          const isAgachamento = !ex.substituidoDe && (ex.IsAgachamento || ex.nome?.toLowerCase().includes('agachamento'))
          const aqPeso = ex.tem_aquecimento && !isAgachamento ? Math.round(ex.ref * 0.6) : null
          const prepPeso = Math.round(ex.ref * 0.85)
          const cargaHoje = Number(ex.carga)
          const backoffPeso = cargaHoje > 0
            ? (isAgachamento ? Math.round(cargaHoje * 0.9) : Math.round(cargaHoje * 0.85))
            : null

          return (
            <div key={`${originalIndex}-${ex.nome}`} className={`exec-exercise-card card-premium${ex.pulado ? ' is-skipped' : ''}`}>
              <div className="flex items-center justify-between">
                <h2 className="text-white font-semibold text-sm tracking-tight">{ex.nome}</h2>
                <span className="text-neutral-500 text-[11px] font-mono">meta {ex.meta_reps}</span>
              </div>

              {ex.substituidoDe && (
                <div className="exec-substitution-note">
                  <ArrowLeftRight size={13} aria-hidden="true" />
                  <span>Substitui <strong>{ex.substituidoDe}</strong> somente neste treino</span>
                </div>
              )}

              <div className="exec-exercise-actions">
                <button type="button"
                  // eslint-disable-next-line react-hooks/refs
                  onClick={() => trocaAberta === originalIndex ? fecharTroca() : abrirTroca(originalIndex)}
                  className={`exec-replace-button${trocaAberta === originalIndex ? ' is-open' : ''}`} aria-expanded={trocaAberta === originalIndex}>
                  <ArrowLeftRight size={14} /> Trocar exercício
                </button>
                <button type="button" onClick={() => alternarPulo(originalIndex)} className={`exec-skip-button${ex.pulado ? ' is-skipped' : ''}`}>
                  {ex.pulado ? <><RefreshCw size={14} /> Fazer exercício</> : <><SkipForward size={14} /> Pular exercício</>}
                </button>
              </div>

              {trocaAberta === originalIndex && (
                <div className="exec-replace-panel">
                  <div className="exec-replace-heading">
                    <div><strong>Trocar exercício</strong><span>A alteração vale apenas para esta sessão.</span></div>
                    <button type="button" onClick={fecharTroca} aria-label="Fechar troca de exercício"><X size={14} /></button>
                  </div>
                  <label className="exec-replace-field">
                    <span>Pesquise e selecione um exercício</span>
                    <input autoFocus type="text" placeholder="Ex.: Supino inclinado" value={buscaTroca}
                      aria-invalid={Boolean(erroTroca)}
                      onChange={e => {
                        const value = e.target.value
                        if (!value || /^[A-Za-zÀ-ÖØ-öø-ÿ]/.test(value)) {
                          setBuscaTroca(value)
                          setExercicioSelecionado('')
                          setErroTroca(null)
                        } else {
                          setErroTroca('O nome não pode começar com números ou caracteres especiais.')
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key !== 'Enter') return
                        e.preventDefault()
                        // eslint-disable-next-line react-hooks/refs
                        if (exercicioSelecionado) substituirExercicio(originalIndex, exercicioSelecionado)
                        else if (resultadosTroca[0]) setExercicioSelecionado(resultadosTroca[0].nome)
                      }} />
                    {erroTroca && <small className="exec-replace-error" role="alert">{erroTroca}</small>}
                  </label>
                  <div className="exec-replace-results" role="listbox" aria-label="Exercícios encontrados">
                    {carregandoCatalogo ? (
                      <p className="exec-replace-empty" role="status">Carregando exercícios…</p>
                    ) : !buscaTroca.trim() ? (
                      <p className="exec-replace-empty">Digite o nome para ver exercícios e variações.</p>
                    ) : resultadosTroca.length === 0 ? (
                      <p className="exec-replace-empty">Nenhum exercício encontrado. Tente outro nome.</p>
                    ) : resultadosTroca.map(opcao => (
                      <button key={`${opcao.grupo}:${opcao.nome}`} type="button" role="option"
                        aria-selected={exercicioSelecionado === opcao.nome}
                        className={`exec-replace-option${exercicioSelecionado === opcao.nome ? ' is-selected' : ''}`}
                        onClick={() => { setExercicioSelecionado(opcao.nome); setErroTroca(null) }}>
                        <span><strong>{opcao.nome}</strong><small>{opcao.grupo}</small></span>
                        {exercicioSelecionado === opcao.nome && <CheckCircle size={16} aria-hidden="true" />}
                      </button>
                    ))}
                  </div>
                  {exercicioSelecionado && <p className="exec-replace-selection">Selecionado: <strong>{exercicioSelecionado}</strong></p>}
                  <div className="exec-replace-actions">
                    <button type="button" className="exec-replace-cancel" onClick={fecharTroca}>Cancelar</button>
                    <button type="button" className="exec-replace-custom" disabled={!exercicioSelecionado || Boolean(erroTroca)} onClick={() => substituirExercicio(originalIndex, exercicioSelecionado)}>
                      Trocar exercício
                    </button>
                  </div>
                </div>
              )}

              {ex.pulado ? (
                <div className="exec-skipped-state">
                  <SkipForward size={17} />
                  <div><strong>Exercício pulado</strong><span>Ele não será registrado neste treino. Você pode desfazer acima.</span></div>
                </div>
              ) : <>

              <div className="flex items-center gap-2 text-emerald-400/80 text-[11px] font-mono bg-emerald-500/5 rounded-xl px-3 py-2 border border-emerald-500/10">
                <Flame size={12} className="shrink-0" />
                <span>Referência: <strong className="text-emerald-300">{ex.ref}kg</strong>
                  {ex.repsAnterior ? ` · últ. ${ex.repsAnterior} reps` : ''}
                </span>
              </div>

              {ex.nota && (
                <div className="flex items-start gap-1.5 text-orange-400/80 text-[11px] bg-orange-500/5 rounded-xl px-3 py-2 border border-orange-500/10">
                  <Info size={12} className="shrink-0 mt-0.5" />
                  <span>{ex.nota}</span>
                </div>
              )}

              <DescansoTimer defaultSeconds={ex.descanso_segundos} label="Descanso" exerciseName={ex.nome} compact />

              <div className="bg-black/30 rounded-xl p-3 space-y-1.5 border border-white/5">
                <div className="section-label mb-1.5">Protocolo</div>

                {ex.tem_aquecimento && (
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-neutral-500 font-mono flex items-center gap-1.5">
                      <RefreshCw size={11} className="text-blue-400/70" /> Aquec.
                    </span>
                    <span className="text-neutral-400 font-mono">
                      {isAgachamento ? 'Barra Olímpica × 10' : `${aqPeso}kg × 10`}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-neutral-500 font-mono flex items-center gap-1.5">
                    <Zap size={11} className="text-yellow-400/70" /> Preparatória
                  </span>
                  <span className="text-neutral-400 font-mono">{prepPeso}kg × 6</span>
                </div>

                <div className="border-t border-white/5 pt-2 mt-2">
                  <div className="flex items-center justify-between text-[12px] mb-2">
                    <span className="text-emerald-400 font-semibold flex items-center gap-1.5 tracking-tight">
                      <Flame size={13} /> TOP SET
                    </span>
                    <span className="text-neutral-500 text-[11px] font-mono">superar {ex.ref}kg</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="exec-field">
                      <span>Carga (kg)</span>
                      <input
                      type="number" inputMode="numeric" placeholder="kg"
                      value={ex.carga}
                      onChange={e => atualizar(originalIndex, 'carga', e.target.value)}
                      />
                    </label>
                    <label className="exec-field">
                      <span>Repetições</span>
                      <input
                      type="number" inputMode="numeric" placeholder="reps"
                      value={ex.reps}
                      onChange={e => atualizar(originalIndex, 'reps', e.target.value)}
                      />
                    </label>
                  </div>
                </div>

                {backoffPeso && (
                  <div className="flex items-center justify-between text-[12px] pt-1.5 border-t border-white/5">
                    <span className="text-neutral-500 font-mono flex items-center gap-1.5">
                      <RefreshCw size={11} className="text-purple-400/70" /> Back-Off
                    </span>
                    <span className="text-purple-300/80 font-mono font-semibold">
                      {isAgachamento ? `-10%: ${backoffPeso}kg × 6-8` : `${backoffPeso}kg × 8-10`}
                    </span>
                  </div>
                )}
              </div>
              </>}
            </div>
          )
        })
        return (
        <div className="flex flex-col gap-2">
          {busca}
          {cards}
        </div>
        )
      })()}

      <div className="treino-footer">
        <div className="treino-footer-status"><span>{exerciciosPreenchidos} de {topSetData.length} exercícios preenchidos{exerciciosPulados > 0 ? ` · ${exerciciosPulados} pulado${exerciciosPulados === 1 ? '' : 's'}` : ''}{exerciciosSubstituidos > 0 ? ` · ${exerciciosSubstituidos} trocado${exerciciosSubstituidos === 1 ? '' : 's'}` : ''}</span><strong>{podeFinalizar ? 'Tudo pronto' : exerciciosPulados > 0 ? 'Preencha os demais ou pule outros exercícios' : 'Preencha os dois campos de cada exercício'}</strong></div>
        <button
          type="button"
          onClick={finalizarTreino}
          disabled={!podeFinalizar || saving}
          className="btn-primary w-full text-base py-4 flex items-center justify-center gap-2">
          {saving ? <><Loader size={19} className="animate-spin" /> Salvando...</>
          : <><CheckCircle size={19} /> Finalizar treino</>}
        </button>
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        title="Finalizar treino?"
        message="Os dados serão salvos no histórico. Exercícios pulados não serão registrados. Deseja continuar?"
        onConfirm={confirmarFinalizar}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  )
}
