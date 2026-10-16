import test from 'node:test'
import assert from 'node:assert/strict'
import { calcularRitmoTreino, calcularSequenciaTreinos, classificarSessaoTreino, diasDesde, epley1RM, formatarVolume, normalizarMetaSemanal, parseMetaTeto, resumoSemanalTreinos, volumePorTreino } from '../src/utils/fitness.js'
import { LIMITS, normalizarNomeAlimentoExtra, parseNumero, sanitizarTexto, truncar } from '../src/utils/validation.js'

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

test('descrição completa do alimento extra não é cortada no limite de nomes curtos', () => {
  const descricao = 'Uma porção e meia de nachos feito em casa, salgadinho tortilhas carne moída e guacamole'
  assert.equal(descricao.length, 87)
  assert.equal(normalizarNomeAlimentoExtra(descricao), descricao)
  assert.equal(normalizarNomeAlimentoExtra('a'.repeat(501)).length, LIMITS.nomeAlimentoExtra)
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

test('sequência de treinos considera hoje ou ontem e respeita o limite do histórico consultado', () => {
  const agora = new Date(2026, 8, 9, 12)
  const data = diasAtras => {
    const dia = new Date(agora)
    dia.setDate(dia.getDate() - diasAtras)
    return { data: dia }
  }

  assert.equal(calcularSequenciaTreinos([data(1), data(2), data(3)], agora), 3)
  assert.equal(calcularSequenciaTreinos([data(0), data(1), data(3)], agora), 2)
  assert.equal(calcularSequenciaTreinos([data(2)], agora), 0)
  assert.equal(calcularSequenciaTreinos(Array.from({ length: 95 }, (_, i) => data(i)), agora), 90)
  assert.equal(calcularSequenciaTreinos(Array.from({ length: 90 }, (_, i) => data(i + 1)), agora), 90)
})

test('classificarSessaoTreino prioriza o contexto explícito e reconhece exercícios', () => {
  assert.equal(classificarSessaoTreino({ rotinaNome: 'Lower A', exercicios: ['Agachamento'] }), 'lower')
  assert.equal(classificarSessaoTreino({ rotinaNome: 'Sessão', exercicios: ['Supino inclinado', 'Crucifixo'] }), 'chest')
  assert.equal(classificarSessaoTreino({ rotinaNome: 'Treino', exercicios: ['Remada curvada', 'Puxada'] }), 'back')
})

test('sequência de treinos: hoje sem treino não zera a sequência que vem de ontem', () => {
  const agora = new Date(2026, 9, 15, 10)
  const dia = recuo => ({ data: new Date(2026, 9, 15 - recuo, 19) })
  assert.equal(calcularSequenciaTreinos([dia(1), dia(2)], agora), 2)
  assert.equal(calcularSequenciaTreinos([dia(0), dia(1), dia(2)], agora), 3)
  assert.equal(calcularSequenciaTreinos([dia(2), dia(3)], agora), 0)
  assert.equal(calcularSequenciaTreinos(Array.from({ length: 200 }, (_, i) => dia(i)), agora, 3650), 200)
})

test('constância semanal: treino em dias alternados conta, semana em andamento não quebra', () => {
  // Sexta, 16/10/2026. Semana de domingo (11/10) a sábado (17/10).
  const agora = new Date(2026, 9, 16, 10)
  const treino = (dia, mes = 9) => ({ data: new Date(2026, mes, dia, 19) })
  // Seg/qua/sex nas três semanas anteriores; nesta semana, seg e qua.
  const lista = [5, 7, 9, 28, 30, 2, 12, 14].map(d => treino(d, d >= 28 ? 8 : 9)).concat([treino(21, 8), treino(23, 8), treino(25, 8)])
  const resumo = resumoSemanalTreinos(lista, agora, 3)
  assert.deepEqual({ ...resumo }, { meta: 3, feitosSemana: 2, faltamSemana: 1, metaDaSemanaCumprida: false, semanasNaMeta: 3, noLimite: false })
  // Com a sexta registrada, a semana atual entra na conta.
  assert.equal(resumoSemanalTreinos([...lista, treino(16)], agora, 3).semanasNaMeta, 4)
  // Dois treinos no mesmo dia contam uma vez.
  assert.equal(resumoSemanalTreinos([treino(12), { data: new Date(2026, 9, 12, 7) }], agora, 3).feitosSemana, 1)
  // Semana anterior abaixo da meta quebra a sequência.
  assert.equal(resumoSemanalTreinos([treino(12), treino(14), treino(16), treino(5)], agora, 3).semanasNaMeta, 1)
  assert.equal(resumoSemanalTreinos([], agora, 3).semanasNaMeta, 0)
})

test('meta semanal fora de 1 a 7 volta para o padrão de 3', () => {
  assert.equal(normalizarMetaSemanal(4), 4)
  for (const invalido of [0, 8, 'x', null, undefined, -2]) assert.equal(normalizarMetaSemanal(invalido), 3)
  assert.equal(normalizarMetaSemanal('5'), 5)
})

test('tendência do ritmo compara a semana até hoje com o mesmo trecho da anterior', () => {
  const sextaManha = new Date(2026, 9, 16, 9)
  const treino = d => ({ data: new Date(2026, 9, d, 19) })
  // Seg/qua/sex na semana passada; seg e qua nesta, sexta ainda por fazer.
  const lista = [5, 7, 9, 12, 14].map(treino)
  assert.equal(calcularRitmoTreino(lista, sextaManha, 3).variacao, 0)
  assert.ok(calcularRitmoTreino([5, 7, 9, 12].map(treino), sextaManha, 3).variacao < 0)
  assert.ok(calcularRitmoTreino([5, 12, 14].map(treino), sextaManha, 3).variacao > 0)
})

test('tendência conta o dia de hoje dos dois lados só depois do treino de hoje', () => {
  const sextaNoite = new Date(2026, 9, 16, 21)
  const treino = d => ({ data: new Date(2026, 9, d, 19) })
  assert.equal(calcularRitmoTreino([5, 7, 9, 12, 14, 16].map(treino), sextaNoite, 3).variacao, 0)
})
