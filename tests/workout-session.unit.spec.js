import test from 'node:test'
import assert from 'node:assert/strict'
import { exercicioPreenchido, encontrarExercicioAnterior, encontrarNomeExercicioExistente, nomesDeExerciciosCompativeis, prepareSession, validDraft, routineFingerprint, recordedExercise, createReplacementExercise, normalizarRascunho } from '../src/utils/workoutSession.js'

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

test('nome digitado recupera a referência por nome completo, parcial e sem acentos', () => {
  const historico = [{ exercicios: [{
    id: 'anterior-1', nome: 'Supino Inclinado com Halteres', carga_top: 32.5, reps_top: 8,
  }] }]
  const anterior = encontrarExercicioAnterior(historico, 'supino inclinado')
  assert.equal(anterior.nome, 'Supino Inclinado com Halteres')
  assert.equal(nomesDeExerciciosCompativeis('supinoo inclinado', 'Supino inclinado com Halteres'), true)
  assert.equal(nomesDeExerciciosCompativeis('Supino inclinado c/ halteres', 'supino inclinado com halteres'), true)
  assert.equal(nomesDeExerciciosCompativeis('Supino inclinado', 'Supino reto com halteres'), false)
  assert.equal(nomesDeExerciciosCompativeis('Supino', 'Supino inclinado com halteres'), false)
  assert.equal(nomesDeExerciciosCompativeis('supinoo', 'Supino reto'), false)
  assert.equal(nomesDeExerciciosCompativeis('supinoo', 'Supino'), false)
  assert.equal(nomesDeExerciciosCompativeis('supino pra cima', 'Supino reto'), false)
  assert.equal(encontrarExercicioAnterior([{
    exercicios: [{ nome: 'Supino reto', carga_top: 80, reps_top: 8 }],
  }], 'supinoo'), null)
  assert.equal(encontrarExercicioAnterior(historico, ''), null)
})

test('troca só aceita exercício salvo e exige contexto suficiente para corrigir erro de digitação', () => {
  const existentes = ['Supino reto', 'Supino inclinado com halteres', 'Agachamento livre']
  assert.equal(encontrarNomeExercicioExistente('supinoo', existentes), null)
  assert.equal(encontrarNomeExercicioExistente('supino pra cima', existentes), null)
  assert.equal(encontrarNomeExercicioExistente('Supinoo inclinado', existentes), 'Supino inclinado com halteres')
  assert.equal(encontrarNomeExercicioExistente('supino reto', existentes), 'Supino reto')
  assert.equal(encontrarNomeExercicioExistente('Supino inclinado', [
    'Supino inclinado com halteres', 'Supino inclinado na máquina',
  ]), null)
})

test('sessão encontra histórico de uma substituição salva com nome equivalente', () => {
  const routine = { exercicios: [{ id: 'supino-configurado', nome: 'Supino inclinado com halteres', base_top: 10 }] }
  const history = [{ exercicios: [{
    id: 'substituicao:voador-1:token', nome: 'Supino inclinado', carga_top: 32.5, reps_top: 8,
  }] }]

  assert.equal(prepareSession(routine, history)[0].ref, 32.5)
  assert.equal(prepareSession(routine, history)[0].repsAnterior, 8)
})

test('substituição reaproveita a última carga quando há correspondência clara', () => {
  const original = { id: 'voador-1', nome: 'Voador', descanso_segundos: 90 }
  const historico = [{ exercicios: [{
    id: 'supino-anterior', nome: 'Supino inclinado com halteres', carga_top: 32.5, reps_top: 8,
  }] }]
  const replacement = createReplacementExercise(
    original,
    'Supino inclinado',
    'token',
    encontrarExercicioAnterior(historico, 'Supinoo inclinado'),
  )

  assert.equal(replacement.nome, 'Supino inclinado com halteres')
  assert.equal(replacement.ref, 32.5)
  assert.equal(replacement.repsAnterior, 8)
  assert.equal(replacement.id, 'supino-anterior')
  assert.equal(replacement.exercicioAssociadoId, 'supino-anterior')
  assert.equal(replacement.substituidoDe, 'Voador')
  assert.equal(replacement.descanso_segundos, 90)
  assert.equal(replacement.carga, '')
  assert.equal(replacement.reps, '')
})

