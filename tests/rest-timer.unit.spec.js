import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DESCANSO_PRESETS,
  calcularRestante,
  formatarDescanso,
  normalizarDescansoSegundos,
  resolverDescansoSalvo,
  timerReducer,
} from '../src/utils/restTimer.js'
import {
  notificacoesDisponiveis,
  obterPermissaoNotificacao,
  solicitarPermissaoNotificacao,
  notificarDescansoConcluido,
} from '../src/utils/restNotification.js'

test('descanso normaliza valores para a faixa suportada', () => {
  assert.equal(normalizarDescansoSegundos(undefined), 90)
  assert.equal(normalizarDescansoSegundos(0), 15)
  assert.equal(normalizarDescansoSegundos(91.4), 91)
  assert.equal(normalizarDescansoSegundos(999), 600)
})

test('preferência ausente mantém o padrão configurado', () => {
  assert.equal(resolverDescansoSalvo(null), 90)
  assert.equal(resolverDescansoSalvo('', 120), 120)
  assert.equal(resolverDescansoSalvo('0', 120), 15)
})

test('tempo restante usa o relógio final e não deriva dos ticks', () => {
  assert.equal(calcularRestante(10_000, 9_001), 1)
  assert.equal(calcularRestante(10_000, 10_000), 0)
  assert.equal(calcularRestante(10_000, 12_000), 0)
})

test('timer continua correto quando o próximo tick acontece após o prazo', () => {
  const iniciado = timerReducer({ configurado: 90, restante: 90, rodando: false, concluido: false, terminaEm: null }, { type: 'start', now: 1_000 })
  const concluido = timerReducer(iniciado, { type: 'tick', now: 95_000 })
  assert.equal(concluido.restante, 0)
  assert.equal(concluido.rodando, false)
  assert.equal(concluido.concluido, true)
})

test('notificações não quebram fora do navegador', async () => {
  assert.equal(notificacoesDisponiveis(), false)
  assert.equal(obterPermissaoNotificacao(), 'unsupported')
  assert.equal(await solicitarPermissaoNotificacao(), 'unsupported')
  assert.equal(await notificarDescansoConcluido(), false)
})

test('notificação solicita permissão e informa o exercício concluído', async () => {
  const janelaAnterior = globalThis.window
  const avisos = []
  class FakeNotification {
    static permission = 'default'

    static async requestPermission() {
      FakeNotification.permission = 'granted'
      return FakeNotification.permission
    }

    constructor(title, options) {
      this.title = title
      this.options = options
      this.listeners = {}
      avisos.push(this)
    }

    addEventListener(event, callback) {
      this.listeners[event] = callback
    }

    close() {}
  }

  globalThis.window = { Notification: FakeNotification, focus() {} }
  try {
    assert.equal(await solicitarPermissaoNotificacao(), 'granted')
    assert.equal(await notificarDescansoConcluido('Supino reto'), true)
    assert.equal(avisos[0].title, 'Descanso concluído')
    assert.match(avisos[0].options.body, /Supino reto/)
  } finally {
    if (janelaAnterior === undefined) delete globalThis.window
    else globalThis.window = janelaAnterior
  }
})

test('descanso formata minutos e segundos para o cronômetro', () => {
  assert.equal(formatarDescanso(0), '00:00')
  assert.equal(formatarDescanso(90), '01:30')
  assert.equal(formatarDescanso(300), '05:00')
})

test('presets de descanso oferecem opções rápidas', () => {
  assert.deepEqual(DESCANSO_PRESETS, [30, 60, 90, 120, 180, 300])
})
