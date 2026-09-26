import { DEFAULT_DESCANSO_SEGUNDOS, normalizarDescansoSegundos } from './restTimer.js'

const decimal = value => typeof value === 'number' ? value : /^\d+(?:[.,]\d+)?$/.test(String(value).trim()) ? Number(String(value).trim().replace(',', '.')) : NaN
const descanso = value => {
  return normalizarDescansoSegundos(value, DEFAULT_DESCANSO_SEGUNDOS)
}

export function exercicioPreenchido(ex) {
  const carga = decimal(ex?.carga), reps = decimal(ex?.reps)
  return Number.isFinite(carga) && carga >= 0 && carga <= 1000 && Number.isInteger(reps) && reps > 0 && reps <= 1000
}

const palavrasDeLigacaoExercicio = new Set(['com', 'da', 'das', 'de', 'do', 'dos', 'na', 'nas', 'no', 'nos'])

function normalizarNomeExercicio(nome) {
  return String(nome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\bc\s*\//g, ' com ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(palavra => palavra && !palavrasDeLigacaoExercicio.has(palavra))
}

function nomesIguais(primeiroNome, segundoNome) {
  const primeiro = normalizarNomeExercicio(primeiroNome)
  const segundo = normalizarNomeExercicio(segundoNome)
  return primeiro.length === segundo.length && primeiro.every((palavra, index) => palavra === segundo[index])
}

function errosDeDigitação(primeiraPalavra, segundaPalavra) {
  if (primeiraPalavra === segundaPalavra) return 0
  if (Math.min(primeiraPalavra.length, segundaPalavra.length) < 5
    || Math.abs(primeiraPalavra.length - segundaPalavra.length) > 1) return Infinity

  let primeiro = 0
  let segundo = 0
  let erros = 0
  while (primeiro < primeiraPalavra.length && segundo < segundaPalavra.length) {
    if (primeiraPalavra[primeiro] === segundaPalavra[segundo]) {
      primeiro++
      segundo++
      continue
    }
    erros++
    if (erros > 1) return Infinity
    if (primeiraPalavra.length > segundaPalavra.length) primeiro++
    else if (segundaPalavra.length > primeiraPalavra.length) segundo++
    else { primeiro++; segundo++ }
  }

  return erros + (primeiro < primeiraPalavra.length || segundo < segundaPalavra.length ? 1 : 0)
}

export function nomesDeExerciciosCompativeis(primeiroNome, segundoNome) {
  const primeiro = normalizarNomeExercicio(primeiroNome)
  const segundo = normalizarNomeExercicio(segundoNome)
  const menor = primeiro.length <= segundo.length ? primeiro : segundo
  const maior = primeiro.length <= segundo.length ? segundo : primeiro

  if (menor.length === 0) return false
  if (menor.length === 1) {
    return maior.length === 1 && menor[0] === maior[0]
  }
  return menor.every((palavra, index) => errosDeDigitação(palavra, maior[index]) < Infinity)
    && menor.reduce((total, palavra, index) => total + errosDeDigitação(palavra, maior[index]), 0) <= 1
}

export function encontrarNomeExercicioExistente(nome, nomesExistentes = []) {
  const catalogo = new Map()
  for (const nomeExistente of nomesExistentes) {
    const nomeLimpo = String(nomeExistente || '').trim()
    const chave = normalizarNomeExercicio(nomeLimpo).join(' ')
    if (chave && !catalogo.has(chave)) catalogo.set(chave, nomeLimpo)
  }

  const nomes = [...catalogo.values()]
  const exato = nomes.find(nomeExistente => nomesIguais(nomeExistente, nome))
  if (exato) return exato

  const compativeis = nomes.filter(nomeExistente => nomesDeExerciciosCompativeis(nomeExistente, nome))
  return compativeis.length === 1 ? compativeis[0] : null
}

export function encontrarExercicioAnterior(historico, nome) {
  for (const sessao of historico || []) {
    const candidatos = (sessao.exercicios || []).filter(ex =>
      nomesDeExerciciosCompativeis(nome, ex.nome)
      && exercicioPreenchido({ carga: ex.carga_top, reps: ex.reps_top }),
    )
    const exato = candidatos.find(ex => nomesIguais(ex.nome, nome))
    if (exato) return exato
    if (candidatos.length === 1) return candidatos[0]
  }
  return null
}

// Legacy IDs include position to avoid mixing two exercises with the same name.
export const exerciseId = (ex, index) => ex.id || `legacy:${index}:${ex.nome}`
export const routineFingerprint = routine => JSON.stringify((routine?.exercicios || []).map((ex, index) => [exerciseId(ex, index), ex.nome, ex.meta_reps, ex.base_top, ex.tem_aquecimento, ex.IsAgachamento, ex.nota]))

export function validDraft(draft, routine) {
  if (!routine || !Array.isArray(draft?.topSetData) || !draft.topSetData.length) return false
  // Old drafts without a fingerprint can no longer prove which plan they used.
  return draft.fingerprint === routineFingerprint(routine)
    && draft.topSetData.length === routine.exercicios.length
    && draft.topSetData.every((ex, i) => {
      const original = routine.exercicios[i]
      const originalId = exerciseId(original, i)
      if (ex.substituidoDe) {
        return Boolean(ex.nome?.trim())
          && ex.substituidoDe === original.nome
          && ex.substituidoDeId === originalId
      }
      return ex.id === originalId && ex.nome === original.nome
    })
}

export function normalizarRascunho(draft, routine) {
  if (!draft?.topSetData || !routine?.exercicios) return draft
  return {
    ...draft,
    topSetData: draft.topSetData.map((ex, index) => ({
      ...ex,
      descanso_segundos: descanso(ex.descanso_segundos ?? routine.exercicios[index]?.descanso_segundos),
    })),
  }
}

export function prepareSession(routine, history = []) {
  return (routine.exercicios || []).map((ex, index) => {
    const id = exerciseId(ex, index)
    let previous
    for (const session of history) {
      const exercises = session.exercicios || []
      const exact = exercises.find(item => item.id === id)
      // Match by name only for unambiguous legacy entries.
      const candidates = exercises.filter(item => nomesDeExerciciosCompativeis(item.nome, ex.nome))
      const uniqueName = routine.exercicios.filter(item => nomesDeExerciciosCompativeis(item.nome, ex.nome)).length === 1
      const associadoPorId = exercises.find(item => item.exercicio_associado_id === id)
      const associado = uniqueName
        ? exercises.find(item => item.exercicio_associado_nome && nomesIguais(item.exercicio_associado_nome, ex.nome))
        : null
      const candidate = exact || associadoPorId || associado || (uniqueName && candidates.length === 1 ? candidates[0] : null)
      if (candidate && exercicioPreenchido({ carga: candidate.carga_top, reps: candidate.reps_top })) { previous = candidate; break }
    }
    return {
      id, nome: ex.nome, meta_reps: ex.meta_reps || '', carga: '', reps: '',
      ref: previous?.carga_top ?? ex.base_top ?? 0, repsAnterior: previous?.reps_top ?? null,
      descanso_segundos: descanso(ex.descanso_segundos),
      tem_aquecimento: ex.tem_aquecimento ?? false, IsAgachamento: ex.IsAgachamento ?? false,
      nota: ex.nota ?? null, pulado: false,
    }
  })
}

export function recordedExercise(ex) {
  const recorded = { id: ex.id, nome: ex.nome, meta_reps: ex.meta_reps, carga_top: decimal(ex.carga), reps_top: decimal(ex.reps), descanso_segundos: descanso(ex.descanso_segundos) }
  if (ex.substituidoDe) {
    recorded.substituido_de = ex.substituidoDe
    recorded.substituido_de_id = ex.substituidoDeId
    recorded.exercicio_associado_nome = ex.exercicioAssociadoNome || ex.nome
    if (exercicioAssociadoIdValido(ex.exercicioAssociadoId)) {
      recorded.exercicio_associado_id = ex.exercicioAssociadoId
    }
  }
  return recorded
}

function exercicioAssociadoIdValido(id) {
  return typeof id === 'string' && id.length > 0
}

export function createReplacementExercise(ex, nome, token, referenciaAnterior = null, reutilizarIdAssociado = true) {
  const originalNome = ex.substituidoDe || ex.nome
  const originalId = ex.substituidoDeId || ex.id
  const exercicioAssociadoId = exercicioAssociadoIdValido(referenciaAnterior?.id) ? referenciaAnterior.id : null
  return {
    ...ex,
    id: reutilizarIdAssociado && exercicioAssociadoId ? exercicioAssociadoId : `substituicao:${originalId}:${token}`,
    nome: referenciaAnterior?.nome || nome,
    exercicioAssociadoNome: referenciaAnterior?.nome || nome,
    exercicioAssociadoId,
    substituidoDe: originalNome,
    substituidoDeId: originalId,
    descanso_segundos: DEFAULT_DESCANSO_SEGUNDOS,
    carga: '',
    reps: '',
    ref: referenciaAnterior?.carga_top ?? 0,
    repsAnterior: referenciaAnterior?.reps_top ?? null,
    pulado: false,
    // A replacement has no catalog metadata yet; never reuse the old protocol.
    tem_aquecimento: false,
    IsAgachamento: false,
    nota: null,
  }
}
