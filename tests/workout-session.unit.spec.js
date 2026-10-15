import test from 'node:test'
import assert from 'node:assert/strict'
import { exercicioPreenchido, encontrarExercicioAnterior, encontrarNomeExercicioExistente, nomesDeExerciciosCompativeis, prepareSession, validDraft, routineFingerprint, recordedExercise, createReplacementExercise, normalizarRascunho, reordenarExercicios, garantirIdsExercicios, exercicioUsaRegraAgachamento, valoresDoExercicio, reconciliarRascunho, chaveExercicio } from '../src/utils/workoutSession.js'

test('reordenar move o exercício inteiro e mantém a referência do histórico', () => {
  const exercicios = [
    { nome: 'Puxada', base_top: 55, meta_reps: '8-10', descanso_segundos: 120 },
    { nome: 'Supino', base_top: 75, meta_reps: '6-8', descanso_segundos: 180 },
    { nome: 'Rosca', base_top: 14, meta_reps: '10-12', descanso_segundos: 60 },
  ]
  const reordenados = reordenarExercicios(exercicios, 1, 0)
  assert.deepEqual(reordenados.map(ex => ex.nome), ['Supino', 'Puxada', 'Rosca'])
  assert.deepEqual(reordenados[0], exercicios[1])
  assert.deepEqual(exercicios.map(ex => ex.nome), ['Puxada', 'Supino', 'Rosca'])
  for (const [de, para] of [[0, 0], [-1, 0], [0, 3], [1.5, 0]]) assert.deepEqual(reordenarExercicios(exercicios, de, para), exercicios)

  // Sessão gravada na ordem antiga, com os IDs legados que dependem da posição.
  const historico = [{ exercicios: prepareSession({ exercicios }).map((ex, i) => recordedExercise({ ...ex, carga: [60, 80, 16][i], reps: 8 })) }]
  assert.deepEqual(prepareSession({ exercicios: reordenados }, historico).map(ex => [ex.nome, ex.ref]), [['Supino', 80], ['Puxada', 60], ['Rosca', 16]])
})

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

test('nome recupera a referência sem acentos e com erro de digitação, mas nunca de outra variação', () => {
  const historico = [{ exercicios: [{
    id: 'anterior-1', nome: 'Supino Inclinado com Halteres', carga_top: 32.5, reps_top: 8,
  }] }]
  assert.equal(encontrarExercicioAnterior(historico, 'supino inclinado halteres').nome, 'Supino Inclinado com Halteres')
  assert.equal(encontrarExercicioAnterior(historico, 'Supinoo inclinado com halteres').carga_top, 32.5)
  // Nome mais curto é outro exercício: não herda a carga da variação.
  assert.equal(encontrarExercicioAnterior(historico, 'supino inclinado'), null)
  assert.equal(nomesDeExerciciosCompativeis('supinoo inclinado', 'Supino inclinado com Halteres'), false)
  assert.equal(nomesDeExerciciosCompativeis('Supino reto', 'Supino reto na máquina'), false)
  assert.equal(nomesDeExerciciosCompativeis('Rosca direta', 'Rosca direta na polia'), false)
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
  assert.equal(encontrarNomeExercicioExistente('Supinoo inclinado', existentes), null)
  assert.equal(encontrarNomeExercicioExistente('Supinoo inclinado com halteres', existentes), 'Supino inclinado com halteres')
  assert.equal(encontrarNomeExercicioExistente('supino reto', existentes), 'Supino reto')
  assert.equal(encontrarNomeExercicioExistente('Supino inclinado', [
    'Supino inclinado com halteres', 'Supino inclinado na máquina',
  ]), null)
})

