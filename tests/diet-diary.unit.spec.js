import test from 'node:test'
import assert from 'node:assert/strict'
import { applyDiaryAction, normalizeDay, diaryTotals, diaryProgress, hasLegacyNutrition, diaryText, classificarDiaPorCalorias, DIET_DAY_STATUS } from '../src/utils/dietDiary.js'

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

test('meal snapshots preserve foods and time for later copy after the plan changes', () => {
  const mealWithDetails = { ...breakfast, alimentos: ['2 ovos', 'Pão integral'], horario: '08:30' }
  const day = applyDiaryAction(null, date, { type: 'meal', id: 'cafe', status: 'limpo', food: mealWithDetails, revision: '1' }, [mealWithDetails])
  const changedPlan = [{ ...mealWithDetails, nome: 'Café atualizado', alimentos: ['Plano novo'], horario: '09:00', kcal: 999 }]
  const text = diaryText(day, changedPlan, date)

  assert.match(text, /2 ovos/)
  assert.match(text, /Pão integral/)
  assert.doesNotMatch(text, /Plano novo/)
  assert.match(text, /08:30/)
  assert.match(text, /460 kcal/)
})

test('older meal snapshots without item details do not copy the current plan as if it were historical', () => {
  const saved = applyDiaryAction(null, date, { type: 'meal', id: 'cafe', status: 'limpo', food: breakfast, revision: '1' }, [breakfast])
  const oldSnapshot = { ...saved.refeicoes.cafe.consumido }
  delete oldSnapshot.alimentos
  delete oldSnapshot.horario
  const text = diaryText(
    { data: date, refeicoes: { cafe: { status: 'limpo', consumido: oldSnapshot } }, extras_globais: [] },
    [{ ...breakfast, alimentos: ['Plano atualizado'], horario: '09:00', kcal: 999 }],
    date,
  )

  assert.match(text, /Itens não detalhados no histórico/)
  assert.doesNotMatch(text, /Plano atualizado/)
  assert.doesNotMatch(text, /09:00/)
  assert.match(text, /460 kcal/)
})

test('copy text includes completed meals and extras, omits pending and skipped meals, and totals only recorded food', () => {
  const banana = { nome: 'Banana (100 g)', kcal: 105, proteinas: 1.3, carboidratos: 27, gorduras: 0.4, fibras: 3 }
  const day = {
    data: date,
    refeicoes: {
      cafe: { status: 'limpo', consumido: { ...breakfast, nome: 'Café da manhã', horario: '08:30', alimentos: ['2 ovos', 'Pão integral'] } },
      almoco: { status: 'pulado' },
      jantar: { status: 'pendente' },
    },
    extras_globais: [banana],
  }

  const text = diaryText(day, plan, date)
  assert.match(text, /Refeições realizadas - 09\/09\/2026/)
  assert.match(text, /Café da manhã - 08:30/)
  assert.match(text, /Banana \(100 g\)/)
  assert.doesNotMatch(text, /Almoço/)
  assert.doesNotMatch(text, /jantar/i)
  assert.match(text, /TOTAL DO DIA\n565 kcal/)
  assert.match(text, /Fibras 8 g/)
})

test('copy text returns empty when there are no completed meals or logged foods', () => {
  assert.equal(diaryText({ data: date, refeicoes: { cafe: { status: 'pendente' }, almoco: { status: 'pulado' } }, extras_globais: [] }, plan, date), '')
})

test('copy text includes customized meals and foods logged against a skipped meal', () => {
  const cheese = { nome: 'Queijo extra', kcal: 60, proteinas: 4, carboidratos: 1, gorduras: 4, fibras: 0 }
  const day = {
    data: date,
    refeicoes: {
      cafe: { status: 'customizado', substituto: { nome: 'Omelete', kcal: 200, proteinas: 18, carboidratos: 3, gorduras: 13, fibras: 1 }, extra: [cheese] },
      almoco: { status: 'pulado', extra: [{ ...cheese, nome: 'Doce depois do almoço' }] },
    },
    extras_globais: [],
  }

  const text = diaryText(day, plan, date)
  assert.match(text, /Omelete/)
  assert.match(text, /Queijo extra/)
  assert.match(text, /Doce depois do almoço/)
  assert.match(text, /320 kcal/)
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

test('classificação do dia usa a faixa calórica da meta', () => {
  const day = kcal => ({ metas_snapshot: { kcal: 2000 }, refeicoes: { cafe: { status: 'limpo', consumido: { ...breakfast, kcal } } } })

  assert.equal(classificarDiaPorCalorias(null, [], 2000).status, DIET_DAY_STATUS.EMPTY)
  assert.equal(classificarDiaPorCalorias(day(1000), [], 2000).status, DIET_DAY_STATUS.COMPLETE)
  assert.equal(classificarDiaPorCalorias(day(2300), [], 2000).status, DIET_DAY_STATUS.COMPLETE)
  assert.equal(classificarDiaPorCalorias(day(999), [], 2000).status, DIET_DAY_STATUS.OUT_OF_PLAN)
  assert.equal(classificarDiaPorCalorias(day(2301), [], 2000).status, DIET_DAY_STATUS.OUT_OF_PLAN)
})

test('dia sem meta calórica permanece não preenchido para não inventar aderência', () => {
  const day = { refeicoes: { cafe: { status: 'limpo', consumido: { ...breakfast, kcal: 500 } } } }
  assert.equal(classificarDiaPorCalorias(day).status, DIET_DAY_STATUS.EMPTY)
})
