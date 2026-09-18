---
tipo: publicação
area: AkrGym
status: ativo
atualizado: 2026-09-08
date: 2026-09-08
type: area
tags: [area, seo, publication, akrgym]
ai-first: true
---

# SEO e publicação do AkrGym

## For future agent
This area note captures public URLs, sitemap/robots behavior and Search Console checks observed on 2026-09-08. Crawl and index status can change independently of the repository, so verify live responses before submitting requests.

## Endpoints públicos registrados

- Home: `https://akrgym.web.app/`
- Treinos: `https://akrgym.web.app/treinos`
- Dieta: `https://akrgym.web.app/dieta`
- Progresso: `https://akrgym.web.app/progresso`
- Robots: `https://akrgym.web.app/robots.txt`
- Sitemap: `https://akrgym.web.app/sitemap.xml`

## O que já foi feito

- `robots.txt` aponta para o sitemap.
- Sitemap XML usa namespace correto e lista páginas públicas.
- Páginas públicas receberam canonical e dados estruturados quando aplicável.
- Firebase Hosting entrega fallback SPA para rotas conhecidas.
- Checagem HTTP recente encontrou Home/rotas, robots, sitemap e manifest respondendo; o sitemap foi servido como XML.

## Atenções encontradas

- Uma rota inexistente pode retornar a Home por causa do fallback SPA (possível soft 404). Se páginas inexistentes forem indexadas, tratar com rota 404 real ou sinalização adequada.
- `lastmod` deve representar data real de alteração; não atualizar a data apenas para forçar rastreamento.
- Sitemap ajuda descoberta, mas não garante indexação nem remove a cota diária do Search Console.
- Aviso de “XML sem informação de estilo” no navegador é normal para um XML sem folha de estilo; o importante é o conteúdo e o status HTTP.
- CSP em modo report-only registra violações sem bloquear; revisar quando houver janela de segurança, especialmente embeds de Google/reCAPTCHA.

## Checklist para Search Console

- [ ] Verificar propriedade correta (domínio ou prefixo) e URL canônica.
- [ ] Abrir o sitemap diretamente e confirmar status 200, `Content-Type: application/xml` e XML bem formado.
- [ ] Enviar somente `sitemap.xml`, sem domínio duplicado no campo.
- [ ] Usar inspeção de URL para Home e páginas públicas prioritárias.
- [ ] Conferir cobertura, páginas excluídas, canonical escolhido e problemas de experiência.
- [ ] Aguardar rastreamento; não repetir solicitações continuamente quando a cota diária foi excedida.

[[AkrGym — Hub]] · [[Operação do AkrGym]] · [[AkrGym — Auditoria 2026-09-08]]
