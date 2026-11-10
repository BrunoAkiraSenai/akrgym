// Checagem de contraste do laboratório: lista textos visíveis abaixo do mínimo
// WCAG AA (4,5:1; 3:1 para texto grande). Mistura fundos translúcidos e opacidade.
// Uso no console da página do lab:
//   await import('/tools/lab/contraste.js'); __contraste()
// Converte qualquer cor CSS (rgb, oklch, oklab, color-mix) para [r, g, b, a]
// desenhando um pixel num canvas.
const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
const cache = new Map()
const parse = (c) => {
  if (!c || c === 'transparent') return [0, 0, 0, 0]
  if (cache.has(c)) return cache.get(c)
  ctx.clearRect(0, 0, 1, 1)
  ctx.fillStyle = '#000'
  ctx.fillStyle = c
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
  const v = [r, g, b, a / 255]
  cache.set(c, v)
  return v
}
const lum = ([r, g, b]) => {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const blend = (top, bot) => {
  const a = top[3]
  return [top[0] * a + bot[0] * (1 - a), top[1] * a + bot[1] * (1 - a), top[2] * a + bot[2] * (1 - a), 1]
}
function fundo(el) {
  const camadas = []
  for (let p = el; p; p = p.parentElement) {
    const c = parse(getComputedStyle(p).backgroundColor)
    if (c && c[3] > 0) camadas.push(c)
    if (c && c[3] >= 1) break
  }
  const base = parse(getComputedStyle(document.documentElement).getPropertyValue('--bg-deep').trim() || '#fff')
  if (!camadas.length || camadas[camadas.length - 1][3] < 1) camadas.push(base)
  let r = camadas.pop()
  while (camadas.length) r = blend(camadas.pop(), r)
  return r
}

window.__contraste = function () {
  const saida = []
  const vistos = new Set()
  document.querySelectorAll('body *').forEach((el) => {
    const texto = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim()
    if (!texto) return
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) return
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden') return
    let op = 1
    for (let p = el; p; p = p.parentElement) op *= +getComputedStyle(p).opacity
    if (op === 0) return
    // Botão desativado não precisa de contraste mínimo (WCAG 1.4.3).
    if (el.closest('button:disabled, [aria-disabled="true"]')) return
    const bg = fundo(el)
    let fg = parse(cs.color)
    fg = blend([fg[0], fg[1], fg[2], fg[3] * op], bg)
    const l1 = lum(fg), l2 = lum(bg)
    const razao = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
    const tam = parseFloat(cs.fontSize), negrito = +cs.fontWeight >= 700
    const minimo = tam >= 24 || (tam >= 18.66 && negrito) ? 3 : 4.5
    if (razao >= minimo) return
    const chave = `${el.className}|${texto.slice(0, 25)}`
    if (vistos.has(chave)) return
    vistos.add(chave)
    const classe = String(el.className?.baseVal ?? el.className).split(' ').filter(Boolean).slice(0, 2).join('.')
    saida.push(`${razao.toFixed(2)} (mín ${minimo}) ${tam}px .${classe} "${texto.slice(0, 30)}" cor=${cs.color}`)
  })
  return saida.sort().join('\n') + `\nTOTAL ${saida.length}`
}

// Percorre as telas principais clicando na navegação (1º rótulo) e nas abas
// internas (demais rótulos), e junta o resultado. Ex.: await __varrer()
const TELAS = [[], ['Dieta'], ['Dieta', 'Estat'], ['Dieta', 'Amigos'], ['Treinar'], ['Evolu'], ['Evolu', 'Medidas'], ['Configurar'], ['Configurar', 'Dieta']]
const espera = (ms) => new Promise((r) => setTimeout(r, ms))
const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
function clicar(rotulo, dentro) {
  const alvo = [...document.querySelectorAll(`${dentro} button, ${dentro} [role="tab"]`)].find((b) => semAcento(b.textContent).startsWith(rotulo))
  if (!alvo) return false
  alvo.click()
  return true
}
window.__varrer = async function (telas = TELAS) {
  const partes = []
  for (const caminho of telas) {
    clicar('Home', 'nav')
    await espera(500)
    let ok = true
    for (const [i, rotulo] of caminho.entries()) {
      ok = clicar(rotulo, i === 0 ? 'nav' : 'main') && ok
      await espera(900)
    }
    partes.push(`## ${caminho.join(' > ') || 'Home'}${ok ? '' : ' (aba não encontrada)'}\n${window.__contraste()}`)
  }
  return partes.join('\n')
}
