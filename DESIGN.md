---
name: AkrGym
description: App fitness para acompanhar treino, alimentação e evolução
colors:
  primary: "#318468"
  primary-bright: "#4ea485"
  accent: "#2f8796"
  highlight: "#cab070"
  background: "#050807"
  surface: "#0a120e"
  text-primary: "#ffffff"
  text-secondary: "#9ca3af"
  border-subtle: "rgba(255, 255, 255, 0.07)"
  success: "#34d399"
  warning: "#fbbf24"
  danger: "#f87171"
typography:
  display:
    fontFamily: "Archivo, Manrope, system-ui, sans-serif"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Manrope, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "16px"
    lineHeight: 1.7
  label:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
rounded:
  card-aether: "2.5rem"
  card-original: "1.5rem"
  button-aether: "3rem"
  button-original: "2rem"
  input-aether: "1.5rem"
  input-original: "1rem"
spacing:
  content-mobile: "1rem"
  content-small: "1.5rem"
  navigation-height: "4rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#0a0a0a"
    rounded: "{rounded.button-aether}"
    padding: "0.85rem 1.9rem"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card-aether}"
---

# Design System: AkrGym

## Overview

**Creative North Star: "Painel de Performance"**

AkrGym é uma ferramenta de uso recorrente para organizar treino, alimentação e evolução. A interface deve parecer um painel confiável para agir e acompanhar dados, não uma peça promocional de academia. Sua linguagem é precisa, motivadora e contida: a hierarquia e a legibilidade conduzem a experiência; o verde identifica ação e progresso.

O sistema parte de uma base escura e mobile-first, com superfícies em camadas e componentes arredondados. Os temas selecionáveis fazem parte do produto: use as variáveis semânticas já expostas e mantenha a mesma função de cada cor quando o tema mudar. Movimento e profundidade servem para comunicar estado; efeitos brilhantes não são decoração permanente.

**Key Characteristics:**
- Painel funcional para treino, alimentação e evolução.
- Verde esmeralda controlado como destaque do tema padrão.
- Componentes arredondados, claros e contidos.
- Camadas discretas; sombra estrutural e glow apenas em estados ativos.
- Navegação e conteúdo priorizam uso móvel.

## Colors

O tema padrão Esmeralda combina verdes dessaturados com neutros escuros; temas alternativos mudam os valores, mas preservam os papéis semânticos.

