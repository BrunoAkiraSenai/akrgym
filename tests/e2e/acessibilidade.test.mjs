// Acessibilidade automática: contraste AA nos 5 temas, foco visível no teclado
// e nome acessível em botões e campos, nas telas principais.
import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { abrirApp, fecharNavegador } from './lab.mjs'

after(fecharNavegador)

const TEMAS = ['esmeralda', 'roxo-suave', 'oceano', 'lava', 'original']

for (const tema of TEMAS) {
  test(`contraste AA nas telas principais (tema ${tema})`, async () => {
    const { page, contexto } = await abrirApp({ tema })
    await page.addScriptTag({ url: '/tools/lab/contraste.js', type: 'module' })
    await page.waitForFunction(() => typeof window.__varrer === 'function')
    const resultado = await page.evaluate(() => window.__varrer())
    const falhas = resultado.split('\n').filter(linha => /^\d/.test(linha))
    const abasFaltando = resultado.split('\n').filter(linha => linha.includes('aba não encontrada'))
    assert.deepEqual(abasFaltando, [], 'todas as telas da varredura abriram')
    assert.deepEqual(falhas, [], `textos abaixo do mínimo:\n${falhas.join('\n')}`)
    await contexto.close()
  })
}

// Percorre a página com Tab e devolve os elementos focados sem indicador visível.
async function focosInvisiveis(page, passos = 60) {
  await page.locator('body').click({ position: { x: 1, y: 1 } })
  const problemas = new Set()
  for (let i = 0; i < passos; i++) {
    await page.keyboard.press('Tab')
    const info = await page.evaluate(() => {
      const el = document.activeElement
      if (!el || el === document.body) return null
      // O indicador pode estar no próprio elemento ou no rótulo em volta (:focus-within),
      // como no seletor de data, em que o campo é invisível sobre o botão.
      const indicador = alvo => {
        const cs = getComputedStyle(alvo)
        return (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow && cs.boxShadow !== 'none')
      }
      const visivel = [el, el.parentElement, el.parentElement?.parentElement].some(alvo => alvo && indicador(alvo))
      const nome = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || el.tagName).trim().slice(0, 40)
      return { visivel, nome: `${el.tagName.toLowerCase()} "${nome}"` }
    })
    if (info && !info.visivel) problemas.add(info.nome)
  }
  return [...problemas]
}

for (const aba of ['Home', 'Dieta', 'Treinar', 'Evolução', 'Configurar']) {
  test(`foco do teclado visível em ${aba}`, async () => {
    const { page, contexto } = await abrirApp()
    if (aba !== 'Home') await page.locator('nav.aether-nav').getByRole('button', { name: aba }).click()
    await page.waitForTimeout(600)
    assert.deepEqual(await focosInvisiveis(page), [])
    await contexto.close()
  })
}

test('botões e campos têm nome para leitor de tela', async () => {
  const { page, contexto } = await abrirApp()
  const semNome = []
  for (const aba of ['Home', 'Dieta', 'Treinar', 'Evolução', 'Configurar']) {
    await page.locator('nav.aether-nav').getByRole('button', { name: aba }).click()
    await page.waitForTimeout(700)
    semNome.push(...await page.evaluate(nomeAba => {
      const nome = el => (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') && document.getElementById(el.getAttribute('aria-labelledby'))?.textContent || el.textContent || el.getAttribute('title') || '').trim()
      const botoes = [...document.querySelectorAll('button, [role="button"], a[href]')].filter(el => el.getClientRects().length && !nome(el))
      const campos = [...document.querySelectorAll('input:not([type="hidden"]), select, textarea')].filter(el => {
        if (!el.getClientRects().length) return false
        return !(el.labels?.length || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('title'))
      })
      return [...botoes, ...campos].map(el => `${nomeAba}: <${el.tagName.toLowerCase()} class="${String(el.className).slice(0, 40)}">`)
    }, aba))
  }
  assert.deepEqual([...new Set(semNome)], [])
  await contexto.close()
})
