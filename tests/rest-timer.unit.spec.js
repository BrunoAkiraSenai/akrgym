import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DESCANSO_PRESETS,
  acompanharDescanso,
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

test('eventos no mesmo segundo não geram um novo estado do timer', () => {
  const iniciado = timerReducer({ configurado: 90, restante: 90 }, { type: 'start', now: 1_000 })
  assert.equal(timerReducer(iniciado, { type: 'tick', now: 1_500 }), iniciado)
})

test('pausa, retomada, reinício e pulo mantêm a contagem e o alarme consistentes', () => {
  const inicial = { configurado: 90, restante: 90, rodando: false, concluido: false, terminaEm: null }
  const iniciado = timerReducer(inicial, { type: 'start', now: 1_000 })
  const pausado = timerReducer(iniciado, { type: 'pause', now: 11_250 })
  assert.equal(pausado.restante, 80)
  assert.equal(pausado.terminaEm, null)
  assert.equal(timerReducer(pausado, { type: 'tick', now: 100_000 }), pausado)
  const retomado = timerReducer(pausado, { type: 'start', now: 100_000 })
  assert.equal(retomado.terminaEm, 180_000)
  assert.deepEqual(timerReducer(retomado, { type: 'reset' }), inicial)
  assert.deepEqual(timerReducer(retomado, { type: 'skip' }), { ...inicial, restante: 0 })
})

function criarAmbienteTimer() {
  let agora = 0
  let proximoId = 0
  const pendentes = new Map()
  const janela = new EventTarget()
  const documento = new EventTarget()
  documento.hidden = false
  janela.setTimeout = (callback, atraso) => {
    const id = ++proximoId
    pendentes.set(id, { callback, atraso })
    return id
  }
  janela.clearTimeout = id => pendentes.delete(id)
  return {
    ambiente: { window: janela, document: documento, now: () => agora },
    pendentes,
    definirAgora: valor => { agora = valor },
    proximoTick: valor => {
      assert.equal(pendentes.size, 1)
      const [id, { callback }] = pendentes.entries().next().value
      pendentes.delete(id)
      agora = valor
      callback()
    },
    visibilidade: hidden => {
      documento.hidden = hidden
      documento.dispatchEvent(new Event('visibilitychange'))
    },
    eventoJanela: nome => janela.dispatchEvent(new Event(nome)),
  }
}

test('agenda apenas a próxima mudança de segundo enquanto a tela está visível', () => {
  const fake = criarAmbienteTimer()
  const atualizacoes = []
  fake.definirAgora(250)
  const parar = acompanharDescanso(10_000, agora => atualizacoes.push(agora), fake.ambiente)
  assert.equal(fake.pendentes.values().next().value.atraso, 750)
  fake.proximoTick(1_000)
  assert.equal(fake.pendentes.values().next().value.atraso, 1_000)
  assert.deepEqual(atualizacoes, [250, 1_000])
  parar()
})

test('em segundo plano espera o término sem continuar acordando a cada segundo', () => {
  const fake = criarAmbienteTimer()
  const atualizacoes = []
  const parar = acompanharDescanso(90_000, agora => atualizacoes.push(agora), fake.ambiente)
  fake.definirAgora(5_200)
  fake.visibilidade(true)
  assert.equal(fake.pendentes.size, 1)
  assert.equal(fake.pendentes.values().next().value.atraso, 84_800)
  fake.proximoTick(90_000)
  assert.deepEqual(atualizacoes, [0, 5_200, 90_000])
  assert.equal(fake.pendentes.size, 0)
  parar()
})

test('voltar à tela corrige o relógio e retoma apenas um agendamento', () => {
  const fake = criarAmbienteTimer()
  const atualizacoes = []
  fake.visibilidade(true)
  const parar = acompanharDescanso(90_000, agora => atualizacoes.push(agora), fake.ambiente)
  fake.definirAgora(32_450)
  fake.visibilidade(false)
  fake.eventoJanela('focus')
  fake.eventoJanela('pageshow')
  assert.equal(atualizacoes.at(-1), 32_450)
  assert.equal(fake.pendentes.size, 1)
  assert.equal(fake.pendentes.values().next().value.atraso, 550)
  parar()
})

test('retorno após suspensão conclui o descanso sem depender de ticks perdidos', () => {
  const fake = criarAmbienteTimer()
  let estado = timerReducer({ configurado: 90, restante: 90 }, { type: 'start', now: 0 })
  fake.visibilidade(true)
  const parar = acompanharDescanso(estado.terminaEm, now => { estado = timerReducer(estado, { type: 'tick', now }) }, fake.ambiente)
  fake.definirAgora(120_000)
  fake.visibilidade(false)
  assert.equal(estado.restante, 0)
  assert.equal(estado.concluido, true)
  assert.equal(fake.pendentes.size, 0)
  parar()
})

test('desmontar ou pausar cancela agendamento e eventos antigos', () => {
  const fake = criarAmbienteTimer()
  const atualizacoes = []
  const parar = acompanharDescanso(90_000, agora => atualizacoes.push(agora), fake.ambiente)
  const callbackAntigo = fake.pendentes.values().next().value.callback
  parar()
  assert.equal(fake.pendentes.size, 0)
  fake.definirAgora(10_000)
  fake.visibilidade(true)
  fake.eventoJanela('focus')
  fake.eventoJanela('pageshow')
  callbackAntigo()
  assert.deepEqual(atualizacoes, [0])
  assert.equal(fake.pendentes.size, 0)
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
    assert.equal(avisos[0].title, 'AkrGym · Descanso concluído')
    assert.match(avisos[0].options.body, /Supino reto/)
    assert.equal(avisos[0].options.icon, '/favicon.svg')
    assert.deepEqual(avisos[0].options.vibrate, [120, 60, 120])
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
