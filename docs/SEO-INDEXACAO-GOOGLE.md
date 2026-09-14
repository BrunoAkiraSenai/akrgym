# AkrGym — auditoria de indexação e SEO técnico

**Data da auditoria:** 14/09/2026

**Ambiente de trabalho:** branch `QA`

**Site canônico observado:** `https://akrgym.web.app/`

## Resumo executivo

O sitemap publicado estava acessível no teste HTTP e era XML bem formado. Portanto, a frase do navegador “This XML file does not appear to have any style information associated with it” não significava que o sitemap estava quebrado: o visualizador apenas estava exibindo XML sem folha de estilo. Isso, porém, não prova que o Googlebot conseguiu buscar o arquivo nem que as páginas foram indexadas.

O código tinha problemas reais que poderiam criar ruído de rastreamento: `lastmod` antigo e fixo, URLs duplicadas com e sem barra/extensão, um rewrite amplo que entregava a Home com status 200 para caminhos inexistentes e um script que podia remover do `robots.txt` a linha `Sitemap`. A marcação `SoftwareApplication` também anunciava plataformas/preço sem base suficiente e não tinha avaliação/review exigido para ser elegível ao resultado rico de aplicativo.

As mudanças desta etapa em QA corrigem esses sinais, mantêm no sitemap apenas páginas públicas canônicas, acrescentam páginas próprias de apresentação e ajuda baseadas em funções existentes, e adicionam testes para evitar regressões. Nada foi publicado no site nem enviado ao Search Console.

## O que o Google documenta — e o que não promete

