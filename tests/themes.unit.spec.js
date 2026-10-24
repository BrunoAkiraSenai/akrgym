import test from 'node:test'
import assert from 'node:assert/strict'
import { applyTheme, getStoredTheme } from '../src/utils/themes.js'

test('tema inválido volta para Esmeralda e sincroniza as cores da interface', () => {
  const originais = new Map()
  const salvarGlobal = (nome, valor) => {
    if (!originais.has(nome)) originais.set(nome, globalThis[nome])
    globalThis[nome] = valor
  }
  const propriedades = new Map()
  const atributos = new Map()
  const estilos = new Map()
  const meta = { setAttribute: (nome, valor) => atributos.set(nome, valor) }
  const eventos = []
  let valorPersistido = 'tema-removido'

  salvarGlobal('document', {
    documentElement: {
      style: { setProperty: (nome, valor) => estilos.set(nome, valor) },
      setAttribute: (nome, valor) => propriedades.set(nome, valor),
    },
    querySelector: seletor => seletor === 'meta[name="theme-color"]' ? meta : null,
  })
  salvarGlobal('localStorage', {
    getItem: () => valorPersistido,
    setItem: (_chave, valor) => { valorPersistido = valor },
  })
  salvarGlobal('window', { dispatchEvent: evento => { eventos.push(evento) } })
  salvarGlobal('CustomEvent', class CustomEvent {
    constructor(type, options) { this.type = type; this.detail = options?.detail }
  })

  try {
    assert.equal(getStoredTheme(), 'esmeralda')
    valorPersistido = 'roxo-suave'
    assert.equal(getStoredTheme(), 'roxo-suave')
    valorPersistido = 'tema-removido'
    applyTheme('tema-removido')

    assert.equal(propriedades.get('data-theme'), 'esmeralda')
    assert.equal(estilos.get('--bg-deep'), '#050807')
    assert.equal(estilos.get('--bg-card-solid'), '#0a120e')
    assert.equal(atributos.get('content'), '#050807')
    assert.equal(valorPersistido, 'esmeralda')
    assert.equal(eventos.at(-1).detail, 'esmeralda')
  } finally {
    for (const [nome, valor] of originais) {
      if (valor === undefined) delete globalThis[nome]
      else globalThis[nome] = valor
    }
  }
})
