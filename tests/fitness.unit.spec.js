import test from 'node:test'
import assert from 'node:assert/strict'
import { calcularRitmoTreino, classificarSessaoTreino, diasDesde, epley1RM, formatarVolume, parseMetaTeto, volumePorTreino } from '../src/utils/fitness.js'
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

test('calcularRitmoTreino reage à frequência recente e compara com a janela anterior', () => {
  const agora = new Date('2026-08-08T12:00:00')
  const lista = [0, -1, -2, -4, -18, -20].map(dias => ({ data: new Date(agora.getTime() + dias * 86400000) }))
  const ritmo = calcularRitmoTreino(lista, agora)
  assert.equal(ritmo.diasRecentes, 4)
  assert.equal(ritmo.score, 100)
  assert.equal(ritmo.variacao, 100)
  assert.equal(ritmo.pontos.length, 14)
  assert.equal(ritmo.score, ritmo.pontos.at(-1))
  assert.ok(ritmo.pontos.at(-1) > ritmo.pontos[0])
})

test('ritmo cai sem sessões, ignora duplicatas e datas futuras, e se recupera', () => {
  const now = new Date('2026-09-09T12:00:00')
  const session = day => ({ data: new Date(2026, 8, day, 12) })
  const past = [-1, 0, 1, 2, 3, 4].map(session)
  const down = calcularRitmoTreino(past, now)
  assert.equal(down.score, 50)
  assert.ok(down.variacao < 0)
  assert.deepEqual(calcularRitmoTreino([...past, session(4), session(10), { data: 'invalid' }], now), down)
  assert.equal(calcularRitmoTreino([...past, session(8), session(9)], now).score, 100)
  assert.equal(calcularRitmoTreino([], now).score, 0)
})

test('classificarSessaoTreino prioriza o contexto explícito e reconhece exercícios', () => {
  assert.equal(classificarSessaoTreino({ rotinaNome: 'Lower A', exercicios: ['Agachamento'] }), 'lower')
  assert.equal(classificarSessaoTreino({ rotinaNome: 'Sessão', exercicios: ['Supino inclinado', 'Crucifixo'] }), 'chest')
  assert.equal(classificarSessaoTreino({ rotinaNome: 'Treino', exercicios: ['Remada curvada', 'Puxada'] }), 'back')
})
