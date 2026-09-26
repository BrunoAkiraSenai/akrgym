import test from 'node:test'
import assert from 'node:assert/strict'
import { buscarExercicios, CATALOGO_EXERCICIOS } from '../src/config/catalogoExercicios.js'

test('catálogo local oferece mais de 250 variações sem descrições ou imagens pesadas', () => {
  assert.ok(CATALOGO_EXERCICIOS.length > 250)
  assert.ok(Buffer.byteLength(JSON.stringify(CATALOGO_EXERCICIOS)) < 20_000)
})

test('cada exercício tem apenas um grupo canônico no catálogo', () => {
  const nomes = CATALOGO_EXERCICIOS.map(({ nome }) => nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase())
  assert.equal(new Set(nomes).size, nomes.length)

  for (const [nome, grupo] of [
    ['Levantamento terra sumô', 'Posterior de coxa e glúteos'],
    ['Good morning', 'Posterior de coxa e glúteos'],
    ['Extensão lombar no banco', 'Costas'],
  ]) {
    assert.ok(CATALOGO_EXERCICIOS.some(exercicio => exercicio.nome === nome && exercicio.grupo === grupo))
  }
})

test('busca por exercício mostra variações relacionadas para escolha', () => {
  const resultados = buscarExercicios('supino inclinado')
  const nomes = resultados.map(exercicio => exercicio.nome)

  assert.ok(nomes.length > 1)
  assert.ok(nomes.includes('Supino inclinado com barra'))
  assert.ok(nomes.includes('Supino inclinado com halteres'))
  assert.ok(nomes.includes('Supino inclinado na máquina'))
  assert.ok(resultados.every(exercicio => exercicio.grupo === 'Peito'))
  assert.ok(!nomes.includes('Supino reto com barra'))
})

test('elevação lateral não retorna elevação pélvica unilateral por coincidência parcial', () => {
  const nomes = buscarExercicios('elevação lateral', [], 50).map(exercicio => exercicio.nome)

  assert.ok(nomes.some(nome => nome.startsWith('Elevação lateral')))
  assert.ok(!nomes.includes('Elevação pélvica unilateral'))
})

test('catálogo encontra rosca inclinada a 45 graus para bíceps', () => {
  const nomes = buscarExercicios('rosca 45', [], 50).map(exercicio => exercicio.nome)

  assert.ok(nomes.includes('Rosca inclinada a 45 graus com halteres'))
  assert.ok(nomes.includes('Rosca 45 graus para bíceps'))
})

test('busca mostra variações de pegada semi-pronada em remadas e puxadas', () => {
  const remadas = buscarExercicios('remada semi-pronada', [], 50).map(exercicio => exercicio.nome)
  const puxadas = buscarExercicios('puxada semi pronada', [], 50).map(exercicio => exercicio.nome)

  assert.ok(remadas.some(nome => nome.includes('semi-pronada')))
  assert.ok(puxadas.some(nome => nome.includes('semi-pronada')))
  assert.ok(buscarExercicios('remada semipronada', [], 50).some(exercicio => exercicio.nome.includes('semi-pronada')))
})

test('busca tolera acentos e erro de digitação sem escolher automaticamente', () => {
  assert.ok(buscarExercicios('triceps testa').some(exercicio => exercicio.nome === 'Tríceps testa com barra'))

  const digitacaoErrada = buscarExercicios('supinoo')
  assert.ok(digitacaoErrada.length > 1)
  assert.ok(digitacaoErrada.every(exercicio => exercicio.nome.toLowerCase().includes('supino')))
})

test('busca ignora preposições e entende a abreviação c/ sem perder especificidade', () => {
  assert.ok(buscarExercicios('rosca para bíceps').some(exercicio => exercicio.nome === 'Rosca 45 graus para bíceps'))
  assert.ok(buscarExercicios('supino inclinado c/ halteres').some(exercicio => exercicio.nome === 'Supino inclinado com halteres'))
})

test('busca trata limites inválidos e lista opcional sem retornar resultados inesperados', () => {
  assert.deepEqual(buscarExercicios('supino inclinado', [], -1), [])
  assert.deepEqual(buscarExercicios('supino inclinado', [], 0), [])
  assert.equal(buscarExercicios('supino inclinado', [], 1).length, 1)
  assert.doesNotThrow(() => buscarExercicios('remada articulada personalizada', null))
})

test('busca inclui exercícios particulares salvos nas rotinas do usuário', () => {
  const resultados = buscarExercicios('remada articulada personalizada', ['Remada articulada personalizada'])
  assert.ok(resultados.some(exercicio => exercicio.nome === 'Remada articulada personalizada' && exercicio.grupo === 'Seus treinos'))
})

test('busca vazia não exibe sugestões antes de a pessoa pesquisar', () => {
  assert.deepEqual(buscarExercicios('   '), [])
})
