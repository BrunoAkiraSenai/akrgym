import test from 'node:test'
import assert from 'node:assert/strict'
import { corpoGemini, listaModelos, textoDaResposta } from '../cloudflare-worker/analisar-refeicao/src/index.js'

test('modelo 2.x: pedido no formato de sempre', () => {
  const { generationConfig: c } = corpoGemini('gemini-2.5-flash', 'oi')
  assert.equal(c.responseSchema.type, 'OBJECT')
  assert.equal(c.temperature, 0.1)
  assert.deepEqual(c.thinkingConfig, { thinkingBudget: 0 })
  assert.equal(c.responseJsonSchema, undefined)
})

test('modelo 3.x: formato do guia de migração (sem temperature, thinkingLevel, JSON Schema)', () => {
  const { contents, generationConfig: c } = corpoGemini('gemini-3.5-flash-lite', 'oi')
  assert.equal(contents[0].parts[0].text, 'oi')
  assert.equal('temperature' in c, false)
  assert.deepEqual(c.thinkingConfig, { thinkingLevel: 'minimal' })
  assert.equal(c.responseSchema, undefined)
  assert.equal(c.responseJsonSchema.type, 'object')
  assert.equal(c.responseJsonSchema.properties.itens.items.properties.gramas.type, 'number')
  assert.deepEqual(c.responseJsonSchema.properties.itens.items.properties.estado.enum.slice(0, 2), ['cru', 'cozido'])
  assert.equal(c.responseMimeType, 'application/json')
})

test('resposta: junta o texto e ignora partes de raciocínio', () => {
  const body = { candidates: [{ content: { parts: [{ thought: true, text: 'pensando...' }, { text: '{"a":' }, { text: '1}' }] } }] }
  assert.equal(textoDaResposta(body), '{"a":1}')
  assert.equal(textoDaResposta({}), undefined)
  assert.equal(textoDaResposta({ candidates: [{ content: { parts: [{ text: 'x' }] } }] }), 'x')
})

test('lista de modelos pela variável do Worker, com padrão seguro', () => {
  assert.deepEqual(listaModelos({}), ['gemini-3.5-flash-lite', 'gemini-3.5-flash-lite', 'gemini-2.5-flash'])
  assert.deepEqual(listaModelos({ GEMINI_MODELOS: 'gemini-3.5-flash-lite, gemini-3.5-flash-lite,gemini-2.5-flash' }), ['gemini-3.5-flash-lite', 'gemini-3.5-flash-lite', 'gemini-2.5-flash'])
  assert.deepEqual(listaModelos({ GEMINI_MODELOS: 'lixo,../x' }), ['gemini-3.5-flash-lite', 'gemini-3.5-flash-lite', 'gemini-2.5-flash'])
})
