import test from 'node:test'
import assert from 'node:assert/strict'
import { duplicarRotina, estimarDuracaoMinutos, ordenarRotinas } from '../src/utils/workoutSession.js'

const treinos = {
  upper: { nome: 'Upper', ordem: 0, exercicios: [{ id: 'e1', nome: 'Supino', base_top: 80, meta_reps: '6-8', descanso_segundos: 90, tem_aquecimento: true }] },
  lower: { nome: 'Lower', ordem: 1, exercicios: [] },
}

test('duplicar: cópia logo abaixo, com nome "(cópia)" e exercícios com id novo', () => {
  const { treinos: novo, chave } = duplicarRotina(treinos, 'upper')
  assert.equal(novo[chave].nome, 'Upper (cópia)')
  assert.deepEqual(ordenarRotinas(novo).map(([k]) => k), ['upper', chave, 'lower'])
  assert.equal(novo[chave].exercicios[0].nome, 'Supino')
  assert.equal(novo[chave].exercicios[0].base_top, 80)
  assert.notEqual(novo[chave].exercicios[0].id, 'e1')
  // A original não muda.
  assert.equal(novo.upper.exercicios[0].id, 'e1')
  novo[chave].exercicios[0].nome = 'Outro'
  assert.equal(treinos.upper.exercicios[0].nome, 'Supino')
})

test('duplicar de novo não sobrescreve a primeira cópia', () => {
  const primeira = duplicarRotina(treinos, 'upper')
  const segunda = duplicarRotina(primeira.treinos, 'upper')
  assert.notEqual(primeira.chave, segunda.chave)
  assert.equal(Object.keys(segunda.treinos).length, 4)
})

test('duplicar divisão que não existe não muda nada', () => {
  assert.deepEqual(duplicarRotina(treinos, 'x'), { treinos, chave: null })
})

test('duração estimada: protocolo do app, arredondada para 5 min', () => {
  assert.equal(estimarDuracaoMinutos([]), null)
  assert.equal(estimarDuracaoMinutos([{ nome: '' }]), null)
  // 5 exercícios sem aquecimento, 90 s: 5 × (3×40 + 2×90 + 60) = 1800 s = 30 min.
  const cinco = Array.from({ length: 5 }, (_, i) => ({ nome: `E${i}`, descanso_segundos: 90 }))
  assert.equal(estimarDuracaoMinutos(cinco), 30)
  // Com aquecimento e 120 s: 4×40 + 3×120 + 60 = 580 s por exercício.
  assert.equal(estimarDuracaoMinutos(cinco.map(e => ({ ...e, tem_aquecimento: true, descanso_segundos: 120 }))), 50)
})
