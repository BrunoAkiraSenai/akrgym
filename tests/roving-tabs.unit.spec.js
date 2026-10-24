import test from 'node:test'
import assert from 'node:assert/strict'
import { focusTabWithArrowKey } from '../src/utils/rovingTabs.js'

function criarEventoTeclado(tecla, indiceAtual, quantidade = 2) {
  const tabs = Array.from({ length: quantidade }, () => ({ foco: false, clicado: false, focus() { this.foco = true }, click() { this.clicado = true } }))
  const tabList = { querySelectorAll: () => tabs }
  const event = {
    key: tecla,
    currentTarget: tabs[indiceAtual],
    prevenido: false,
    preventDefault() { this.prevenido = true },
  }
  event.currentTarget.closest = () => tabList
  return { event, tabs }
}

test('abas avançam, voltam e fazem wrap com as setas', () => {
  const direita = criarEventoTeclado('ArrowRight', 0)
  assert.equal(focusTabWithArrowKey(direita.event), true)
  assert.equal(direita.tabs[1].foco, true)
  assert.equal(direita.tabs[1].clicado, true)
  assert.equal(direita.event.prevenido, true)

  const esquerda = criarEventoTeclado('ArrowLeft', 0)
  assert.equal(focusTabWithArrowKey(esquerda.event), true)
  assert.equal(esquerda.tabs[1].foco, true)
})

test('Home e End focam a primeira e a última aba', () => {
  const inicio = criarEventoTeclado('Home', 1, 3)
  const fim = criarEventoTeclado('End', 0, 3)
  focusTabWithArrowKey(inicio.event)
  focusTabWithArrowKey(fim.event)
  assert.equal(inicio.tabs[0].foco, true)
  assert.equal(fim.tabs[2].foco, true)
})

test('teclas não relacionadas não bloqueiam o comportamento padrão do botão', () => {
  const evento = criarEventoTeclado('Enter', 0)
  assert.equal(focusTabWithArrowKey(evento.event), false)
  assert.equal(evento.event.prevenido, false)
})
