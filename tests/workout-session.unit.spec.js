import test from 'node:test'
import assert from 'node:assert/strict'
import { exercicioPreenchido, prepareSession, validDraft, routineFingerprint, recordedExercise } from '../src/utils/workoutSession.js'

test('sessão aceita peso corporal, decimais brasileiros e somente repetições inteiras', () => {
  assert.equal(exercicioPreenchido({ carga: '0', reps: '8' }), true)
  assert.equal(exercicioPreenchido({ carga: '', reps: '8' }), false)
  for (const reps of ['2.5', '', null, -1, 1001]) assert.equal(exercicioPreenchido({ carga: '20', reps }), false)
  assert.equal(exercicioPreenchido({ carga: '12,5', reps: '8' }), true)
  assert.equal(recordedExercise({ carga: '12,5', reps: '8' }).carga_top, 12.5)
})

test('referências procuram sessões anteriores, sem misturar nomes duplicados', () => {
  const routine = { exercicios: [{ nome: 'Supino', base_top: 10 }, { nome: 'Remada', base_top: 5 }] }
  const data = prepareSession(routine, [{ exercicios: [{ nome: 'Remada', carga_top: 30, reps_top: 8 }] }, { exercicios: [{ nome: 'Supino', carga_top: 80, reps_top: 7 }] }])
  assert.equal(data[0].ref, 80)
  assert.equal(data[1].ref, 30)
  const duplicate = { exercicios: [{ nome: 'Supino', base_top: 10 }, { nome: 'Supino', base_top: 20 }] }
  assert.deepEqual(prepareSession(duplicate, [{ exercicios: [{ nome: 'Supino', carga_top: 80, reps_top: 8 }] }]).map(ex => ex.ref), [10, 20])
})

test('rascunhos só são retomados se ainda correspondem ao plano', () => {
  const routine = { exercicios: [{ nome: 'Supino', meta_reps: '8' }] }
  const draft = { fingerprint: routineFingerprint(routine), topSetData: prepareSession(routine) }
  assert.equal(validDraft(draft, routine), true)
  assert.equal(validDraft(draft, { exercicios: [{ nome: 'Remada' }] }), false)
  assert.equal(validDraft({ topSetData: draft.topSetData }, routine), false)
})
