import test from 'node:test'
import assert from 'node:assert/strict'
import { diasDesde, epley1RM, formatarVolume, parseMetaTeto, volumePorTreino } from '../src/utils/fitness.js'
import { LIMITS, parseNumero, sanitizarTexto, truncar } from '../src/utils/validation.js'

test('parseMetaTeto interpreta meta simples e intervalo', () => {
  assert.equal(parseMetaTeto('8-10'), 10)
  assert.equal(parseMetaTeto('7'), 7)
  assert.equal(parseMetaTeto(''), Infinity)
})

test('epley1RM limita reps no teto de 12', () => {
  assert.equal(epley1RM(100, 5), 117)
  assert.equal(epley1RM(100, 20), 140)
})

test('volumePorTreino soma carga vezes repetições e ignora dados inválidos', () => {
  assert.equal(volumePorTreino({ exercicios: [{ carga_top: 100, reps_top: 5 }, { carga_top: '20', reps_top: '3' }, { carga_top: null, reps_top: 10 }] }), 560)
  assert.equal(volumePorTreino({}), 0)
})

test('diasDesde calcula dias completos usando o início do dia', () => {
  const agora = new Date('2026-08-06T18:00:00')
  assert.equal(diasDesde('2026-08-06T06:00:00', agora), 0)
  assert.equal(diasDesde('2026-08-04T23:00:00', agora), 2)
  assert.equal(diasDesde(null, agora), null)
})

test('formatarVolume usa unidades legíveis em português', () => {
  assert.equal(formatarVolume(850), '850')
  assert.equal(formatarVolume(1250), '1,3 mil')
  assert.equal(formatarVolume(1250000), '1,3 mi')
})

test('validação sanitiza e limita entradas', () => {
  assert.equal(parseNumero('12,5'), 12.5)
  assert.ok(Number.isNaN(parseNumero('abc')))
  assert.equal(sanitizarTexto('ok\u0000\u0007\ntexto'), 'ok\ntexto')
  assert.equal(truncar('abcdef', 3), 'abc')
  assert.equal(LIMITS.textoIA, 500)
})
