import test from 'node:test'
import assert from 'node:assert/strict'
import { NUTRITION_RESULT_ERROR, validarResultadoMacros, validarTextoAlimento } from '../src/utils/nutrition.js'

test('rejeita objetos que não são alimentos antes de chamar a IA', () => {
  assert.equal(validarTextoAlimento('Cadeira Gamer'), 'Digite alimentos ou bebidas para calcular os macros. Ex.: arroz, frango e salada.')
  assert.equal(validarTextoAlimento('cadeira, gamer'), 'Digite alimentos ou bebidas para calcular os macros. Ex.: arroz, frango e salada.')
  assert.equal(validarTextoAlimento('150g frango, arroz e salada'), null)
})

test('rejeita classificação inválida e macros zerados', () => {
  assert.equal(validarResultadoMacros({ valido: false, kcal: 0, p: 0, c: 0, g: 0 }), NUTRITION_RESULT_ERROR)
  assert.equal(validarResultadoMacros({ valido: true, kcal: 0, p: 0, c: 0, g: 0 }), NUTRITION_RESULT_ERROR)
})

test('aceita resultado nutricional válido', () => {
  assert.equal(validarResultadoMacros({ valido: true, kcal: 450, p: 35, c: 42, g: 12 }), null)
})
