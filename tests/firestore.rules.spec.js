/**
 * Testes das Firestore Security Rules.
 *
 * Pré-requisito: Java 11+ instalado (necessário para o emulador).
 *
 * Como rodar:
 *   1. Em um terminal: firebase emulators:start --only firestore --project akrgym-rules-test
 *   2. Em outro:    npm run test:rules
 *
 * Estes testes validam:
 *  - Isolamento por UID (usuário A não acessa dados de B)
 *  - Não autenticado é bloqueado
 *  - Campos obrigatórios são exigidos
 *  - Tipos de campos são validados
 *  - Ranges numéricos são respeitados
 *  - Histórico de treino é imutável (update bloqueado)
 *  - usuarioId (defesa em profundidade) é validado quando presente
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { applyDiaryAction, diaryTotals } from '../src/utils/dietDiary.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RULES = readFileSync(join(__dirname, '..', 'firestore.rules'), 'utf8')

const env = await initializeTestEnvironment({
  projectId: 'akrgym-rules-test',
  firestore: { rules: RULES, host: '127.0.0.1', port: 8080 },
})

const ALICE = 'user-alice'
const BOB = 'user-bob'

function authedDb(uid) {
  return env.authenticatedContext(uid).firestore()
}
function anonDb() {
  return env.unauthenticatedContext().firestore()
}

function seedConfig(db, uid) {
  return db.doc(`users/${uid}/config/data`).set({
    treinos: {},
    refeicoes: [],
    metas: { kcal: 0, proteinas: 0, carboidratos: 0, gorduras: 0 },
  })
}

before(async () => { await env.clearFirestore() })
after(async () => { await env.cleanup() })

describe('AkrGym Firestore Rules', () => {
  describe('Isolamento por UID', () => {
    it('usuário não autenticado é bloqueado', async () => {
      await assertFails(anonDb().doc('users/x/config/data').get())
      await assertFails(anonDb().collection('users/x/historico_treinos').get())
    })

    it('usuário A lê os próprios dados', async () => {
      const db = authedDb(ALICE)
      await assertSucceeds(seedConfig(db, ALICE))
      await assertSucceeds(db.doc(`users/${ALICE}/config/data`).get())
    })

    it('usuário A NÃO lê dados do usuário B', async () => {
      const a = authedDb(ALICE)
      const b = authedDb(BOB)
      await assertSucceeds(seedConfig(b, BOB))
      await assertFails(a.doc(`users/${BOB}/config/data`).get())
    })

    it('usuário A NÃO grava em path do usuário B', async () => {
      const a = authedDb(ALICE)
      await assertFails(
        a.doc(`users/${BOB}/config/data`).set({
          treinos: {},
          refeicoes: [],
          metas: { kcal: 0, proteinas: 0, carboidratos: 0, gorduras: 0 },
        })
      )
    })

    it('caminho de usuário não reconhecido é bloqueado', async () => {
      const db = authedDb(ALICE)
      await assertFails(db.doc(`users/${ALICE}/colecao_desconhecida/documento`).set({ valor: true }))
    })
  })

  describe('config/data', () => {
    it('exige treinos, refeicoes e metas', async () => {
      const db = authedDb(ALICE)
      await assertFails(db.doc(`users/${ALICE}/config/data`).set({ treinos: {} }))
    })

    it('rejeita tipos errados (treinos como string)', async () => {
      const db = authedDb(ALICE)
      await assertFails(db.doc(`users/${ALICE}/config/data`).set({
        treinos: 'string-em-vez-de-mapa',
        refeicoes: [],
        metas: { kcal: 0, proteinas: 0, carboidratos: 0, gorduras: 0 },
      }))
    })
  })

  describe('historico_treinos', () => {
    it('create com campos válidos passa', async () => {
      const db = authedDb(ALICE)
      await assertSucceeds(db.collection(`users/${ALICE}/historico_treinos`).add({
        rotina_id: 'upper_a',
        data: new Date(),
        exercicios: [{ nome: 'X', carga_top: 20, reps_top: 8 }],
      }))
    })

    it('create sem campo obrigatório falha', async () => {
      const db = authedDb(ALICE)
      await assertFails(db.collection(`users/${ALICE}/historico_treinos`).add({
        rotina_id: 'upper_a',
        // sem "data" e sem "exercicios"
      }))
    })

    it('update é bloqueado (imutável)', async () => {
      const db = authedDb(ALICE)
      const ref = db.collection(`users/${ALICE}/historico_treinos`).doc('t1')
      await assertSucceeds(ref.set({
        rotina_id: 'upper_a',
        data: new Date(),
        exercicios: [{ nome: 'X', carga_top: 20, reps_top: 8 }],
      }))
      await assertFails(ref.update({ rotina_id: 'lower' }))
    })

    it('delete é permitido', async () => {
      const db = authedDb(ALICE)
      const ref = db.collection(`users/${ALICE}/historico_treinos`).doc('t2')
      await assertSucceeds(ref.set({
        rotina_id: 'upper_a',
        data: new Date(),
        exercicios: [{ nome: 'X', carga_top: 20, reps_top: 8 }],
      }))
      await assertSucceeds(ref.delete())
    })

    it('rotina_id muito longo (> 100 chars) é rejeitado', async () => {
      const db = authedDb(ALICE)
      await assertFails(db.collection(`users/${ALICE}/historico_treinos`).add({
        rotina_id: 'x'.repeat(200),
        data: new Date(),
        exercicios: [{ nome: 'X', carga_top: 20, reps_top: 8 }],
      }))
    })

    it('exercicios com mais de 100 itens é rejeitado', async () => {
      const db = authedDb(ALICE)
      const exs = Array.from({ length: 200 }, (_, i) => ({ nome: `e${i}`, carga_top: 1, reps_top: 1 }))
      await assertFails(db.collection(`users/${ALICE}/historico_treinos`).add({
        rotina_id: 'upper_a',
        data: new Date(),
        exercicios: exs,
      }))
    })
  })

  describe('diario_dieta', () => {
    it('transações concorrentes preservam duas refeições e seus snapshots', async () => {
      const db = authedDb(ALICE)
      const date = '2026-09-09'
      const ref = db.doc(`users/${ALICE}/diario_dieta/${date}`)
      const plan = [{ id: 'cafe', nome: 'Café', kcal: 100, fibras: 3 }, { id: 'almoco', nome: 'Almoço', kcal: 200, fibras: 5 }]
      await Promise.all(plan.map(food => db.runTransaction(async transaction => {
        const snap = await transaction.get(ref)
        transaction.set(ref, applyDiaryAction(snap.exists ? snap.data() : null, date, {
          type: 'meal', id: food.id, status: 'limpo', food, revision: food.id,
        }, plan))
      })))
      const saved = (await ref.get()).data()
      assert.equal(Object.keys(saved.refeicoes).length, 2)
      assert.equal(diaryTotals(saved, []).kcal, 300)
      assert.equal(diaryTotals(saved, []).fibras, 8)
    })

    it('create com data no formato YYYY-MM-DD passa', async () => {
      const db = authedDb(ALICE)
      await assertSucceeds(db.doc(`users/${ALICE}/diario_dieta/2025-01-15`).set({
        data: '2025-01-15',
        refeicoes: {},
        extras_globais: [],
      }))
    })


    it('aceita fibras em refeições e alimentos extras', async () => {
      const db = authedDb(ALICE)
      await assertSucceeds(db.doc(`users/${ALICE}/diario_dieta/2025-01-16`).set({
        data: '2025-01-16',
        refeicoes: {
          cafe: {
            status: 'customizado',
            substituto: { kcal: 25, proteinas: 2, carboidratos: 5, gorduras: 0, fibras: 3 },
            extra: [{ nome: 'brócolis', kcal: 25, proteinas: 2, carboidratos: 5, gorduras: 0, fibras: 3 }],
          },
        },
        extras_globais: [{ nome: 'brócolis', kcal: 25, proteinas: 2, carboidratos: 5, gorduras: 0, fibras: 3 }],
      }))
    })

    it('data fora do formato é rejeitada', async () => {
      const db = authedDb(ALICE)
      await assertFails(db.doc(`users/${ALICE}/diario_dieta/foo`).set({
        data: 'foo',
        refeicoes: {},
        extras_globais: [],
      }))
    })

    it('data no formato errado (YYYY-MM-DD com tamanho diferente) é rejeitada', async () => {
      const db = authedDb(ALICE)
      await assertFails(db.doc(`users/${ALICE}/diario_dieta/2025-1-15`).set({
        data: '2025-1-15',
        refeicoes: {},
        extras_globais: [],
      }))
    })

    it('data com mês ou dia impossível é rejeitada', async () => {
      const db = authedDb(ALICE)
      await assertFails(db.doc(`users/${ALICE}/diario_dieta/2025-01-15`).set({
        data: '2025-99-99',
        refeicoes: {},
        extras_globais: [],
      }))
    })

    it('extras_globais com muitos itens (> 100) é rejeitado', async () => {
      const db = authedDb(ALICE)
      const extras = Array.from({ length: 200 }, (_, i) => ({ nome: `e${i}`, kcal: 1, proteinas: 0, carboidratos: 0, gorduras: 0 }))
      await assertFails(db.doc(`users/${ALICE}/diario_dieta/2025-01-15`).set({
        data: '2025-01-15',
        refeicoes: {},
        extras_globais: extras,
      }))
    })


    it('usuarioId errado na defesa em profundidade é rejeitado', async () => {
      const db = authedDb(ALICE)
      await assertFails(db.doc(`users/${ALICE}/diario_dieta/2025-01-15`).set({
        data: '2025-01-15',
        refeicoes: {},
        extras_globais: [],
        usuarioId: BOB,
      }))
    })

    it('usuarioId correto passa (defesa em profundidade)', async () => {
      const db = authedDb(ALICE)
      await assertSucceeds(db.doc(`users/${ALICE}/diario_dieta/2025-01-15`).set({
        data: '2025-01-15',
        refeicoes: {},
        extras_globais: [],
        usuarioId: ALICE,
      }))
    })
  })

  describe('historico_corporal', () => {
    it('create com peso válido passa', async () => {
      const db = authedDb(ALICE)
      await assertSucceeds(db.collection(`users/${ALICE}/historico_corporal`).add({
        peso: 75.5,
        data: new Date(),
      }))
    })

    it('create sem peso falha', async () => {
      const db = authedDb(ALICE)
      await assertFails(db.collection(`users/${ALICE}/historico_corporal`).add({
        data: new Date(),
      }))
    })

    it('peso negativo é rejeitado', async () => {
      const db = authedDb(ALICE)
      await assertFails(db.collection(`users/${ALICE}/historico_corporal`).add({
        peso: -10,
        data: new Date(),
      }))
    })

    it('peso absurdo (> 1000) é rejeitado', async () => {
      const db = authedDb(ALICE)
      await assertFails(db.collection(`users/${ALICE}/historico_corporal`).add({
        peso: 9999,
        data: new Date(),
      }))
    })

    it('update mantém o range válido', async () => {
      const db = authedDb(ALICE)
      const ref = db.collection(`users/${ALICE}/historico_corporal`).doc('m1')
      await assertSucceeds(ref.set({ peso: 75, data: new Date() }))
      await assertFails(ref.update({ peso: -1 }))
    })

    it('delete é permitido', async () => {
      const db = authedDb(ALICE)
      const ref = db.collection(`users/${ALICE}/historico_corporal`).doc('m2')
      await assertSucceeds(ref.set({ peso: 75, data: new Date() }))
      await assertSucceeds(ref.delete())
    })
  })
})