test('sessão encontra histórico de uma substituição salva com o mesmo exercício', () => {
  const routine = { exercicios: [{ id: 'supino-configurado', nome: 'Supino inclinado com halteres', base_top: 10 }] }
  const history = [{ exercicios: [{
    id: 'substituicao:voador-1:token', nome: 'Supino inclinado c/ halteres', carga_top: 32.5, reps_top: 8,
  }] }]

  assert.equal(prepareSession(routine, history)[0].ref, 32.5)
  assert.equal(prepareSession(routine, history)[0].repsAnterior, 8)
  // Uma variação no histórico não vira referência: vale a carga inicial do plano.
  const variacao = [{ exercicios: [{ id: 'x', nome: 'Supino inclinado na máquina', carga_top: 90, reps_top: 8 }] }]
  assert.equal(prepareSession({ exercicios: [{ nome: 'Supino inclinado', base_top: 10 }] }, variacao)[0].ref, 10)
})

test('renomear o exercício em Configurações não herda a carga do nome antigo', () => {
  const antes = { exercicios: garantirIdsExercicios([{ nome: 'Puxada', base_top: 40 }, { nome: 'Supino', base_top: 60 }]) }
  const historico = [{ exercicios: prepareSession(antes).map((ex, i) => recordedExercise({ ...ex, carga: [55, 80][i], reps: 8 })) }]
  const depois = { exercicios: [{ ...antes.exercicios[0], nome: 'Supino' }, { ...antes.exercicios[1], nome: 'Puxada' }] }
  assert.deepEqual(prepareSession(depois, historico).map(ex => [ex.nome, ex.ref]), [['Supino', 80], ['Puxada', 55]])
})

test('IDs fixados preservam o histórico de exercícios com o mesmo nome depois de reordenar', () => {
  const exercicios = garantirIdsExercicios([{ nome: 'Supino', base_top: 10 }, { nome: 'Supino', base_top: 20 }, { nome: 'Remada', base_top: 5 }])
  assert.deepEqual(exercicios.map(ex => ex.id), ['legacy:0:Supino', 'legacy:1:Supino', 'legacy:2:Remada'])
  assert.equal(new Set(garantirIdsExercicios([{ id: 'a', nome: 'X' }, { id: 'a', nome: 'Y' }]).map(ex => ex.id)).size, 2)
  const historico = [{ exercicios: prepareSession({ exercicios }).map((ex, i) => recordedExercise({ ...ex, carga: [60, 70, 30][i], reps: 8 })) }]
  const reordenados = reordenarExercicios(exercicios, 1, 0)
  assert.deepEqual(prepareSession({ exercicios: reordenados }, historico).map(ex => ex.ref), [70, 60, 30])
})

test('regra do agachamento acompanha o nome, não a posição em que o exercício foi criado', () => {
  assert.equal(exercicioUsaRegraAgachamento({ nome: 'Agachamento livre' }), true)
  assert.equal(exercicioUsaRegraAgachamento({ nome: 'Extensora', IsAgachamento: true }), false)
  assert.equal(exercicioUsaRegraAgachamento({ nome: 'Agachamento livre', substituidoDe: 'Leg press' }), false)
})

