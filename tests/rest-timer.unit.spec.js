import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DESCANSO_PRESETS,
  formatarDescanso,
  normalizarDescansoSegundos,
} from '../src/utils/restTimer.js'

test('descanso normaliza valores para a faixa suportada', () => {
  assert.equal(normalizarDescansoSegundos(undefined), 90)
  assert.equal(normalizarDescansoSegundos(0), 15)
  assert.equal(normalizarDescansoSegundos(91.4), 91)
  assert.equal(normalizarDescansoSegundos(999), 600)
})

test('descanso formata minutos e segundos para o cronômetro', () => {
  assert.equal(formatarDescanso(0), '00:00')
  assert.equal(formatarDescanso(90), '01:30')
  assert.equal(formatarDescanso(300), '05:00')
})

test('presets de descanso oferecem opções rápidas', () => {
  assert.deepEqual(DESCANSO_PRESETS, [30, 60, 90, 120, 180, 300])
})
