import test from 'node:test'
import assert from 'node:assert/strict'
import { LIMITE_NOTA, comNomesGravaveis, prepararConfigParaSalvar, validarNumeroConfig } from '../src/utils/configValidation.js'

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
  assert.deepEqual(saved.treinos.a.exercicios.map(ex => ex.base_top), ['', '', '', 12.5])
  assert.throws(() => prepararConfigParaSalvar({ metas, refeicoes: [], treinos: { a: { nome: 'A', exercicios: [{ nome: 'Supino', base_top: 'abc' }] } } }))
})

test('exercício recém-criado sem nome não vai para o banco, o resto vai', () => {
  const salvo = { treinos: { a: { nome: 'A', exercicios: [{ id: 'e1', nome: 'Supino', base_top: 60 }] } } }
  const atual = { treinos: { a: { nome: 'A', exercicios: [{ id: 'e1', nome: 'Supino', base_top: 62 }, { id: 'e2', nome: '', base_top: '' }] } } }
  assert.deepEqual(comNomesGravaveis(atual, salvo).treinos.a.exercicios, [{ id: 'e1', nome: 'Supino', base_top: 62 }])
})

test('nome apagado no meio da digitação grava o nome que já estava salvo', () => {
  const salvo = { treinos: { a: { nome: 'A', exercicios: [{ id: 'e1', nome: 'Supino', base_top: 60 }] } } }
  const atual = { treinos: { a: { nome: 'A', exercicios: [{ id: 'e1', nome: '  ', base_top: 64 }] } } }
  assert.deepEqual(comNomesGravaveis(atual, salvo).treinos.a.exercicios, [{ id: 'e1', nome: 'Supino', base_top: 64 }])
})

test('observação do exercício é aparada, limitada e some quando vazia', () => {
  const base = { metas: { kcal: 2000, proteinas: 150, carboidratos: 200, gorduras: 60, fibras: 30 }, refeicoes: [] }
  const config = { ...base, treinos: { a: { nome: 'A', exercicios: [
    { id: 'e1', nome: 'Supino', base_top: 60, nota: '  descida lenta  ' },
    { id: 'e2', nome: 'Remada', base_top: 50, nota: '   ' },
    { id: 'e3', nome: 'Crucifixo', base_top: 20, nota: 'x'.repeat(200) },
  ] } } }
  const [e1, e2, e3] = prepararConfigParaSalvar(config).treinos.a.exercicios
  assert.equal(e1.nota, 'descida lenta')
  assert.equal('nota' in e2, false)
  assert.equal(e3.nota.length, LIMITE_NOTA)
})
