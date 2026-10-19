import test from 'node:test'
import assert from 'node:assert/strict'
import { criarIndice, encontrarNaTabela, resolverItens, somarItens } from '../cloudflare-worker/analisar-refeicao/src/nutricao.js'

// Amostra da TACO 4ª ed. (valores por 100 g) com variações de estado.
const TABELA = [
  { id: 2, nome: 'Arroz, tipo 1, cru', kcal: 358, proteinas: 7.2, carboidratos: 78.8, gorduras: 0.3, fibras: 1.6 },
  { id: 3, nome: 'Arroz, tipo 1, cozido', kcal: 128, proteinas: 2.5, carboidratos: 28.1, gorduras: 0.2, fibras: 1.6 },
  { id: 1, nome: 'Arroz, integral, cozido', kcal: 124, proteinas: 2.6, carboidratos: 25.8, gorduras: 1, fibras: 2.7 },
  { id: 361, nome: 'Carne, bovina, fraldinha, com gordura, cozida', kcal: 338, proteinas: 24.2, carboidratos: 0, gorduras: 26, fibras: 0 },
  { id: 362, nome: 'Carne, bovina, fraldinha, com gordura, crua', kcal: 221, proteinas: 17.6, carboidratos: 0, gorduras: 16.1, fibras: 0 },
  { id: 410, nome: 'Frango, peito, sem pele, grelhado', kcal: 159, proteinas: 32, carboidratos: 0, gorduras: 2.5, fibras: 0 },
  { id: 488, nome: 'Ovo, de galinha, inteiro, cozido/10minutos', kcal: 146, proteinas: 13.3, carboidratos: 0.6, gorduras: 9.5, fibras: 0 },
  { id: 561, nome: 'Feijão, carioca, cozido', kcal: 76, proteinas: 4.8, carboidratos: 13.6, gorduras: 0.5, fibras: 8.5 },
  { id: 53, nome: 'Pão, trigo, francês', kcal: 300, proteinas: 8, carboidratos: 58.6, gorduras: 3.1, fibras: 2.3 },
]
const indice = criarIndice(TABELA)
const item = (alimento, estado, gramas, extra = {}) => ({ alimento, estado, estado_informado: true, gramas, gramas_estimadas: false, kcal: 100, p: 10, c: 10, g: 1, fibras: 0, ...extra })

test('fraldinha crua usa a linha crua da tabela, não a cozida', () => {
  assert.equal(encontrarNaTabela(indice, 'carne bovina fraldinha', 'cru').id, 362)
  assert.equal(encontrarNaTabela(indice, 'fraldinha', 'cozido').id, 361)
})

test('nomes do dia a dia chegam na linha certa da TACO', () => {
  assert.equal(encontrarNaTabela(indice, 'arroz branco', 'cozido').id, 3)
  assert.equal(encontrarNaTabela(indice, 'arroz tipo 1', 'cru').id, 2)
  assert.equal(encontrarNaTabela(indice, 'arroz integral', 'cozido').id, 1)
  assert.equal(encontrarNaTabela(indice, 'peito de frango', 'grelhado').id, 410)
  assert.equal(encontrarNaTabela(indice, 'ovos', 'cozido').id, 488)
  assert.equal(encontrarNaTabela(indice, 'feijão', 'cozido').id, 561)
  assert.equal(encontrarNaTabela(indice, 'pão francês', null).id, 53)
})

test('sem a linha do estado pedido, não troca por outro estado', () => {
  assert.equal(encontrarNaTabela(indice, 'peito de frango', 'cru'), null)
  assert.equal(encontrarNaTabela(indice, 'arroz', null), null)
  assert.equal(encontrarNaTabela(indice, 'corn dog', 'frito'), null)
})

