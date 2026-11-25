import test from 'node:test'
import assert from 'node:assert/strict'
import { PLANOS, chavesDeUso, lerUso, planoEmVigor, podeUsar, precisaEntrarDeNovo } from '../src/utils/planos.js'

const agora = new Date(2026, 9, 24, 12, 0)

test('sem assinatura, vencida, cancelada ou desconhecida: vale o Grátis', () => {
  assert.equal(planoEmVigor(null, agora).id, 'gratis')
  assert.equal(planoEmVigor({ plano: 'pro', status: 'cancelada' }, agora).id, 'gratis')
  assert.equal(planoEmVigor({ plano: 'pro', status: 'ativa', expiraEm: new Date(2026, 9, 1) }, agora).id, 'gratis')
  assert.equal(planoEmVigor({ plano: 'vip', status: 'ativa' }, agora).id, 'gratis')
  assert.equal(planoEmVigor({ plano: 'pro', status: 'ativa', expiraEm: { toDate: () => new Date(2026, 11, 1) } }, agora).id, 'pro')
})

test('hoje tudo é liberado para conta de verdade; a IA tem 20 análises por dia (decisão de 2026-11-25)', () => {
  for (const recurso of ['ia', 'amigos', 'evolucaoAvancada']) assert.equal(podeUsar(PLANOS.gratis, recurso).permitido, true)
  assert.equal(PLANOS.gratis.limites.iaPorDia, 20)
  assert.equal(PLANOS.gratis.limites.iaPorMes, null)
})

test('visitante anônimo não usa a IA nem amigos', () => {
  assert.deepEqual(podeUsar(PLANOS.gratis, 'ia', { anonimo: true }), { permitido: false, motivo: 'conta' })
  assert.equal(podeUsar(PLANOS.gratis, 'amigos', { anonimo: true }).motivo, 'conta')
  assert.equal(podeUsar(PLANOS.gratis, 'evolucaoAvancada', { anonimo: true }).permitido, true)
})

test('limite, quando existir, bloqueia com o motivo certo', () => {
  const limitado = { ...PLANOS.gratis, limites: { iaPorDia: 20, iaPorMes: null } }
  assert.equal(podeUsar(limitado, 'ia', { usoHoje: 19 }).permitido, true)
  assert.deepEqual(podeUsar(limitado, 'ia', { usoHoje: 20 }), { permitido: false, motivo: 'limite' })
  assert.equal(podeUsar({ ...PLANOS.gratis, recursos: { ia: false } }, 'ia').motivo, 'plano')
})

test('contador de uso por mês e dia', () => {
  assert.deepEqual(chavesDeUso(agora), { mes: '2026-10', dia: '24' })
  assert.deepEqual(lerUso({ total: 7, porDia: { 24: 3, 23: 4 } }, agora), { mes: 7, hoje: 3 })
  assert.deepEqual(lerUso(null, agora), { mes: 0, hoje: 0 })
})

test('excluir conta exige login recente (exceto visitante)', () => {
  const t = Date.UTC(2026, 9, 24, 12)
  assert.equal(precisaEntrarDeNovo({ metadata: { lastSignInTime: new Date(t - 60_000).toUTCString() } }, t), false)
  assert.equal(precisaEntrarDeNovo({ metadata: { lastSignInTime: new Date(t - 3_600_000).toUTCString() } }, t), true)
  assert.equal(precisaEntrarDeNovo({ isAnonymous: true }, t), false)
  assert.equal(precisaEntrarDeNovo({}, t), true)
})
