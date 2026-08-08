import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url)
const read = (file) => readFileSync(new URL(file, root), 'utf8')

test('index HTML expõe sinais essenciais de indexação', () => {
  const html = read('index.html')
  assert.match(html, /<html lang="pt-BR">/)
  assert.match(html, /<title>AkrGym \| Treino, dieta e evolução em um só lugar<\/title>/)
  assert.match(html, /<meta name="description" content="[^"]+" \/>/)
  assert.match(html, /<meta name="robots" content="index, follow/)
  assert.match(html, /<link rel="canonical" href="https:\/\/akrgym\.web\.app\/" \/>/)
  assert.match(html, /<meta property="og:type" content="website" \/>/)
  assert.match(html, /<meta property="og:image" content="https:\/\/akrgym\.web\.app\/pwa-512x512\.png" \/>/)
  assert.match(html, /"@type": "SoftwareApplication"/)
  assert.match(html, /"featureList": \[/)
})

test('robots e sitemap apontam para a URL pública canônica', () => {
  const robots = read('public/robots.txt')
  const sitemap = read('public/sitemap.xml')
  assert.match(robots, /Sitemap: https:\/\/akrgym\.web\.app\/sitemap\.xml/)
  assert.match(sitemap, /<loc>https:\/\/akrgym\.web\.app\/\<\/loc>/)
  assert.match(sitemap, /<loc>https:\/\/akrgym\.web\.app\/treinos<\/loc>/)
  assert.match(sitemap, /<loc>https:\/\/akrgym\.web\.app\/dieta<\/loc>/)
  assert.match(sitemap, /<loc>https:\/\/akrgym\.web\.app\/progresso<\/loc>/)
  assert.match(sitemap, /<lastmod>2026-08-08<\/lastmod>/)
  assert.equal((sitemap.match(/<loc>/g) || []).length, 4)
})

test('public SEO pages expose canonical text and structured data', () => {
  for (const page of ['treinos', 'dieta', 'progresso']) {
    const html = read(`public/${page}.html`)
    assert.match(html, /<html lang="pt-BR">/)
    assert.match(html, new RegExp(`<link rel="canonical" href="https://akrgym\\.web\\.app/${page}"`))
    assert.match(html, /<meta name="robots" content="index, follow/)
    assert.match(html, /<h1>[^<]+<\/h1>/)
    assert.match(html, /"@type": "WebPage"/)
    assert.match(html, /"@type": "BreadcrumbList"/)
  }
})