test('substituição usa a identidade do exercício existente em vez de criar outro', () => {
  const original = { id: 'supino-maquina', nome: 'Supino inclinado na máquina' }
  const historicoOutraDivisao = [{ rotina_id: 'peito', exercicios: [
    { id: 'supino-halteres', nome: 'Supino inclinado com halteres', carga_top: 32.5, reps_top: 8 },
  ] }]
  const anterior = encontrarExercicioAnterior(historicoOutraDivisao, 'Supino inclinado com halteres')
  const replacement = createReplacementExercise(original, anterior.nome, 'novo-token', anterior)
  const recorded = recordedExercise({ ...replacement, carga: '35', reps: '8' })

  assert.equal(replacement.id, anterior.id)
  assert.equal(recorded.id, anterior.id)
  assert.equal(recorded.exercicio_associado_id, anterior.id)
})

test('associação não duplica ID já usado por outro exercício da sessão', () => {
  const original = { id: 'voador-1', nome: 'Voador' }
  const anterior = { id: 'supino-existente', nome: 'Supino inclinado com halteres' }
  const replacement = createReplacementExercise(original, anterior.nome, 'token', anterior, false)
  const recorded = recordedExercise({ ...replacement, carga: '30', reps: '8' })

  assert.notEqual(replacement.id, anterior.id)
  assert.equal(recorded.exercicio_associado_id, anterior.id)
})

test('substituição fica associada ao exercício escolhido para recuperar seu histórico', () => {
  const original = { id: 'voador-1', nome: 'Voador', descanso_segundos: 90 }
  const replacement = createReplacementExercise(original, 'Supino inclinado com halteres', 'token')
  const recorded = recordedExercise({ ...replacement, carga: '32,5', reps: '8' })
  const routine = { exercicios: [{ id: 'supino-inclinado', nome: 'Supino inclinado com halteres', base_top: 10 }] }

  assert.equal(recorded.exercicio_associado_nome, 'Supino inclinado com halteres')
  assert.equal(prepareSession(routine, [{ exercicios: [recorded] }])[0].ref, 32.5)
})

test('não usa referência quando o nome parcial corresponde a exercícios diferentes', () => {
  const historico = [{ exercicios: [
    { nome: 'Supino inclinado com halteres', carga_top: 32.5, reps_top: 8 },
    { nome: 'Supino inclinado na máquina', carga_top: 45, reps_top: 10 },
  ] }]
  assert.equal(encontrarExercicioAnterior(historico, 'Supino inclinado'), null)
  assert.equal(encontrarExercicioAnterior(historico, 'Supinoo inclinado'), null)
  assert.equal(encontrarExercicioAnterior(historico, 'Supino inclinado com halteres')?.carga_top, 32.5)
})

test('rascunhos só são retomados se ainda correspondem ao plano', () => {
  const routine = { exercicios: [{ nome: 'Supino', meta_reps: '8' }] }
  const draft = { fingerprint: routineFingerprint(routine), topSetData: prepareSession(routine) }
  assert.equal(validDraft(draft, routine), true)
  assert.equal(validDraft(draft, { exercicios: [{ nome: 'Remada' }] }), false)
  assert.equal(validDraft({ topSetData: draft.topSetData }, routine), false)
})

test('rascunho antigo continua válido e recebe o descanso configurado', () => {
  const routine = { exercicios: [{ id: 'supino-1', nome: 'Supino', meta_reps: '8', base_top: 60, descanso_segundos: 120 }] }
  const oldFingerprint = JSON.stringify(routine.exercicios.map(ex => [ex.id, ex.nome, ex.meta_reps, ex.base_top, undefined, undefined, undefined]))
  const draft = { fingerprint: oldFingerprint, topSetData: [{ id: 'supino-1', nome: 'Supino', meta_reps: '8', carga: '60', reps: '8' }] }

  assert.equal(validDraft(draft, routine), true)
  assert.equal(normalizarRascunho(draft, routine).topSetData[0].descanso_segundos, 120)
})

test('substituição não herda protocolo específico do exercício original', () => {
  const original = {
    id: 'agachamento-1', nome: 'Agachamento livre', meta_reps: '8',
    tem_aquecimento: true, IsAgachamento: true, nota: 'Usar barra olímpica',
    descanso_segundos: 180, carga: '100', reps: '5', ref: 90, repsAnterior: 5, pulado: false,
  }
  const replacement = createReplacementExercise(original, 'Supino reto', 'token')

  assert.equal(replacement.nome, 'Supino reto')
  assert.equal(replacement.substituidoDe, 'Agachamento livre')
  assert.equal(replacement.substituidoDeId, 'agachamento-1')
  assert.equal(replacement.tem_aquecimento, false)
  assert.equal(replacement.IsAgachamento, false)
  assert.equal(replacement.nota, null)
  assert.equal(replacement.carga, '')
  assert.equal(replacement.reps, '')
  assert.equal(replacement.ref, 0)
  assert.equal(replacement.repsAnterior, null)
  assert.equal(replacement.descanso_segundos, 90)
})
