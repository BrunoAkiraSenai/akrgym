import test from 'node:test'
import assert from 'node:assert/strict'
import { primeiroExercicioPendente, sugerirProximaDivisao } from '../src/utils/workoutSession.js'
import { timerReducer } from '../src/utils/restTimer.js'

const treinos = {
  upper_a: { nome: 'UPPER A', ordem: 0 },
  lower: { nome: 'LOWER', ordem: 1 },
  upper_b: { nome: 'UPPER B', ordem: 2 },
}

test('sem histórico, sugere a primeira divisão da ordem', () => {
  assert.deepEqual(sugerirProximaDivisao(treinos, []), { chave: 'upper_a', depoisDe: null, sessao: null })
})

test('sugere a divisão seguinte à última treinada', () => {
  const historico = [{ rotina_id: 'lower' }, { rotina_id: 'upper_a' }]
  assert.equal(sugerirProximaDivisao(treinos, historico).chave, 'upper_b')
  assert.equal(sugerirProximaDivisao(treinos, historico).depoisDe, 'lower')
})

test('depois da última divisão volta para a primeira', () => {
  assert.equal(sugerirProximaDivisao(treinos, [{ rotina_id: 'upper_b' }]).chave, 'upper_a')
})

test('ignora sessões de divisões que saíram do plano', () => {
  const historico = [{ rotina_id: 'antiga' }, { rotina_id: 'upper_a' }]
  assert.equal(sugerirProximaDivisao(treinos, historico).chave, 'lower')
})

test('segue a ordem escolhida, não a ordem das chaves', () => {
  const reordenado = { a: { nome: 'A', ordem: 2 }, b: { nome: 'B', ordem: 0 }, c: { nome: 'C', ordem: 1 } }
  assert.equal(sugerirProximaDivisao(reordenado, [{ rotina_id: 'b' }]).chave, 'c')
  assert.equal(sugerirProximaDivisao(reordenado, [{ rotina_id: 'a' }]).chave, 'b')
})

test('sem divisões, não há sugestão', () => {
  assert.equal(sugerirProximaDivisao({}, [{ rotina_id: 'x' }]), null)
  assert.equal(sugerirProximaDivisao(null), null)
})

test('modo foco abre no primeiro exercício ainda sem carga e repetições', () => {
  const exercicios = [
    { nome: 'Supino', carga: '80', reps: '8' },
    { nome: 'Remada', pulado: true, carga: '', reps: '' },
    { nome: 'Desenvolvimento', carga: '', reps: '' },
  ]
  assert.equal(primeiroExercicioPendente(exercicios), 2)
  assert.equal(primeiroExercicioPendente([{ nome: 'A', carga: '10', reps: '5' }]), 0)
  assert.equal(primeiroExercicioPendente([]), 0)
})

test('"Série feita" recomeça o descanso inteiro em qualquer estado', () => {
  const base = { configurado: 90, restante: 30, rodando: true, concluido: false, terminaEm: 1000 }
  assert.deepEqual(timerReducer(base, { type: 'restart', now: 5000 }), { configurado: 90, restante: 90, rodando: true, concluido: false, terminaEm: 95000 })
  const concluido = { ...base, restante: 0, rodando: false, concluido: true, terminaEm: null }
  assert.equal(timerReducer(concluido, { type: 'restart', now: 0 }).rodando, true)
  assert.equal(timerReducer(concluido, { type: 'restart', now: 0 }).concluido, false)
})
