import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const root = new URL('..', import.meta.url)
const read = (file) => readFileSync(new URL(file, root), 'utf8')
const publicPages = ['treinos', 'dieta', 'progresso', 'sobre', 'ajuda']
const sitemapUrls = [
  'https://akrgym.web.app/',
  ...publicPages.map((page) => `https://akrgym.web.app/${page}`),
]

function getJsonLd(html) {
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
  assert.ok(match, 'a página deve incluir um bloco JSON-LD')
  return JSON.parse(match[1])
}

test('home publica metadados canônicos e dados estruturados válidos', () => {
  const html = read('index.html')
  assert.match(html, /<html lang="pt-BR">/)
  assert.match(html, /<title>AkrGym \| Treino, dieta e evolução em um só lugar<\/title>/)
  assert.match(html, /<meta name="description" content="[^"]+" \/>/)
  assert.match(html, /<meta name="robots" content="index, follow/)
  assert.match(html, /<link rel="canonical" href="https:\/\/akrgym\.web\.app\/" \/>/)
  assert.match(html, /<link rel="icon" type="image\/png" sizes="192x192" href="\/pwa-192x192\.png" \/>/)
  assert.match(html, /<meta name="google-site-verification" content="[^"]+" \/>/)
  assert.match(html, /<meta property="og:type" content="website" \/>/)

  const graph = getJsonLd(html)
  assert.ok(graph['@graph'].some((item) => item['@type'] === 'WebSite'))
  assert.ok(graph['@graph'].some((item) => item['@type'] === 'WebPage'))
  assert.ok(!graph['@graph'].some((item) => item['@type'] === 'SoftwareApplication'))
  for (const page of ['/sobre', '/ajuda']) assert.match(html, new RegExp(`href="${page}"`))
})

test('robots e sitemap listam somente URLs públicas canônicas e acessíveis', () => {
  const robots = read('public/robots.txt')
  const sitemap = read('public/sitemap.xml')
  const listedUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])

  assert.match(robots, /^User-agent: \*\r?\nAllow: \/\r?\n/m)
  assert.match(robots, /Sitemap: https:\/\/akrgym\.web\.app\/sitemap\.xml/)
  assert.deepEqual(listedUrls, sitemapUrls)
  assert.equal(new Set(listedUrls).size, listedUrls.length)
  assert.doesNotMatch(sitemap, /<lastmod>/)
  assert.doesNotMatch(sitemap, /\.html|\/$/m)

  const sitemapXml = read('scripts/gen-pwa-icons.cjs')
  assert.match(sitemapXml, /Sitemap: https:\/\/akrgym\.web\.app\/sitemap\.xml/)
})

test('páginas públicas têm canonical, navegação interna e JSON-LD válido', () => {
  const titles = new Set()
  const descriptions = new Set()
  for (const page of publicPages) {
    const html = read(`public/${page}.html`)
    assert.match(html, /<html lang="pt-BR">/)
    assert.match(html, new RegExp(`<link rel="canonical" href="https://akrgym\\.web\\.app/${page}"`))
    assert.match(html, /<link rel="icon" type="image\/png" sizes="192x192" href="\/pwa-192x192\.png" \/>/)
    assert.match(html, /<meta name="robots" content="index, follow/)
    assert.match(html, /<h1>[^<]+<\/h1>/)
    assert.match(html, /href="\/ajuda"/)
    assert.match(html, /href="\/sobre"/)
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1]
    const description = html.match(/<meta name="description" content="([^"]+)"/i)?.[1]
    assert.ok(title && title.length >= 20 && title.length <= 60)
    assert.ok(description && description.length >= 80 && description.length <= 160)
    assert.ok(!titles.has(title), `title deve ser exclusivo: ${title}`)
    assert.ok(!descriptions.has(description), `description deve ser exclusiva: ${description}`)
    titles.add(title)
    descriptions.add(description)
    const graph = getJsonLd(html)
    assert.ok(graph['@graph'].some((item) => item['@type'] === 'WebPage'))
    assert.ok(graph['@graph'].some((item) => item['@type'] === 'BreadcrumbList'))
  }

  const diet = read('public/dieta.html')
  assert.match(diet, /proteínas, carboidratos, gorduras e fibras/i)
  assert.match(diet, /alimentos extras/i)
  assert.match(diet, /estimativa/i)
  const progress = read('public/progresso.html')
  assert.match(progress, /Quatro dias ativos na janela equivalem ao score máximo/)
  const help = read('public/ajuda.html')
  assert.match(help, /Refeições puladas não entram como consumidas/)
})

test('Firebase usa URLs limpas e permite resposta 404 real para caminhos inexistentes', () => {
  const config = JSON.parse(read('firebase.json'))
  assert.equal(config.hosting.cleanUrls, true)
  assert.equal(config.hosting.trailingSlash, false)
  assert.equal(config.hosting.rewrites, undefined)
  const notFound = read('public/404.html')
  assert.match(notFound, /<meta name="robots" content="noindex, follow" \/>/)
  assert.match(notFound, /Não encontramos essa página/)
  assert.ok(!read('public/sitemap.xml').includes('/404'))
})
