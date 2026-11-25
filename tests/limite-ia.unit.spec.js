import test from 'node:test'
import assert from 'node:assert/strict'
import worker, { diaBrasilia, limiteIADia, LIMITE_IA_DIA_PADRAO, mensagemLimiteDiario, somarUsoDiarioIA, usoDiarioIA } from '../cloudflare-worker/analisar-refeicao/src/index.js'
import { PLANOS, podeUsar } from '../src/utils/planos.js'

// KV falso com a mesma interface usada pelo Worker (get/put).
function kvFalso() {
  const dados = new Map()
  return { dados, get: async chave => dados.get(chave) ?? null, put: async (chave, valor, opcoes) => { dados.set(chave, valor); dados.set(`${chave}#ttl`, opcoes?.expirationTtl) } }
}

test('limite padrão é 20 por dia e pode ser trocado pela variável do Worker', () => {
  assert.equal(LIMITE_IA_DIA_PADRAO, 20)
  assert.equal(limiteIADia({}), 20)
  assert.equal(limiteIADia({ LIMITE_IA_DIA: '35' }), 35)
  assert.equal(limiteIADia({ LIMITE_IA_DIA: 'abc' }), 20)
  assert.equal(limiteIADia({ LIMITE_IA_DIA: '0' }), 20)
})

test('o dia do limite segue o horário de Brasília', () => {
  // 02:30 UTC de 15/03 ainda é 23:30 de 14/03 em Brasília.
  assert.equal(diaBrasilia(new Date('2026-03-15T02:30:00Z')), '2026-03-14')
  assert.equal(diaBrasilia(new Date('2026-03-15T03:30:00Z')), '2026-03-15')
})

test('contagem por pessoa e por dia, com validade de 2 dias', async () => {
  const kv = kvFalso()
  const agora = new Date('2026-11-25T15:00:00Z')
  assert.equal(await usoDiarioIA(kv, 'ana', agora), 0)
  await somarUsoDiarioIA(kv, 'ana', 0, agora)
  await somarUsoDiarioIA(kv, 'ana', 1, agora)
  assert.equal(await usoDiarioIA(kv, 'ana', agora), 2)
  assert.equal(await usoDiarioIA(kv, 'bruno', agora), 0)
  assert.equal(await usoDiarioIA(kv, 'ana', new Date('2026-11-26T15:00:00Z')), 0)
  assert.equal(kv.dados.get('ia:ana:2026-11-25#ttl'), 172800)
})

test('sem KV configurado, o limite fica desligado em vez de derrubar a IA', async () => {
  assert.equal(await usoDiarioIA(undefined, 'ana'), null)
  await somarUsoDiarioIA(undefined, 'ana', 0)
})

test('mensagem diz quantas análises e quando renova', () => {
  assert.match(mensagemLimiteDiario(20), /20 análises de IA de hoje/)
  assert.match(mensagemLimiteDiario(20), /meia-noite/)
})

test('o app bloqueia a 20ª análise do dia no plano grátis', () => {
  assert.equal(PLANOS.gratis.limites.iaPorDia, 20)
  assert.equal(podeUsar(PLANOS.gratis, 'ia', { usoHoje: 19, usoMes: 19 }).permitido, true)
  assert.deepEqual(podeUsar(PLANOS.gratis, 'ia', { usoHoje: 20, usoMes: 20 }), { permitido: false, motivo: 'limite' })
})

test('Worker exporta o handler', () => {
  assert.equal(typeof worker.fetch, 'function')
})