test('substituição mantém o nome escolhido e reaproveita a última carga do mesmo exercício', () => {
  const original = { id: 'voador-1', nome: 'Voador', descanso_segundos: 90 }
  const historico = [{ exercicios: [{
    id: 'supino-anterior', nome: 'Supino inclinado c/ halteres', carga_top: 32.5, reps_top: 8,
  }] }]
  const replacement = createReplacementExercise(
    original,
    'Supino inclinado com halteres',
    'token',
    encontrarExercicioAnterior(historico, 'Supino inclinado com halteres'),
  )
  const semHistorico = createReplacementExercise(original, 'Rosca direta na polia', 'token', encontrarExercicioAnterior([{ exercicios: [{ id: 'r', nome: 'Rosca direta', carga_top: 30, reps_top: 8 }] }], 'Rosca direta na polia'))
  assert.equal(semHistorico.nome, 'Rosca direta na polia')
  assert.equal(semHistorico.ref, 0)

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

test('trocar de exercício traz carga e reps do último treino dele, do plano ou em branco', () => {
  const historico = [
    { data: '2026-10-12', exercicios: [{ nome: 'Puxada aberta', carga_top: 55, reps_top: 9, meta_reps: '8-10', descanso_segundos: 120 }] },
    { data: '2026-10-08', exercicios: [{ nome: 'Supino reto', carga_top: 80, reps_top: 7, meta_reps: '6-8', descanso_segundos: 180 }, { nome: 'Rosca direta', carga_top: '', reps_top: '' }] },
    { data: '2026-10-01', exercicios: [{ nome: 'Supino reto', carga_top: 75, reps_top: 8, meta_reps: '6-8' }] },
  ]
  const treinos = {
    upper: { nome: 'Upper', exercicios: [{ nome: 'Puxada', base_top: 40, meta_reps: '10' }, { nome: 'Supino reto', base_top: 60, meta_reps: '8-12', tem_aquecimento: true }] },
    lower: { nome: 'Lower', exercicios: [{ nome: 'Cadeira extensora', base_top: 50, meta_reps: '12-15', descanso_segundos: 60, tem_aquecimento: false }] },
  }

  // Último registro vence o plano; a meta registrada vence as reps feitas.
  const supino = valoresDoExercicio('Supino reto', { historico, treinos })
  assert.deepEqual({ ...supino, origem: supino.origem.tipo }, { base_top: 80, meta_reps: '6-8', descanso_segundos: 180, tem_aquecimento: true, origem: 'historico' })

  // Sem histórico, copia de outra posição do plano.
  const extensora = valoresDoExercicio('Cadeira extensora', { historico, treinos, ignorar: { key: 'upper', idx: 0 } })
  assert.deepEqual({ ...extensora, origem: extensora.origem }, { base_top: 50, meta_reps: '12-15', descanso_segundos: 60, tem_aquecimento: false, origem: { tipo: 'plano', rotina: 'Lower' } })

  // A própria posição sendo editada não serve de fonte.
  assert.equal(valoresDoExercicio('Cadeira extensora', { historico, treinos, ignorar: { key: 'lower', idx: 0 } }).base_top, '')

  // Nunca treinado nem no plano: carga e reps em branco.
  assert.deepEqual(valoresDoExercicio('Leg press 45 graus', { historico, treinos }), { base_top: '', meta_reps: '', descanso_segundos: 90, tem_aquecimento: false, origem: null })
  // Registro vazio não conta como carga.
  assert.equal(valoresDoExercicio('Rosca direta', { historico, treinos }).base_top, '')
  // Variação não herda: "Supino reto na máquina" não é "Supino reto".
  assert.equal(valoresDoExercicio('Supino reto na máquina', { historico, treinos }).base_top, '')
  // Sem meta registrada, usa a meta do plano e, por último, as reps feitas.
  assert.equal(valoresDoExercicio('Puxada aberta', { historico: [{ exercicios: [{ nome: 'Puxada aberta', carga_top: 50, reps_top: 9 }] }], treinos: {} }).meta_reps, '9')
  assert.equal(valoresDoExercicio('', { historico, treinos }).origem, null)
})

test('carga em branco no plano vira "sem referência" no treino, não 0 kg', () => {
  const [ex] = prepareSession({ exercicios: [{ nome: 'Leg press 45 graus', base_top: '', meta_reps: '' }] })
  assert.equal(Number(ex.ref) > 0, false)
  assert.equal(ex.meta_reps, '')
})

test('editar o plano durante o treino ajusta o rascunho sem perder o que foi digitado', () => {
  const rotina = { exercicios: garantirIdsExercicios([{ nome: 'Supino reto', base_top: 60, meta_reps: '6-8' }, { nome: 'Remada', base_top: 50, meta_reps: '8-10' }, { nome: 'Rosca', base_top: 12 }]) }
  const sessao = prepareSession(rotina)
  sessao[0] = { ...sessao[0], carga: '80', reps: '8' }
  sessao[1] = { ...sessao[1], pulado: true }
  sessao[2] = { ...sessao[2], carga: '14', reps: '10' }
  const draft = { rotinaKey: 'a', fingerprint: routineFingerprint(rotina), topSetData: sessao }

  // Plano sem mudança: nada a ajustar.
  assert.equal(reconciliarRascunho(draft, rotina).alterado, false)

  // Carga base, aquecimento, ordem invertida e exercício novo no fim.
  const [supino, remada, rosca] = rotina.exercicios
  const novoPlano = { exercicios: [{ ...remada, meta_reps: '10-12' }, { ...supino, base_top: 62, tem_aquecimento: true }, rosca, { id: 'ex:novo', nome: 'Tríceps corda', base_top: 20 }] }
  const ajustado = reconciliarRascunho(draft, novoPlano)
  assert.equal(ajustado.alterado, true)
  assert.deepEqual(ajustado.topSetData.map(ex => [ex.nome, ex.carga, ex.reps, ex.pulado]), [
    ['Remada', '', '', true], ['Supino reto', '80', '8', false], ['Rosca', '14', '10', false], ['Tríceps corda', '', '', false],
  ])
  assert.equal(ajustado.topSetData[0].meta_reps, '10-12')
  assert.equal(ajustado.topSetData[1].tem_aquecimento, true)
  assert.deepEqual(ajustado.novosIds, ['ex:novo'])
  assert.deepEqual(ajustado.removidos, [])

  // Exercício removido do plano com dados digitados é avisado, não some em silêncio.
  const semRosca = reconciliarRascunho(draft, { exercicios: [supino, remada] })
  assert.deepEqual(semRosca.removidos, ['Rosca'])

  // Renomear para outro exercício não leva a carga digitada do antigo.
  const renomeado = reconciliarRascunho(draft, { exercicios: [{ ...supino, nome: 'Leg press' }, remada, rosca] })
  assert.deepEqual([renomeado.topSetData[0].nome, renomeado.topSetData[0].carga], ['Leg press', ''])
  assert.deepEqual(renomeado.removidos, ['Supino reto'])

  // Nada em comum com o plano atual: o rascunho não serve mais.
  assert.equal(reconciliarRascunho(draft, { exercicios: [{ id: 'x', nome: 'Agachamento' }] }), null)
  assert.equal(reconciliarRascunho(draft, undefined), null)
})

test('troca feita durante a sessão continua valendo depois de ajustar o rascunho', () => {
  const rotina = { exercicios: garantirIdsExercicios([{ nome: 'Voador', base_top: 40 }, { nome: 'Remada', base_top: 50 }]) }
  const sessao = prepareSession(rotina)
  sessao[0] = { ...createReplacementExercise(sessao[0], 'Crucifixo na máquina', 'tok'), carga: '35', reps: '12' }
  const draft = { rotinaKey: 'a', fingerprint: routineFingerprint(rotina), topSetData: sessao }
  const ajustado = reconciliarRascunho(draft, { exercicios: [rotina.exercicios[1], rotina.exercicios[0]] })
  assert.deepEqual(ajustado.topSetData.map(ex => [ex.nome, ex.carga]), [['Remada', ''], ['Crucifixo na máquina', '35']])
  assert.equal(ajustado.topSetData[1].substituidoDe, 'Voador')
})

test('referência do treino vem do último treino do exercício em qualquer divisão', () => {
  const upperB = { exercicios: [{ nome: 'Supino reto', base_top: 60 }] }
  const historicoRecente = [
    { rotina_id: 'upper_a', exercicios: [{ id: 'legacy:3:Supino reto', nome: 'Supino reto', carga_top: 85, reps_top: 6 }] },
    { rotina_id: 'upper_b', exercicios: [{ id: 'legacy:0:Supino reto', nome: 'Supino reto', carga_top: 70, reps_top: 8 }] },
  ]
  assert.deepEqual([prepareSession(upperB, historicoRecente)[0].ref, prepareSession(upperB, historicoRecente)[0].repsAnterior], [85, 6])
})

test('chave agrupa o mesmo exercício escrito de formas diferentes', () => {
  const chaves = new Set(['Supino reto', 'supino reto', 'Supino Reto ', 'Súpino reto'].map(chaveExercicio))
  assert.equal(chaves.size, 1)
  assert.equal(chaveExercicio('Supino reto c/ barra'), chaveExercicio('Supino reto com barra'))
  assert.notEqual(chaveExercicio('Supino reto'), chaveExercicio('Supino reto com barra'))
  assert.equal(chaveExercicio(''), '')
})