- Um sitemap ajuda o Google a descobrir URLs; não obriga o Google a rastrear ou indexar cada uma. O conteúdo listado deve ser canônico, absoluto e destinado aos resultados de busca. [Como criar e enviar um sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [visão geral de sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview)
- `lastmod` só é útil quando representa uma alteração significativa e real. O valor estático `2026-08-08` não era mantido junto às mudanças de conteúdo, então foi removido. É melhor omitir uma data que não conseguimos sustentar do que atualizá-la artificialmente a cada build. [Orientação do Google sobre `lastmod`](https://developers.google.com/search/blog/2023/06/sitemaps-lastmod-ping)
- “Couldn't fetch” é diferente de “página não indexada”: significa que o Search Console não conseguiu obter o arquivo naquela tentativa. As causas documentadas incluem URL incorreta/404, bloqueio no `robots.txt`, ação manual, indisponibilidade transitória e baixa demanda de rastreamento. O relatório do sitemap contém o diagnóstico da tentativa; para o arquivo, a documentação orienta conferir `Crawl allowed` e `Page fetch`. [Relatório de Sitemaps](https://support.google.com/webmasters/answer/7451001?hl=pt-BR)
- “Success” no relatório indica que o sitemap foi buscado e lido; as URLs entram numa fila, mas isso não garante que serão rastreadas ou indexadas. Para saber o estado de cada URL, use o relatório de indexação e a inspeção de URL. [Relatório de Sitemaps](https://support.google.com/webmasters/answer/7451001?hl=pt-BR), [Inspeção de URL](https://support.google.com/webmasters/answer/9012289?hl=pt-BR)
- A inspeção de URL tem limite diário por propriedade, sem uma quantidade fixa publicada na documentação. O pedido é uma solicitação de rastreamento, não uma ordem de indexação. O Google diz que pode levar dias ou uma ou duas semanas e que não há garantia de inclusão. Para várias páginas, sitemap é o mecanismo apropriado; repetir pedidos não força a decisão algorítmica. [Inspeção de URL](https://support.google.com/webmasters/answer/9012289?hl=pt-BR)
- A [Indexing API](https://developers.google.com/search/apis/indexing-api/v3/quickstart) do Google é destinada a páginas `JobPosting` e eventos de transmissão ao vivo elegíveis, não a um app fitness comum. Não é uma alternativa válida para contornar a cota de AkrGym.
- O Google consegue renderizar JavaScript, mas a renderização pode ocorrer depois da busca inicial. Páginas públicas com texto útil já no HTML reduzem a dependência de renderização. [SEO para JavaScript](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- Duas URLs com o mesmo conteúdo precisam de sinais coerentes: links internos, canonical e sitemap devem preferir a mesma URL. Redirecionamentos são sinais mais fortes que sitemap. [Consolidar URLs duplicadas](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- Uma URL inexistente que responde `200` com a Home pode ser classificada como *soft 404*. Uma resposta 404 real com página de erro útil é melhor para usuários e para o rastreador. [Erros de rastreamento e soft 404](https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors), [404 no Firebase Hosting](https://firebase.google.com/docs/hosting/full-config)
- Conteúdo de treino e alimentação pode influenciar decisões de saúde/bem-estar. O Google recomenda conteúdo útil, confiável, para pessoas, e alerta contra conteúdo feito em escala apenas para manipular resultados. Por isso não criamos páginas repetitivas para cada palavra-chave, recomendações clínicas, credenciais não verificadas nem avaliações inventadas. [Conteúdo útil e confiável](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- A marcação `SoftwareApplication` para resultado rico precisa de nome, preço/oferta e avaliação agregada ou review real. O AkrGym não tem reviews públicos confirmados e a presença/condições de distribuição nas plataformas declaradas não estavam demonstradas. A marcação foi removida; páginas continuam com `WebSite`, `WebPage` e `BreadcrumbList`, que descrevem o conteúdo sem alegar elegibilidade indevida. [Dados estruturados de aplicativo](https://developers.google.com/search/docs/appearance/structured-data/software-app)
- Para favicon nos resultados, a documentação do Google lista PNG e outros formatos raster, exige que o arquivo seja acessível e recomenda imagem quadrada com pelo menos 48 px. Como a Home só apontava para SVG, passei a apontar para o ícone PNG quadrado já usado pelo PWA. [Favicon nos resultados da Busca](https://developers.google.com/search/docs/appearance/favicon-in-search)

## Relatos da comunidade: úteis como pistas, não como regras

Os relatos abaixo não substituem documentação oficial e não demonstram a causa do caso AkrGym:

1. Em um tópico de maio de 2026, um site relatou “Couldn't fetch” embora conseguisse abrir o sitemap; a investigação narrada pelo autor associou o problema a uma regra de segurança Cloudflare que bloqueava rastreadores, e o tópico descreveu uma leitura bem-sucedida após a correção. É um exemplo de por que abrir no próprio navegador não testa o caminho do Googlebot. **Não é a infraestrutura do AkrGym:** o site público está no Firebase Hosting; o Worker Cloudflare separado atende a análise de refeições, não serve as páginas HTML/sitemap. [Relato na comunidade do Search Central](https://support.google.com/webmasters/thread/430994448/couldn-t-fetch-sitemap?hl=en)
2. Em outro tópico, especialistas de produto explicam que “Couldn't fetch” pode aparecer enquanto o sitemap ainda não foi processado e que ferramentas de teste têm diferenças em relação ao Googlebot real. Isso é uma hipótese possível para uma falha transitória, não uma razão para ignorar o diagnóstico atual do relatório. A documentação oficial continua sendo a referência para o estado da tentativa. [Discussão da comunidade](https://support.google.com/webmasters/thread/184533703/are-you-seeing-couldn-t-fetch-reported-for-your-sitemap?hl=en), [orientação oficial](https://support.google.com/webmasters/answer/7451001?hl=pt-BR)
3. Há relatos de usuários que viram cota excedida mesmo após tentarem uma única URL. Esses tópicos não revelam a regra interna nem provam que a cota do AkrGym ficou presa; só confirmam que a mensagem, isoladamente, não permite inferir quantos pedidos foram contabilizados. A documentação oficial confirma um limite diário por propriedade, mas não publica um número fixo. [Exemplo de relato](https://support.google.com/webmasters/thread/286318490/gsc-says-you-ve-exceeded-your-daily-quota-when-i-ve-only-requested-one-url?hl=en), [documentação da cota](https://support.google.com/webmasters/answer/9012289?hl=pt-BR)

## Auditoria do AkrGym

### Verificação do site público antes das mudanças de QA

Na consulta HTTP realizada durante esta auditoria:

| Recurso | Resultado observado |
| --- | --- |
| `https://akrgym.web.app/` | 200; HTML com canonical para a Home |
| `/robots.txt` | 200; texto permite rastreamento e lista o sitemap |
| `/sitemap.xml` | 200; `application/xml; charset=utf-8`; parseável como XML; 4 URLs |
| `/treinos`, `/dieta`, `/progresso` | 200; cada página tinha canonical correspondente |
| `/treinos/` e `/treinos.html` | 200 com o mesmo conteúdo de `/treinos` |
| caminho aleatório inexistente | 200 com o HTML da Home, devido ao rewrite `** -> /index.html` |
| `akrgym.firebaseapp.com` | também respondia; páginas apontavam canonical para `akrgym.web.app` |

Os dois primeiros hosts do Firebase são endereços do mesmo projeto. O canonical já escolhia `web.app`, então mantivemos essa escolha em links e sitemap. Para Search Console, a propriedade que corresponde a esse canonical é o prefixo exato `https://akrgym.web.app/`.

### Falhas corrigidas na branch QA

- Removidas as datas fixas antigas do sitemap; ele agora lista seis páginas HTML públicas reais e canônicas: Home, Treinos, Dieta, Progresso, Sobre e Ajuda.
- `robots.txt` continua permitindo rastreamento e apontando para `https://akrgym.web.app/sitemap.xml`. O gerador de ícones agora preserva essa linha quando for executado.
- Ativados `cleanUrls: true` e `trailingSlash: false` no Firebase Hosting. Os arquivos estáticos `*.html` passam a ter URL sem extensão, e aliases com `.html`/barra são normalizados pelo hosting. As regras manuais duplicadas e o rewrite curinga foram removidos.
- Adicionada página `404.html` informativa e `noindex`. Sem rewrite curinga, páginas ausentes podem produzir 404 em vez de fingirem ser a Home.
- Removido `SoftwareApplication` incompleto/inexato. Mantidos dados estruturados simples de site e página.
- Favicon principal passou para o PNG quadrado existente, suportado para exibição em resultados de busca.
- Adicionadas páginas públicas `Sobre` e `Ajuda`, ligadas pela Home, navegação e rodapés. Atualizado o texto da Dieta para refletir fibras, alimentos extras e cópia do resumo que existem no produto.
- Criados testes de regressão para canonicalização, sitemap, robots, JSON-LD, 404, rotas e correspondência entre recursos descritos e conteúdo.

## Como verificar corretamente no Search Console

Só faça estes passos depois de aprovar e publicar a versão em PRD. A URL de um canal de preview não é a propriedade canônica e não deve ser enviada para indexação:

1. Abra [Search Console](https://search.google.com/search-console/) e escolha a propriedade de prefixo `https://akrgym.web.app/`. A propriedade precisa ser exatamente compatível com o host/protocolo canonical; uma propriedade de outro host ou HTTP não representa esta URL. [Tipos de propriedade](https://support.google.com/webmasters/answer/34592?hl=pt-BR)
2. No relatório **Sitemaps**, adicione somente `sitemap.xml` (a URL final deve ser `https://akrgym.web.app/sitemap.xml`). Não adicione `.html`, uma URL de outro host, nem a página da Home como se fosse sitemap.
3. Abra a linha do sitemap e leia **Status**, **Última leitura**, **URLs descobertas** e o detalhe exato do erro. `Success` significa lido, não indexado.
4. Se aparecer `Couldn't fetch`, use a explicação daquela tentativa. Confira o mesmo URL completo, acesso sem login, `robots.txt`, HTTP, tipo de conteúdo e o teste ao vivo conforme o relatório. Se o navegador recebe 200 mas o teste do Google falha, precisamos do resultado do Search Console; o teste local não revela bloqueio específico para o crawler.
5. Em **Inspeção de URL**, inspecione cada página pública se necessário e compare URL declarada/canonical do Google. Veja o status no índice e a última busca. Dê atenção especial a “Descoberta — atualmente não indexada”, “Rastreada — atualmente não indexada”, “Soft 404”, “Página alternativa com canonical adequado” ou erros de acesso; cada um pede uma investigação diferente.
6. Não repita pedidos diários para todas as URLs. Corrija o problema, mantenha o sitemap atual e use pedido de indexação somente para uma página prioritária atualizada quando a cota permitir. As outras podem ser descobertas pelo sitemap e pelos links internos.
7. `site:akrgym.web.app` é uma checagem rápida de resultados visíveis, não um relatório completo de cobertura. A fonte para cobertura é a propriedade correta no Search Console.

## O que ainda não dá para afirmar

Não temos acesso nesta sessão à conta do Search Console. Portanto não foi possível validar propriedade, status do sitemap registrado, última requisição do Google, cobertura/indexação, ações manuais, problemas de segurança ou causa da mensagem de cota. Também não é possível saber por código se o Google já rastreou cada página. O HTML hospedado foi consultado; isso não equivale a um teste autenticado do Googlebot.

O sitemap resolve descoberta técnica, não autoridade nem demanda. As páginas novas são um começo de apresentação/ajuda, não uma promessa de ranking. Melhorias seguintes de alto valor seriam: publicar em domínio próprio controlado se fizer sentido; validar as páginas com usuários; completar informações de contato e políticas com dados reais; obter menções externas legítimas; acompanhar Core Web Vitals e relatório de indexação; e considerar renderização/pré-renderização do app apenas depois de medir se a Home continua insuficiente para descoberta via JavaScript.

## Fontes principais

- [Construir e enviar sitemap — Google Search Central](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Sitemaps — Search Console Help](https://support.google.com/webmasters/answer/7451001?hl=pt-BR)
- [Inspeção de URL — Search Console Help](https://support.google.com/webmasters/answer/9012289?hl=pt-BR)
- [SEO para JavaScript — Google Search Central](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Consolidar URLs duplicadas — Google Search Central](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Soft 404 e erros de rastreamento — Google Search Central](https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors)
- [Conteúdo útil e confiável — Google Search Central](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Dados estruturados SoftwareApplication — Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/software-app)
- [Favicons na Busca — Google Search Central](https://developers.google.com/search/docs/appearance/favicon-in-search)
- [Configuração completa — Firebase Hosting](https://firebase.google.com/docs/hosting/full-config)
- [Tipos de propriedade no Search Console](https://support.google.com/webmasters/answer/34592?hl=pt-BR)
- [Política/escopo da Indexing API](https://developers.google.com/search/apis/indexing-api/v3/quickstart)
