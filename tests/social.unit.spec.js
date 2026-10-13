import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CODIGO_ALFABETO, codigoAmizadeValido, deslocarDia, formatarCodigoAmizade, gerarCodigoAmizade, idAmizade,
  iniciaisPerfil, limparNomePerfil, normalizarCodigoAmizade, ordenarRanking, resumoDieta, resumoValido, sequenciaVigente,
} from '../src/utils/social.js'

const HOJE = '2026-10-12'
// Meta de 2.000 kcal: dentro do plano entre 1.000 e 2.300.
const dia = kcal => ({ extras_globais: [{ id: 'x', nome: 'Refeição', kcal }], metas_snapshot: { kcal: 2000 } })
const dias = lista => Object.fromEntries(lista.map(([recuo, kcal]) => [deslocarDia(HOJE, -recuo), dia(kcal)]))

test('código de amizade usa só caracteres sem ambiguidade e aceita digitação solta', () => {
  for (let i = 0; i < 200; i++) assert.equal(codigoAmizadeValido(gerarCodigoAmizade()), true)
  assert.equal([...'0O1IL'].some(letra => CODIGO_ALFABETO.includes(letra)), false)
  assert.equal(new Set(Array.from({ length: 200 }, () => gerarCodigoAmizade())).size, 200)
  assert.equal(normalizarCodigoAmizade(' abcd-2345 '), 'ABCD2345')
  assert.equal(formatarCodigoAmizade('abcd2345'), 'ABCD-2345')
  assert.equal(codigoAmizadeValido('ABCD2345'), true)
  for (const invalido of ['ABCD234', 'ABCD23456', 'ABCD234O', 'ABCD2340', 'abcd2345', '', null]) assert.equal(codigoAmizadeValido(invalido), false)
  // Gerador com bytes viciados ainda devolve um código válido.
  assert.equal(codigoAmizadeValido(gerarCodigoAmizade(tamanho => new Uint8Array(tamanho).fill(250).fill(7, 4))), true)
})

test('par de amigos tem sempre o mesmo ID, seja quem for que peça', () => {
  assert.equal(idAmizade('user-bob', 'user-alice'), 'user-alice_user-bob')
  assert.equal(idAmizade('user-alice', 'user-bob'), idAmizade('user-bob', 'user-alice'))
})

test('nome do perfil é limpo e limitado; iniciais servem de foto padrão', () => {
  assert.equal(limparNomePerfil('  Bruno\n  Akira\t '), 'Bruno Akira')
  assert.equal(limparNomePerfil('x'.repeat(80)).length, 40)
  assert.equal(limparNomePerfil(null), '')
  assert.equal(iniciaisPerfil('Bruno Akira Furumori'), 'BF')
  assert.equal(iniciaisPerfil('ana'), 'AN')
  assert.equal(iniciaisPerfil(''), '?')
})

test('resumo conta acertos em 30 dias, sequência e os últimos 7 dias', () => {
  // Hoje e os 3 dias anteriores dentro do plano; depois um dia fora; depois mais um acerto.
  const resumo = resumoDieta(dias([[0, 1900], [1, 2300], [2, 1000], [3, 2000], [4, 2301], [5, 1800], [29, 1500], [30, 1500]]), [], 0, HOJE)
  assert.equal(resumo.sequencia, 4)
  assert.equal(resumo.acertos30, 6) // o dia 30 já está fora da janela
  assert.deepEqual(resumo.ultimos7, ['vazio', 'ok', 'fora', 'ok', 'ok', 'ok', 'ok'])
  assert.equal(resumo.ate, HOJE)
  assert.equal(resumoValido(resumo), true)
})

test('hoje sem registro não quebra a sequência; ontem fora ou vazio quebra', () => {
  assert.equal(resumoDieta(dias([[1, 1900], [2, 1900]]), [], 0, HOJE).sequencia, 2)
  assert.equal(resumoDieta(dias([[0, 5000], [1, 1900], [2, 1900]]), [], 0, HOJE).sequencia, 2)
  assert.equal(resumoDieta(dias([[2, 1900], [3, 1900]]), [], 0, HOJE).sequencia, 0)
  assert.equal(resumoDieta(dias([[0, 1900], [1, 900]]), [], 0, HOJE).sequencia, 1)
  assert.equal(resumoDieta({}, [], 0, HOJE).sequencia, 0)
})

test('sequência é limitada a 30 e vira o mês e o ano sem errar a data', () => {
  const todos = dias(Array.from({ length: 45 }, (_, i) => [i, 1900]))
  const resumo = resumoDieta(todos, [], 0, HOJE)
  assert.equal(resumo.sequencia, 30)
  assert.equal(resumo.acertos30, 30)
  assert.equal(deslocarDia('2026-03-01', -1), '2026-02-28')
  assert.equal(deslocarDia('2026-01-01', -1), '2025-12-31')
  assert.equal(deslocarDia('2028-02-28', 1), '2028-02-29')
})

test('resumo usa a meta do plano quando o dia antigo não guardou a própria meta', () => {
  const semSnapshot = { [HOJE]: { extras_globais: [{ id: 'x', nome: 'Almoço', kcal: 1900 }] } }
  assert.equal(resumoDieta(semSnapshot, [], 2000, HOJE).sequencia, 1)
  assert.equal(resumoDieta(semSnapshot, [], 0, HOJE).sequencia, 0) // sem meta não há como avaliar
})

test('resumo compartilhado não carrega calorias nem refeições', () => {
  const resumo = resumoDieta(dias([[0, 1900]]), [], 0, HOJE)
  assert.deepEqual(Object.keys(resumo).sort(), ['acertos30', 'ate', 'sequencia', 'ultimos7'])
  for (const invalido of [null, {}, { ...resumo, sequencia: 31 }, { ...resumo, ultimos7: ['ok'] }, { ...resumo, ultimos7: Array(7).fill('talvez') }, { ...resumo, ate: '12/10/2026' }]) {
    assert.equal(resumoValido(invalido), false)
  }
})

test('sequência de quem não abre o app há dois dias aparece zerada para os amigos', () => {
  const resumo = { sequencia: 9, acertos30: 20, ultimos7: Array(7).fill('ok'), ate: deslocarDia(HOJE, -1) }
  assert.equal(sequenciaVigente(resumo, HOJE), 9)
  assert.equal(sequenciaVigente({ ...resumo, ate: deslocarDia(HOJE, -2) }, HOJE), 0)
  assert.equal(sequenciaVigente(null, HOJE), 0)
})

test('ranking ordena por sequência vigente, depois acertos e nome', () => {
  const base = { ultimos7: Array(7).fill('ok'), ate: HOJE }
  const ordenado = ordenarRanking([
    { nome: 'Sem resumo', resumo: null },
    { nome: 'Zeca', resumo: { ...base, sequencia: 5, acertos30: 10 } },
    { nome: 'Ana', resumo: { ...base, sequencia: 5, acertos30: 10 } },
    { nome: 'Parado', resumo: { ...base, sequencia: 20, acertos30: 25, ate: deslocarDia(HOJE, -3) } },
    { nome: 'Lider', resumo: { ...base, sequencia: 7, acertos30: 8 } },
  ], HOJE)
  assert.deepEqual(ordenado.map(pessoa => pessoa.nome), ['Lider', 'Ana', 'Zeca', 'Parado', 'Sem resumo'])
})