test('o exemplo do Bruno: 230 g de arroz e 150 g de fraldinha crua', () => {
  const { itens, totais } = resolverItens({ valido: true, itens: [
    item('arroz branco', 'cozido', 230, { estado_informado: false }),
    item('carne bovina fraldinha', 'cru', 150, { kcal: 450, p: 45 }),
  ] }, indice)
  assert.deepEqual(itens.map(i => [i.fonte, i.referencia]), [['taco', 'Arroz, tipo 1, cozido'], ['taco', 'Carne, bovina, fraldinha, com gordura, crua']])
  assert.equal(itens[1].proteinas, 26.4)
  // 294,4 + 331,5 kcal; 5,75 + 26,4 g de proteína
  assert.deepEqual(totais, { kcal: 626, proteinas: 32, carboidratos: 65, gorduras: 25, fibras: 4 })
})

test('alimento fora da tabela fica com a estimativa da IA, marcada como estimativa', () => {
  const { itens } = resolverItens({ valido: true, itens: [item('corn dog', 'frito', 120, { kcal: 330, p: 9, c: 30, g: 19, fibras: 1 })] }, indice)
  assert.equal(itens[0].fonte, 'estimativa')
  assert.equal(itens[0].kcal, 330)
  assert.equal(itens[0].por100.kcal, 275)
})

test('respostas que não servem são recusadas com o motivo certo', () => {
  assert.deepEqual(resolverItens({ valido: false, itens: [] }, indice), { motivo: 'nao_alimento' })
  assert.deepEqual(resolverItens({ valido: true }, indice), { motivo: 'formato' })
  assert.deepEqual(resolverItens({ valido: true, itens: [item('arroz', 'cozido', 0)] }, indice), { motivo: 'formato' })
  assert.deepEqual(resolverItens({ valido: true, itens: [item('arroz', 'cozido', 100, { kcal: -1 })] }, indice), { motivo: 'formato' })
  assert.deepEqual(resolverItens({ valido: true, itens: [item('arroz tipo 1', 'cru', 4000)] }, indice), { motivo: 'limite' })
})

test('soma arredonda só no total', () => {
  assert.deepEqual(somarItens([{ kcal: 10.4, proteinas: 0.3, carboidratos: 0, gorduras: 0, fibras: 0 }, { kcal: 10.4, proteinas: 0.3, carboidratos: 0, gorduras: 0, fibras: 0 }]), { kcal: 21, proteinas: 1, carboidratos: 0, gorduras: 0, fibras: 0 })
})

test('tabela completa: alimentos comuns caem na linha certa ou viram estimativa', async () => {
  const { default: TACO } = await import('../cloudflare-worker/analisar-refeicao/src/taco.js')
  const completo = criarIndice(TACO)
  const casos = [
    ['carne bovina fraldinha', 'cru', 362], ['arroz branco', 'cozido', 3], ['feijao', 'cozido', 561],
    ['peito de frango', 'grelhado', 410], ['frango peito sem pele', 'cru', 409], ['patinho', 'grelhado', 377],
    ['contrafile', 'grelhado', 346], ['carne moida', 'cozido', 326], ['ovo', 'frito', 490], ['clara de ovo', 'cozido', 486],
    ['banana', 'cru', 182], ['maca fuji', 'cru', 222], ['queijo mussarela', null, 463], ['requeijao', null, 468],
    ['batata doce', 'cozido', 88], ['aveia flocos', 'cru', 7],
  ]
  for (const [alimento, estado, id] of casos) assert.equal(encontrarNaTabela(completo, alimento, estado)?.id, id, alimento)
  // Leite líquido está "em reavaliação" na TACO: não pode virar leite em pó nem zero.
  for (const [alimento, estado] of [['leite integral', null], ['tapioca', null], ['maca', 'cozido'], ['whey protein', null]]) {
    assert.equal(encontrarNaTabela(completo, alimento, estado), null, alimento)
  }
  assert.equal(encontrarNaTabela(completo, 'maca', 'cru').nome.startsWith('Maçã'), true)
})