### Primary
- **Verde esmeralda controlado** (#318468; `--brand`): ação principal, seleção e progresso no tema padrão.
- **Verde de ação** (#4ea485; `--brand-bright`): realce de texto e estados ativos.

### Secondary
- **Ciano petróleo** (#2f8796; `--accent`): apoio pontual em gráficos e gradações da paleta; não compete com a ação principal.
- **Dourado suave** (#cab070; `--highlight`): destaque raro em valores importantes e identidade do tema.

### Neutral
- **Preto esverdeado** (#050807; `--bg-deep`): fundo principal do tema Esmeralda.
- **Superfície floresta** (#0a120e; `--bg-card-solid`): superfície opaca para conteúdo elevado.
- **Branco** (#ffffff; `--text-primary`): texto principal no tema escuro.
- **Cinza de leitura** (#9ca3af; `--text-secondary`): texto de apoio.
- **Borda translúcida** (`rgba(255, 255, 255, 0.07)`; `--border-subtle`): separação discreta entre superfícies.

### Named Rules
**The Semantic Theme Rule.** Componentes consomem `--brand`, `--accent`, `--highlight` e os papéis de superfície/texto; não fixam a cor Esmeralda em CSS local.

## Typography

**Display Font:** Archivo (com Manrope e sans-serif como fallback)  
**Body Font:** Manrope (com system-ui como fallback)  
**Label/Mono Font:** pilha monospace do sistema

**Character:** títulos fortes ajudam a localizar cada área; Manrope mantém leitura confortável em formulários, dados e registros longos. A interface deve preferir contraste tipográfico moderado, sem transformar cada métrica em uma chamada de marketing.

### Hierarchy
- **Display** (800, tamanho definido pelo componente, line-height 1.15): títulos principais de tela.
- **Headline** (700, escala local, line-height 1.3): cabeçalhos de grupos e seções.
- **Title** (600, escala local): títulos de cards e controles.
- **Body** (400–600, 16px base, line-height 1.7): instruções, registros e conteúdo.
- **Label** (600, 0.7rem observado, espaçamento ampliado quando em caixa alta): rótulos curtos e metadados.

## Layout

O shell central limita a largura em telas médias e largas e usa padding lateral de 1rem no celular, aumentando para 1.5rem em telas pequenas maiores. O conteúdo principal rola dentro do shell; a navegação primária fica ancorada na parte inferior no celular e respeita as safe areas. Em desktop, ela permanece dentro do contêiner central. As cinco áreas principais são Home, Dieta, Treinar, Evolução e Configurar.

Agrupe dados que respondem à mesma pergunta e mantenha a ação principal evidente. Não esconda conteúdo recém-adicionado abaixo da dobra sem feedback ou rolagem contextual. Em telas estreitas, preserve leitura e alvos de toque antes de preservar densidade.

## Elevation & Depth

O sistema usa uma camada de fundo, cards translúcidos e superfícies sólidas quando o conteúdo precisa de separação. Bordas de baixo contraste e diferença tonal definem os níveis; sombras devem explicar hierarquia, não ornamentar cada elemento. O desfoque é progressivo e deve ter fallback legível sem `backdrop-filter`.

**The Glow-on-Action Rule.** Glow aparece apenas em estados ativos ou feedbacks de ação. Cards em repouso, títulos e navegação não ficam com brilho ou bordas animadas continuamente.

## Shapes

O vocabulário é arredondado, sem misturar formas agressivamente. Os tokens legados variam por tema: cards 2.5rem e botões 3rem no estilo Aether; cards 1.5rem e botões 2rem no tema Original; campos 1.5rem ou 1rem, respectivamente. Ao refinar, reduza variações apenas de forma consistente entre telas; não introduza novos raios por componente sem necessidade.

## Components

### Buttons
- **Shape:** arredondada; o token de tema controla o raio.
- **Primary:** destaque semântico de `--brand`; texto contrastante; reservado à ação principal.
- **Hover / Focus:** feedback visível e curto, com foco por teclado explícito. Glow apenas no estado ativo.
- **Secondary / Ghost:** superfície neutra com borda discreta; não compete com a ação principal.

### Chips
- **Style:** compactos, com fundo tonal e rótulo legível.
- **State:** seleção e status não dependem apenas da cor; use texto ou ícone compreensível.

### Cards / Containers
- **Corner Style:** arredondado conforme o tema.
- **Background:** `--bg-card` para camada translúcida ou `--bg-card-solid` para conteúdo que precisa de opacidade.
- **Shadow Strategy:** sombra estrutural discreta; sem animação permanente de borda ou glow.
- **Internal Padding:** use a escala existente do contexto, agrupando informação relacionada.

### Inputs / Fields
- **Style:** fundo escuro, borda neutra e raio correspondente ao tema.
- **Focus:** borda ou anel de foco verde com contraste suficiente, sem depender de glow difuso.
- **Error / Disabled:** estado explícito e texto de recuperação próximo ao campo.

### Navigation
- Navegação inferior com rótulos visíveis e cinco destinos principais.
- A aba ativa usa a cor semântica do tema e `aria-current`; mantenha a mesma família de ícones e evite brilho decorativo nos ícones inativos.
- Preserve o espaço inferior do conteúdo e as safe areas do dispositivo.

## Do's and Don'ts

### Do:
- **Do** usar tokens semânticos para manter a troca de temas coerente.
- **Do** destacar uma ação principal por contexto e confirmar salvamentos, erros e carregamentos.
- **Do** manter a navegação mobile rotulada, acessível por teclado e com foco visível.
- **Do** preservar a edição manual como alternativa quando uma análise por IA falhar.
- **Do** comunicar estimativas nutricionais como estimativas, não como prescrição.

### Don't:
- **Don't** manter shimmer, partículas, bordas animadas ou glow decorativo em repouso.
- **Don't** misturar cores de acento sem papel semântico ou hard-code de um tema em componentes.
- **Don't** usar cor como único indicador de status.
- **Don't** inventar métricas, resultados, depoimentos ou alegações clínicas.
- **Don't** mudar rotas, rótulos de navegação ou fluxos de dados durante um refinamento visual sem aprovação.
