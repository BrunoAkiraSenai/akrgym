const decimal = value => typeof value === 'number' ? value : /^\d+(?:[.,]\d+)?$/.test(String(value).trim()) ? Number(String(value).trim().replace(',', '.')) : NaN

export function exercicioPreenchido(ex) {
  const carga = decimal(ex?.carga), reps = decimal(ex?.reps)
  return Number.isFinite(carga) && carga >= 0 && carga <= 1000 && Number.isInteger(reps) && reps > 0 && reps <= 1000
}

// Legacy IDs include position to avoid mixing two exercises with the same name.
export const exerciseId = (ex, index) => ex.id || `legacy:${index}:${ex.nome}`
export const routineFingerprint = routine => JSON.stringify((routine?.exercicios || []).map((ex, index) => [exerciseId(ex, index), ex.nome, ex.meta_reps, ex.base_top, ex.tem_aquecimento, ex.IsAgachamento, ex.nota]))

export function validDraft(draft, routine) {
  if (!routine || !Array.isArray(draft?.topSetData) || !draft.topSetData.length) return false
  // Old drafts without a fingerprint can no longer prove which plan they used.
  return draft.fingerprint === routineFingerprint(routine)
    && draft.topSetData.length === routine.exercicios.length
    && draft.topSetData.every((ex, i) => ex.id === exerciseId(routine.exercicios[i], i) && ex.nome === routine.exercicios[i].nome)
}

export function prepareSession(routine, history = []) {
  return (routine.exercicios || []).map((ex, index) => {
    const id = exerciseId(ex, index)
    let previous
    for (const session of history) {
      const exercises = session.exercicios || []
      const exact = exercises.find(item => item.id === id)
      // Match by name only for unambiguous legacy entries.
      const candidates = exercises.filter(item => !item.id && item.nome === ex.nome)
      const uniqueName = routine.exercicios.filter(item => item.nome === ex.nome).length === 1
      const candidate = exact || (uniqueName && candidates.length === 1 ? candidates[0] : null)
      if (candidate && exercicioPreenchido({ carga: candidate.carga_top, reps: candidate.reps_top })) { previous = candidate; break }
    }
    return {
      id, nome: ex.nome, meta_reps: ex.meta_reps || '', carga: '', reps: '',
      ref: previous?.carga_top ?? ex.base_top ?? 0, repsAnterior: previous?.reps_top ?? null,
      tem_aquecimento: ex.tem_aquecimento ?? false, IsAgachamento: ex.IsAgachamento ?? false,
      nota: ex.nota ?? null, pulado: false,
    }
  })
}

export function recordedExercise(ex) {
  return { id: ex.id, nome: ex.nome, meta_reps: ex.meta_reps, carga_top: decimal(ex.carga), reps_top: decimal(ex.reps) }
}
