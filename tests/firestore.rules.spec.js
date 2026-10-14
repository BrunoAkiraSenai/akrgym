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

    it('create com substituição e associação de exercício passa', async () => {
      const db = authedDb(ALICE)
      await assertSucceeds(db.collection(`users/${ALICE}/historico_treinos`).add({
        rotina_id: 'upper_a',
        data: new Date(),
        exercicios: [{
          id: 'substituicao:voador:token',
          nome: 'Supino inclinado com halteres',
          carga_top: 32.5,
          reps_top: 8,
          substituido_de: 'Voador',
          substituido_de_id: 'voador',
          exercicio_associado_nome: 'Supino inclinado com halteres',
          exercicio_associado_id: 'supino-inclinado',
        }],
        exercicios_substituidos: [{ original: 'Voador', substituto: 'Supino inclinado com halteres' }],
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

describe('AkrGym Firestore Rules — amigos', () => {
  const CAROL = 'user-carol'
  const COD_ALICE = 'AAAA2345'
  const COD_BOB = 'BBBB2345'
  const real = uid => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'password' } }).firestore()
  const visitante = uid => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } }).firestore()
  const perfil = (codigo, extra = {}) => ({ nome: 'Pessoa', foto: '', codigo, ...extra })
  const resumo = (extra = {}) => ({ sequencia: 3, acertos30: 12, ultimos7: ['ok', 'ok', 'fora', 'vazio', 'ok', 'ok', 'ok'], ate: '2026-10-12', ...extra })
  const pedido = (a, b, solicitante, extra = {}) => ({ membros: [a, b], solicitante, status: 'pendente', ...extra })
  const PAR = `${ALICE}_${BOB}`

  async function ativar(uid, codigo) {
    const db = real(uid)
    const batch = db.batch()
    batch.set(db.doc(`codigos_amizade/${codigo}`), { uid })
    batch.set(db.doc(`perfis/${uid}`), perfil(codigo))
    return batch.commit()
  }

  before(async () => {
    await env.clearFirestore()
    await assertSucceeds(ativar(ALICE, COD_ALICE))
    await assertSucceeds(ativar(BOB, COD_BOB))
  })

  it('perfil só é criado com conta real e com o próprio código', async () => {
    const anon = visitante('user-anon')
    const lote = anon.batch()
    lote.set(anon.doc('codigos_amizade/ANNN2345'), { uid: 'user-anon' })
    lote.set(anon.doc('perfis/user-anon'), perfil('ANNN2345'))
    await assertFails(lote.commit())
    // Carol tenta usar o código que já é da Alice.
    await assertFails(real(CAROL).doc(`perfis/${CAROL}`).set(perfil(COD_ALICE)))
    await assertFails(real(CAROL).doc(`codigos_amizade/${COD_ALICE}`).set({ uid: CAROL }))
    await assertFails(real(CAROL).doc('codigos_amizade/abc').set({ uid: CAROL }))
    await assertFails(real(CAROL).doc('codigos_amizade/CRRR2345').set({ uid: ALICE }))
  })

  it('código e perfil só são lidos diretamente; listar é proibido', async () => {
    await assertSucceeds(real(CAROL).doc(`codigos_amizade/${COD_ALICE}`).get())
    await assertSucceeds(real(CAROL).doc(`perfis/${ALICE}`).get())
    await assertFails(real(CAROL).collection('codigos_amizade').get())
    await assertFails(real(CAROL).collection('perfis').get())
    await assertFails(visitante('user-anon').doc(`perfis/${ALICE}`).get())
    await assertFails(anonDb().doc(`perfis/${ALICE}`).get())
  })

  it('perfil valida nome, foto e não deixa trocar o código nem editar o de outra pessoa', async () => {
    const alice = real(ALICE).doc(`perfis/${ALICE}`)
    await assertSucceeds(alice.update({ nome: 'Alice', foto: 'data:image/jpeg;base64,AAAA' }))
    await assertFails(alice.update({ nome: '' }))
    await assertFails(alice.update({ nome: 'x'.repeat(41) }))
    await assertFails(alice.update({ foto: 'https://exemplo.com/foto.jpg' }))
    await assertFails(alice.update({ foto: `data:image/jpeg;base64,${'A'.repeat(60001)}` }))
    await assertFails(alice.update({ codigo: COD_BOB }))
    await assertFails(alice.update({ admin: true }))
    await assertFails(real(BOB).doc(`perfis/${ALICE}`).update({ nome: 'Invadido' }))
    await assertFails(real(BOB).doc(`perfis/${ALICE}`).delete())
  })

  it('pedido de amizade exige o próprio usuário, par ordenado e status pendente', async () => {
    const alice = real(ALICE)
    await assertFails(alice.doc(`amizades/${BOB}_${CAROL}`).set(pedido(BOB, CAROL, BOB)))
    await assertFails(alice.doc(`amizades/${PAR}`).set(pedido(ALICE, BOB, BOB)))
    await assertFails(alice.doc(`amizades/${PAR}`).set(pedido(BOB, ALICE, ALICE)))
    await assertFails(alice.doc('amizades/outro-id').set(pedido(ALICE, BOB, ALICE)))
    await assertFails(alice.doc(`amizades/${PAR}`).set(pedido(ALICE, BOB, ALICE, { status: 'aceita' })))
    await assertFails(alice.doc(`amizades/${ALICE}_${ALICE}`).set(pedido(ALICE, ALICE, ALICE)))
    await assertFails(visitante(ALICE).doc(`amizades/${PAR}`).set(pedido(ALICE, BOB, ALICE)))
    await assertSucceeds(alice.doc(`amizades/${PAR}`).set(pedido(ALICE, BOB, ALICE)))
  })

  it('resumo da dieta fica fechado enquanto o pedido está pendente', async () => {
    await assertSucceeds(real(ALICE).doc(`perfis/${ALICE}/compartilhado/dieta`).set(resumo()))
    await assertSucceeds(real(ALICE).doc(`perfis/${ALICE}/compartilhado/dieta`).get())
    await assertFails(real(BOB).doc(`perfis/${ALICE}/compartilhado/dieta`).get())
    await assertFails(real(CAROL).doc(`perfis/${ALICE}/compartilhado/dieta`).get())
  })

  it('só quem recebeu o pedido aceita, e sem alterar outros campos', async () => {
    await assertFails(real(ALICE).doc(`amizades/${PAR}`).update({ status: 'aceita' }))
    await assertFails(real(CAROL).doc(`amizades/${PAR}`).update({ status: 'aceita' }))
    await assertFails(real(BOB).doc(`amizades/${PAR}`).update({ status: 'aceita', solicitante: BOB }))
    await assertFails(real(BOB).doc(`amizades/${PAR}`).set(pedido(ALICE, BOB, BOB)))
    await assertSucceeds(real(BOB).doc(`amizades/${PAR}`).update({ status: 'aceita' }))
    await assertFails(real(BOB).doc(`amizades/${PAR}`).update({ status: 'pendente' }))
  })

  it('amigo aceito lê o resumo; os outros não', async () => {
    await assertSucceeds(real(BOB).doc(`perfis/${ALICE}/compartilhado/dieta`).get())
    await assertFails(real(CAROL).doc(`perfis/${ALICE}/compartilhado/dieta`).get())
    await assertFails(real(BOB).doc(`perfis/${ALICE}/compartilhado/dieta`).set(resumo()))
    await assertFails(real(BOB).collection(`perfis/${ALICE}/compartilhado`).get())
  })

  it('resumo rejeita valores fora do contrato', async () => {
    const ref = real(ALICE).doc(`perfis/${ALICE}/compartilhado/dieta`)
    await assertFails(ref.set(resumo({ sequencia: 31 })))
    await assertFails(ref.set(resumo({ acertos30: -1 })))
    await assertFails(ref.set(resumo({ sequencia: 1.5 })))
    await assertFails(ref.set(resumo({ ultimos7: ['ok'] })))
    await assertFails(ref.set(resumo({ ultimos7: ['ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'talvez'] })))
    await assertFails(ref.set(resumo({ ate: '12/10/2026' })))
    await assertFails(ref.set(resumo({ kcal: 1800 })))
    await assertFails(real(ALICE).doc(`perfis/${ALICE}/compartilhado/refeicoes`).set(resumo()))
  })

  it('amizades são listadas só pelos membros e qualquer um dos dois desfaz', async () => {
    await assertSucceeds(real(ALICE).collection('amizades').where('membros', 'array-contains', ALICE).get())
    await assertFails(real(CAROL).collection('amizades').where('membros', 'array-contains', ALICE).get())
    await assertFails(real(CAROL).collection('amizades').get())
    await assertFails(real(CAROL).doc(`amizades/${PAR}`).get())
    await assertFails(real(CAROL).doc(`amizades/${PAR}`).delete())
    await assertSucceeds(real(BOB).doc(`amizades/${PAR}`).delete())
    await assertFails(real(BOB).doc(`perfis/${ALICE}/compartilhado/dieta`).get())
  })

  it('dono apaga resumo, perfil e código; os dados privados continuam isolados', async () => {
    await assertFails(real(BOB).doc(`codigos_amizade/${COD_ALICE}`).delete())
    await assertSucceeds(real(ALICE).doc(`perfis/${ALICE}/compartilhado/dieta`).delete())
    await assertSucceeds(real(ALICE).doc(`perfis/${ALICE}`).delete())
    await assertSucceeds(real(ALICE).doc(`codigos_amizade/${COD_ALICE}`).delete())
    await assertFails(real(BOB).doc(`users/${ALICE}/diario_dieta/2026-10-12`).get())
  })
})

describe('AkrGym Firestore Rules — calendário do amigo', () => {
  const CAROL = 'user-carol'
  const real = uid => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'password' } }).firestore()
  const visitante = uid => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } }).firestore()
  const mes = uid => `perfis/${uid}/compartilhado/mes-2026-10`
  const calendario = (extra = {}) => ({ dias: { '01': 'ok', '02': 301, '03': -1001 }, ...extra })

  before(async () => {
    await env.clearFirestore()
    await env.withSecurityRulesDisabled(async contexto => {
      await contexto.firestore().doc(`amizades/${ALICE}_${BOB}`).set({ membros: [ALICE, BOB], solicitante: ALICE, status: 'aceita' })
      await contexto.firestore().doc(`amizades/${ALICE}_${CAROL}`).set({ membros: [ALICE, CAROL], solicitante: CAROL, status: 'pendente' })
    })
  })

  it('dono publica o mês; formato e nome do documento são validados', async () => {
    await assertSucceeds(real(ALICE).doc(mes(ALICE)).set(calendario()))
    await assertSucceeds(real(ALICE).doc(mes(ALICE)).set({ dias: {} }))
    await assertSucceeds(real(ALICE).doc(mes(ALICE)).set(calendario()))
    await assertFails(real(ALICE).doc(mes(ALICE)).set(calendario({ refeicoes: ['arroz'] })))
    await assertFails(real(ALICE).doc(mes(ALICE)).set({ dias: 'ok' }))
    await assertFails(real(ALICE).doc(mes(ALICE)).set({ dias: Object.fromEntries(Array.from({ length: 32 }, (_, i) => [`d${i}`, 'ok'])) }))
    await assertFails(real(ALICE).doc(`perfis/${ALICE}/compartilhado/mes-2026-13`).set(calendario()))
    await assertFails(real(ALICE).doc(`perfis/${ALICE}/compartilhado/diario`).set(calendario()))
    await assertFails(visitante(ALICE).doc(mes(ALICE)).set(calendario()))
    await assertFails(real(BOB).doc(mes(ALICE)).set(calendario()))
  })

  it('só amigo aceito lê o calendário; pedido pendente e estranhos não', async () => {
    await assertSucceeds(real(ALICE).doc(mes(ALICE)).get())
    await assertSucceeds(real(BOB).doc(mes(ALICE)).get())
    await assertSucceeds(real(BOB).doc(`perfis/${ALICE}/compartilhado/mes-2026-01`).get())
    await assertFails(real(CAROL).doc(mes(ALICE)).get())
    await assertFails(real('user-dave').doc(mes(ALICE)).get())
    await assertFails(anonDb().doc(mes(ALICE)).get())
  })

  it('só o dono lista e apaga os meses publicados', async () => {
    await assertSucceeds(real(ALICE).collection(`perfis/${ALICE}/compartilhado`).get())
    await assertFails(real(BOB).collection(`perfis/${ALICE}/compartilhado`).get())
    await assertFails(real(BOB).doc(mes(ALICE)).delete())
    await assertSucceeds(real(ALICE).doc(mes(ALICE)).delete())
  })

  it('o diário privado continua fechado para o amigo', async () => {
    await assertFails(real(BOB).doc(`users/${ALICE}/diario_dieta/2026-10-12`).get())
    await assertFails(real(BOB).collection(`users/${ALICE}/diario_dieta`).get())
  })
})
