import test from 'node:test'
import assert from 'node:assert/strict'
import { applyDiaryAction, normalizeDay, diaryTotals, diaryProgress, hasLegacyNutrition } from '../src/utils/dietDiary.js'

const date = '2026-09-09'
const breakfast = { id: 'cafe', nome: 'Café', kcal: 460, proteinas: 30, carboidratos: 50, gorduras: 15, fibras: 5 }
const plan = [breakfast, { ...breakfast, id: 'almoco' }, { ...breakfast, id: 'janta' }, { ...breakfast, id: 'lanche' }]
const meal = (id, revision) => ({ type: 'meal', id, status: 'limpo', food: breakfast, revision })

test('independent meal actions preserve both confirmations and source is immutable', () => {
  const a = applyDiaryAction(null, date, meal('cafe', '1'), plan)
  const b = applyDiaryAction(a, date, meal('almoco', '2'), plan)
  assert.equal(a.refeicoes.almoco, undefined)
  assert.equal(diaryProgress(b, plan).consumed, 2)
  assert.equal(diaryProgress(b, plan).percent, 50)
  assert.equal(diaryTotals(b, plan).fibras, 10)
})

test('confirmed nutrients survive plan edits and deletion including calories', () => {
  const day = applyDiaryAction(null, date, meal('cafe', '1'), plan)
  assert.deepEqual(diaryTotals(day, []), diaryTotals(day, [{ ...breakfast, kcal: 999, fibras: 80 }]))
  assert.equal(diaryTotals(day, []).kcal, 460)
  assert.equal(diaryTotals(day, []).fibras, 5)
  assert.equal(hasLegacyNutrition(day), false)
})

test('legacy days are explicit, do not invent snapshots, and normalize absent extras', () => {
  const day = { refeicoes: { cafe: { status: 'limpo' } } }
  const normalized = normalizeDay(day, date)
  assert.deepEqual(normalized.extras_globais, [])
  assert.equal(normalized.planejadas, undefined)
  assert.equal(normalized.refeicoes.cafe.consumido, undefined)
  assert.equal(hasLegacyNutrition(normalized), true)
  assert.equal(diaryTotals(normalized, plan).kcal, 460)
})

test('extras-only days count and 1 of 4 is 25%, not 100%', () => {
  const day = applyDiaryAction(null, date, { type: 'extra-add', item: { ...breakfast, id: 'extra-a' } }, plan)
  assert.deepEqual(diaryProgress(day, plan), { planned: 4, consumed: 1, registered: true, percent: 25 })
})

test('extra retries are idempotent and editing remains attached to ID after deletion', () => {
  const first = { ...breakfast, id: 'a' }, second = { ...breakfast, id: 'b' }
  let day = applyDiaryAction(null, date, { type: 'extra-add', item: first }, plan)
  day = applyDiaryAction(day, date, { type: 'extra-add', item: first }, plan)
  assert.equal(day.extras_globais.length, 1)
  day = applyDiaryAction(day, date, { type: 'extra-add', item: second }, plan)
  day = applyDiaryAction(day, date, { type: 'extra-remove', id: 'a' }, plan)
  day = applyDiaryAction(day, date, { type: 'extra-edit', id: 'b', previous: second, item: { ...second, nome: 'Novo nome' } }, plan)
  assert.equal(day.extras_globais[0].id, 'b')
  assert.equal(day.extras_globais[0].nome, 'Novo nome')
  assert.throws(() => applyDiaryAction(day, date, { type: 'extra-edit', id: 'b', previous: second, item: second }), /outra sessão/)
})

test('undo only restores its own meal and refuses a stale revision', () => {
  let day = applyDiaryAction(null, date, meal('cafe', '1'), plan)
  day = applyDiaryAction(day, date, meal('almoco', '2'), plan)
  const undo = { type: 'meal', id: 'cafe', restore: { status: 'pendente', extra: [] }, expectedRevision: '1', revision: '3' }
  day = applyDiaryAction(day, date, undo, plan)
  assert.equal(day.refeicoes.almoco.status, 'limpo')
  assert.equal(day.refeicoes.cafe.status, 'pendente')
  assert.throws(() => applyDiaryAction(day, date, undo, plan), /mudou/)
})

test('legacy extras receive deterministic IDs and explicit kcal is preserved', () => {
  const day = { extras_globais: [breakfast, { nome: 'Extra', kcal: 12, proteinas: 1, carboidratos: 1, gorduras: 1, fibras: 2 }] }
  assert.deepEqual(normalizeDay(day, date), normalizeDay(day, date))
  assert.equal(diaryTotals(day).kcal, 472)
})
