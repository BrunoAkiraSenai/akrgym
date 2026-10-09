import test from 'node:test'
import assert from 'node:assert/strict'
import { prepararConfigParaSalvar, validarNumeroConfig } from '../src/utils/configValidation.js'

test('configuração aceita zero e vírgula decimal sem permitir NaN', () => {
  assert.equal(validarNumeroConfig(0, 0, 9999, 'Fibra'), 0)
  assert.equal(validarNumeroConfig('1,5', 0, 9999, 'Fibra'), 1.5)
  for (const value of ['', null, undefined, NaN, Infinity, -1, '2abc']) {
    assert.throws(() => validarNumeroConfig(value, 0, 9999, 'Fibra'))
  }
})

test('salvamento valida sem alterar estado em edição ou perder campos', () => {
  const macros = { kcal: 100, proteinas: 10, carboidratos: 12, gorduras: 1, fibras: '1,5' }
  const original = { onboardingConcluido: true, metas: macros, refeicoes: [{id:'cafe',nome:'Café',...macros}], treinos:{a:{nome:'A',exercicios:[{nome:'Flexão',base_top:0}]}} }
  const saved = prepararConfigParaSalvar(original)
  assert.equal(saved.refeicoes[0].fibras, 1.5)
  assert.equal(saved.treinos.a.exercicios[0].base_top, 0)
  assert.equal(saved.onboardingConcluido, true)
  assert.equal(original.refeicoes[0].fibras, '1,5')
  assert.throws(()=>prepararConfigParaSalvar({...original,metas:{...macros,fibras:NaN}}))
})

test('carga inicial em branco não bloqueia o salvamento do plano', () => {
  const metas = { kcal: 100, proteinas: 10, carboidratos: 12, gorduras: 1, fibras: 5 }
  const exercicios = [{ nome: 'Supino', base_top: '' }, { nome: 'Remada', base_top: null }, { nome: 'Rosca' }, { nome: 'Stiff', base_top: '12,5' }]
  const saved = prepararConfigParaSalvar({ metas, refeicoes: [], treinos: { a: { nome: 'A', exercicios } } })
  assert.deepEqual(saved.treinos.a.exercicios.map(ex => ex.base_top), [0, 0, 0, 12.5])
  assert.throws(() => prepararConfigParaSalvar({ metas, refeicoes: [], treinos: { a: { nome: 'A', exercicios: [{ nome: 'Supino', base_top: 'abc' }] } } }))
})
