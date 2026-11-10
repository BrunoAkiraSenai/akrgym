// Abre o app do laboratório no Chrome instalado (sem baixar navegador).
import { chromium } from 'playwright-core'

export const LAB_URL = process.env.LAB_URL || 'http://127.0.0.1:5199'
export const UID = 'audit-user'

let navegador
export async function abrirNavegador() {
  navegador ??= await chromium.launch(process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH, headless: true }
    : { channel: 'chrome', headless: true })
  return navegador
}

export async function fecharNavegador() {
  await navegador?.close()
  navegador = undefined
}

// Página de celular (390 px) já carregada na cena pedida, com a Home ou o login prontos.
export async function abrirApp({ scene = 'normal', tema = 'esmeralda', largura = 390, altura = 844 } = {}) {
  const contexto = await (await abrirNavegador()).newContext({ viewport: { width: largura, height: altura }, locale: 'pt-BR' })
  const page = await contexto.newPage()
  const erros = []
  page.on('pageerror', erro => erros.push(erro.message))
  await page.goto(`${LAB_URL}/app?scene=${scene}&tema=${tema}`)
  await page.waitForFunction(() => !document.querySelector('.startup-splash'), null, { timeout: 30000 })
  return { page, contexto, erros }
}

export const navegar = (page, aba) => page.locator('nav.aether-nav').getByRole('button', { name: aba }).click()

// Lê um documento do "banco" falso do laboratório.
export const lerDoc = (page, caminho) => page.evaluate(c => structuredClone(window.__labDocs.get(c) ?? null), caminho)
export const listarDocs = (page, prefixo) => page.evaluate(p => [...window.__labDocs.keys()].filter(k => k.startsWith(p)), prefixo)
