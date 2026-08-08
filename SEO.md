# SEO e indexação do AkrGym

## URLs públicas

O site mantém a home do aplicativo em `/` e possui páginas públicas rastreáveis para os principais temas:

- `/treinos` — treino de academia, séries, repetições e progressão de cargas.
- `/dieta` — refeições, calorias e macronutrientes.
- `/progresso` — histórico, consistência, volume e evolução.

Cada página tem `<title>` e descrição próprios, canonical, `hreflang` `pt-BR`, Open Graph, conteúdo HTML visível, links internos e `WebPage` + `BreadcrumbList` em JSON-LD. As páginas protegidas pelo login continuam fora do sitemap; dados de usuários nunca são conteúdo público.

## Sitemap

O sitemap fica em [https://akrgym.web.app/sitemap.xml](https://akrgym.web.app/sitemap.xml), usa URLs absolutas em UTF-8 e lista somente páginas públicas canônicas. O `robots.txt` aponta para ele.

Depois de cada publicação relevante:

1. Abra o [Google Search Console](https://search.google.com/search-console).
2. Adicione/verifique a propriedade `https://akrgym.web.app/` usando a meta `google-site-verification` presente em `index.html`.
3. Em **Indexação → Sitemaps**, informe `sitemap.xml` e envie.
4. Use **Inspeção de URL** para solicitar rastreamento da home e das três páginas públicas.
5. Após alguns dias, confira **Indexação → Páginas** e **Desempenho → Resultados da pesquisa**. Enviar o sitemap ajuda a descoberta, mas não garante indexação imediata.

## Checklist de publicação

- `npm run lint`
- `npm run test:unit`
- `npm run build`
- Conferir HTTP 200 para `/`, `/treinos`, `/dieta`, `/progresso`, `/robots.txt` e `/sitemap.xml`.
- Conferir que cada página tem canonical próprio e que todas as URLs do sitemap são canônicas.
- Validar JSON-LD no [Rich Results Test](https://search.google.com/test/rich-results) e a renderização pela **Inspeção de URL**.

SEO não é promessa de posição: o Google recomenda conteúdo útil, títulos únicos, links rastreáveis, sitemap com URLs canônicas e páginas acessíveis. A frequência de rastreamento e a decisão de indexar dependem dos sistemas do Google.
