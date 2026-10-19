import test from 'node:test'
import assert from 'node:assert/strict'
import { mudarGramas, normalizarItensIA, removerItem, rotuloEstado, totaisDosItens } from '../src/utils/itensIA.js'

const fraldinha = { nome: 'carne bovina fraldinha', referencia: 'Carne, bovina, fraldinha, com gordura, crua', fonte: 'taco', estado: 'cru', estadoInformado: true, gramasEstimadas: false, gramas: 150, por100: { kcal: 221, proteinas: 17.6, carboidratos: 0, gorduras: 16.1, fibras: 0 } }
const arroz = { nome: 'arroz branco', referencia: 'Arroz, tipo 1, cozido', fonte: 'taco', estado: 'cozido', estadoInformado: false, gramasEstimadas: false, gramas: 230, por100: { kcal: 128, proteinas: 2.5, carboidratos: 28.1, gorduras: 0.2, fibras: 1.6 } }

test('itens do Worker viram linhas com a conta refeita a partir dos valores por 100 g', () => {
  const [a, f] = normalizarItensIA([arroz, fraldinha])
  assert.equal(f.proteinas, 26.4)
  assert.equal(a.kcal, 294.4)
  assert.deepEqual(totaisDosItens([a, f]), { kcal: 626, proteinas: 32, carboidratos: 65, gorduras: 25, fibras: 4 })
})

test('item malformado descarta o detalhe inteiro (o total do Worker continua)', () => {
  assert.deepEqual(normalizarItensIA([arroz, { ...fraldinha, por100: null }]), [])
  assert.deepEqual(normalizarItensIA(undefined), [])
})

test('corrigir gramas ou tirar um item refaz o total', () => {
  const itens = normalizarItensIA([arroz, fraldinha])
  const corrigidos = mudarGramas(itens, 1, '200')
  assert.equal(corrigidos[1].proteinas, 35.2)
  assert.equal(totaisDosItens(removerItem(corrigidos, 0)).kcal, 442)
  assert.equal(mudarGramas(itens, 0, 'abc'), itens)
})

test('estado que a pessoa não escreveu aparece como presumido', () => {
  const [a, f] = normalizarItensIA([arroz, fraldinha])
  assert.equal(rotuloEstado(f), 'cru')
  assert.equal(rotuloEstado(a), 'cozido (presumido)')
})
