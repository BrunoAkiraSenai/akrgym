# 📘 AkrGym — Documentação Técnica Completa

> Documentação viva, escrita para servir como referência única a qualquer pessoa que vá manter, estender, auditar ou migrar o projeto.

---

## 🧭 Índice Rápido

1. [Identidade do Projeto](#1-identidade-do-projeto)
2. [Visão Geral e Objetivos](#2-visão-geral-e-objetivos)
3. [Stack Tecnológica Completa](#3-stack-tecnológica-completa)
4. [Funcionalidades (Mapa de Recursos)](#4-funcionalidades-mapa-de-recursos)
5. [Telas do App (Tour Detalhado)](#5-telas-do-app-tour-detalhado)
6. [Arquitetura Geral](#6-arquitetura-geral)
7. [Estrutura de Pastas e Arquivos](#7-estrutura-de-pastas-e-arquivos)
8. [Configuração e Setup Local](#8-configuração-e-setup-local)
9. [Variáveis de Ambiente](#9-variáveis-de-ambiente)
10. [Firebase — Inicialização, Auth e Firestore](#10-firebase--inicialização-auth-e-firestore)
11. [Modelo de Dados (Schema do Firestore)](#11-modelo-de-dados-schema-do-firestore)
12. [Regras de Segurança do Firestore](#12-regras-de-segurança-do-firestore)
13. [Índices Compostos](#13-índices-compostos)
14. [Fluxo de Autenticação (com migração)](#14-fluxo-de-autenticação-com-migração)
15. [Sistema de Design "Aether Luxe"](#15-sistema-de-design-aether-luxe)
16. [Sistema de Temas Dinâmicos](#16-sistema-de-temas-dinâmicos)
17. [PWA — Manifesto, Service Worker e Cache Offline](#17-pwa--manifesto-service-worker-e-cache-offline)
18. [Integração com a IA Gemini](#18-integração-com-a-ia-gemini)
19. [Cloud Functions (legado / referência)](#19-cloud-functions-legado--referência)
20. [Capacitor (wrapper mobile)](#20-capacitor-wrapper-mobile)
21. [SEO, robots.txt e sitemap.xml](#21-seo-robotstxt-e-sitemapxml)
22. [Build, Bundle e Otimizações](#22-build-bundle-e-otimizações)
23. [Deploy (Hosting + Functions)](#23-deploy-hosting--functions)
24. [Preview Channels do Firebase Hosting](#24-preview-channels-do-firebase-hosting)
25. [Scripts Utilitários (Node)](#25-scripts-utilitários-node)
26. [Componentes — referência completa](#26-componentes--referência-completa)
27. [Páginas — comportamento detalhado](#27-páginas--comportamento-detalhado)
28. [Hooks e Contexto](#28-hooks-e-contexto)
29. [Tratamento de Erros, Loading e UX defensiva](#29-tratamento-de-erros-loading-e-ux-defensiva)
30. [Padrões e Convenções do Código](#30-padrões-e-convenções-do-código)
31. [Cache Persistente e Estratégia Offline](#31-cache-persistente-e-estratégia-offline)
32. [Performance, Acessibilidade e PWA checklist](#32-performance-acessibilidade-e-pwa-checklist)
33. [Limitações Conhecidas e Roadmap](#33-limitações-conhecidas-e-roadmap)
34. [FAQ de Manutenção](#34-faq-de-manutenção)
35. [Apêndice — Conteúdo de cada arquivo-fonte](#35-apêndice--conteúdo-de-cada-arquivo-fonte)
36. [Glossário](#36-glossário)
37. [Licença e Créditos](#37-licença-e-créditos)

---

## 1. Identidade do Projeto

| Campo | Valor |
|---|---|
| Nome | **AkrGym** |
| Autor | Bruno Akira Furumori |
| Categoria | Fitness / saúde pessoal (PWA) |
| Stack | React 19 + Vite 8 + Tailwind 4 + Firebase 12 + Gemini AI |
| URL de produção | https://akrgym.web.app |
| Repositório (origem) | https://github.com/BrunoAkiraSenai/akrgym |
| Idioma | Português (pt-BR) |
| Build version (meta) | 3.2 |
| Licença | MIT |
| Tipo de projeto | Pessoal, multiusuário, mobile-first, instalável (PWA) |

> O nome "Akr" vem de **Akira** (nome do autor) e a marca "Aether Luxe" é o sistema de design proprietário que dá identidade visual ao app.

---

## 2. Visão Geral e Objetivos

AkrGym é um **aplicativo pessoal de academia e nutrição** focado em simplicidade, beleza e rapidez. Os pilares do produto são:

- **Mobile-first PWA**: instala no celular, abre instantaneamente, funciona offline.
- **Multiusuário real**: cada conta tem seus próprios dados isolados por UID (Firestore Security Rules).
- **Treino com protocolo Top-Set / Back-Off** com regra especial para agachamento (barra olímpica / −10 %).
- **Diário alimentar flexível**: 4 refeições fixas + extras globais + análise por IA Gemini a partir de linguagem natural.
- **Auto-save e recuperação de rascunho** para treinos.
- **Evolução visual**: gráficos SVG/Canvas por exercício e por medida corporal.
- **Onboarding guiado** (3 opções: plano recomendado, do zero, ou copiar treino/dieta do criador).
- **Temas visuais intercambiáveis** (5 paletas) sem re-build.

### Personas

- **Usuário final**: pessoa que treina, quer registrar carga/reps/refeições rapidamente, visualizar evolução e manter streak.
- **Autor/operador**: Bruno Akira Furumori — mantém o app, ajusta rotinas padrão, publica deploys.

### Não-objetivos

- Não é rede social. Não há feed, seguidores ou compartilhamento.
- Não é coach virtual. A IA Gemini serve apenas para estimar macros a partir de uma descrição.
- Não há pagamento, planos ou sincronização com Apple Health / Google Fit.

---

## 3. Stack Tecnológica Completa

### Runtime

| Camada | Tecnologia | Versão | Função |
|---|---|---|---|
| UI | **React** | 19.2.6 | Renderização declarativa e hooks |
| Build tool | **Vite** | 8.0.12 | Dev server, build, HMR, PWA |
| Linguagem | JavaScript (ESM) | — | `.jsx` + `.js` |
| Estilização | **Tailwind CSS** | 4.3.0 | Utility-first + `@theme` para variáveis |
| Roteamento | Nenhum (rotas via `useState`) | — | 5 abas + on/offboard |
| Mobile wrapper | **Capacitor** | 8.3.4 | iOS / Android shell |
| Ícones | **lucide-react** | 1.17.0 | Ícones SVG consistentes |
| Backend BaaS | **Firebase** | 12.14.0 | Auth + Firestore + Hosting |
| Admin (scripts) | **firebase-admin** | 13.10.0 | Migração de dados |
| IA | **@google/generative-ai** | 0.24.1 | SDK direto do Gemini 2.5 Flash |
| Fonts | Inter (400-800) + Syne (600-800) | Google Fonts | Tipografia |
| PWA | **vite-plugin-pwa** (Workbox) | 1.3.0 | Service Worker + manifest |

### Dev

| Item | Versão | Uso |
|---|---|---|
| ESLint | 10.3 | Lint JS/JSX |
| `@eslint/js` | 10.0.1 | Regras recomendadas |
| `eslint-plugin-react-hooks` | 7.1.1 | Regras de hooks |
| `eslint-plugin-react-refresh` | 0.5.2 | Compat HMR |
| `globals` | 17.6 | Variáveis de ambiente do ESLint |
| `@types/react` | 19.2.14 | Tipos |
| `pngjs` | 7.0.0 | Manipulação de PNG nos scripts |

### Cloud Functions (legado)

| Item | Versão |
|---|---|
| `firebase-functions` | ^5.0.0 |
| `firebase-admin` | ^12.0.0 |
| `@google/generative-ai` | ^0.24.0 |

> ⚠️ O `functions/index.js` está **com a função comentada**. A chamada ao Gemini é feita hoje diretamente do frontend via SDK (`src/utils/gemini.js`). Mantida como referência para migração futura ao plano Blaze.

---

## 4. Funcionalidades (Mapa de Recursos)

### 🏠 Home / Dashboard
- Saudação dinâmica: "Bora treinar" + data por extenso.
- **Botão "Iniciar Treino do Dia"** que muda para a aba `treinar`.
- Card de **último treino** (nome + tempo relativo: Hoje / Ontem / há N dias).
- Card de **total de treinos** (contador cumulativo).
- **Heatmap semanal** (7 dias) com ponto brilhante (`glow-dot`) nos dias com treino.
- **Streak** (sequência de dias consecutivos) com barra de progresso até 7.
- Mensagem motivacional quando completa 7 dias.

### 🏋️ Execução de Treino (`Execucao.jsx`)
- 3 estados: `select` (escolher rotina) → `active` (executar) → salvamento → `home`.
- Lista rotinas de `users/{uid}/config/data.treinos`.
- Para cada exercício da rotina selecionada:
  - **Referência automática** baseada no último treino da mesma rotina (`anterior.carga_top` ou `ex.base_top`).
  - Mostra "últ. N reps" se houver histórico.
  - **Protocolo Top-Set / Back-Off**:
    - **Aquecimento** (opcional, 60 % da carga, exceto agachamento = barra olímpica × 10).
    - **Preparatória** (85 % da referência × 6 reps).
    - **Top Set** (input livre de carga + reps, objetivo = superar referência).
    - **Back-Off** (calculado: 90 % da carga de hoje se for agachamento, senão 85 %).
  - **Regra especial de agachamento**: `IsAgachamento` ou nome contém "agachamento" → back-off = `carga × 0.9` e aquecimento = barra × 10.
  - **Notas opcionais** (campo `nota` do exercício) são renderizadas em destaque laranja.
- **Auto-save com debounce 500 ms** em `localStorage` chave `rascunho_treino_{uid}`.
- **Recuperação automática** de rascunho ao reabrir a aba.
- **Busca de exercício** em tempo real (filtra lista por nome).
- **Confirmação modal** antes de salvar (efeito glow `card-complete-glow`).
- Validação: todos os exercícios precisam ter carga e reps > 0.
- Persistência: cria documento em `users/{uid}/historico_treinos/` com `rotina_id`, `data: new Date()`, `exercicios: [{nome, carga_top, reps_top}]`, `createdAt: serverTimestamp()`.

### 🥗 Diário Alimentar (`Dieta.jsx`)
- 2 abas: **Diário** e **Estatísticas**.
- **Diário**:
  - 4 refeições base (`Café`, `Almoço`, `Pré-Treino`, `Jantar`) — totalmente customizáveis.
  - Cada refeição tem `status`: `pendente`, `limpo`, `customizado`, `pulado`.
  - Ações: `Confirmar` (toggle), `Modificar` (edita macros), `Pular` (confirmação).
  - **Progresso de macros** com 4 barras (kcal, P, C, G) com gradiente dinâmico:
    - < 50 % → cinza
    - 50-74 % → cyan
    - 75-99 % → emerald claro
    - 100 %+ → gradient emerald→cyan
  - **Customizar refeição** = insere manualmente P/C/G e o sistema converte para kcal.
  - **Extras globais** (fora da dieta): adicionar, editar e remover. Cada um soma kcal/macros ao total.
  - **Análise por IA Gemini**: textarea → prompt com tabelas TACO/TBCA → preenche automaticamente o extra global.
  - **Rate-limit IA**: 3 s entre requisições + cache de 10 s para o mesmo texto.
  - **Toast** com auto-dismiss 5 s e botão **Desfazer** para a ação de "Confirmar refeição".
  - **Edição de dias passados** via `setDataAtiva(dataId)`.
- **Estatísticas**:
  - Cards com "Dias no mês" e "% Aderência".
  - Barras de **dias verdes / amarelos / vermelhos**:
    - 🟢 verde: todos clean (nenhuma pulada/customizada).
    - 🟡 amarelo: 1 pulada ou ≥ 1 customizada.
    - 🔴 vermelho: > 1 pulada OU refeição "livre".
  - **Heatmap mensal** clicável, com cores por kcal:
    - ≤ 2000 → verde translúcido
    - 2001-2250 → âmbar
    - > 2250 → vermelho
  - Navegação entre meses (limitada até o mês atual).

### 📈 Evolução (`Evolucao.jsx`)
- 2 abas: **Gráficos de Treino** e **Medidas Corporais**.
- **Gráficos de Treino**:
  - Select de exercício (populado com base no histórico real, em ordem alfabética).
  - Filtro por rotina (aparece se houver mais de 1 rotina).
  - Cards com: **Recorde Absoluto**, **Última Top Set**, **Próximo Objetivo** ("Subir Carga! 🔥" se atingiu o teto da meta_rep, senão "Buscar +1 Rep 🎯").
  - **Gráfico SVG responsivo** com `viewBox`, glow filter (`feGaussianBlur` + `feMerge`) e polilinha com gradiente do tema.
  - Pontos clicáveis com **tooltip** flutuante.
  - Lista dos últimos N registros + **"Carregar mais"** (paginada via `startAfter`).
- **Medidas Corporais**:
  - Campos: `peso`, `cintura`, `abdomen`, `braco_dir`, `peito`, `coxa_dir`.
  - Validação com ranges específicos (peso 0-500, cintura/abdomen 0-200, braço/coxa 0-100).
  - Edição e exclusão com confirmação.
  - **Último Registro** com diff vs penúltimo (setas ↑/↓/−).
  - **Comparação** com a primeira medida do período.
  - **Gráfico de tendência** em SVG, por medida escolhida.
  - **Tendência de peso** em Canvas (componente `TrendChart.jsx`).
  - **Filtro por período** (Semana / Mês / Tudo).
  - Paginação infinita por "Carregar mais medidas".

### ⚙️ Configurações (`Configuracao.jsx`)
- 2 abas: **Treinos** e **Dieta**.
- **Header com perfil**: avatar, e-mail (ou "Visitante" se anônimo), status ("Conta sincronizada" / "Conta anônima — sem sincronização"), UID truncado.
- **Seletor de tema** com 5 swatches (`Roxo Suave`, `Esmeralda`, `Oceano`, `Lava`, `Original`).
- **Treinos**:
  - Lista de divisões (rotinas) em accordion expansível.
  - Criar nova divisão: `key` (ID) + `nome` (rótulo).
  - Editar exercícios inline: `nome`, `base_top`, `meta_reps`.
  - Adicionar / excluir exercício e divisão.
  - Botão **Salvar Treinos** (valida todos os números antes de gravar).
- **Dieta**:
  - **Metas Diárias** (kcal, P, C, G) com auto-save debounced (600 ms).
  - Botão **Sincronizar com refeições** = soma automática de todos os macros das refeições para as metas.
  - Lista de refeições: editar nome, horário, alimentos, kcal, P, C, G.
  - **Botão Sparkles** por refeição → chama `calcularMacrosIA(textoAlimentos)` e preenche os macros.
  - Adicionar / excluir refeição.
  - Botão **Salvar Tudo**.
- **Sair da conta** (`signOut(auth)`).
- **Footer**: `AkrGym v3.2 · {ano}`.

### 🔐 Login (`Login.jsx`)
- 2 modos: `entrar` / `cadastrar`.
- **Botão "Continuar com Google"** (popup, com fallback para `signInWithRedirect` em casos de popup bloqueado).
- Formulário de e-mail + senha (≥ 6 caracteres) + confirmar senha (cadastro).
- Tradução de erros do Firebase em pt-BR.
- **Timeout de segurança de 15 s** para evitar loading infinito.
- **Migração automática** de dados anônimos ao criar conta permanente (`migrateAnonymousData`).

### 🪄 Onboarding Wizard (`OnboardingWizard.jsx`)
- 3 opções iniciais:
  1. **Plano Recomendado** (Opção A): wizard 3 etapas — `experiencia` (iniciante/intermediário/avançado) → `objetivo` (perder peso/ganhar massa/manter saúde) → `revisao` com totais e confirmação.
  2. **Começar do Zero** (Opção B): cria uma configuração vazia válida (`treinos`, `refeicoes` e `metas`) e marca `onboardingConcluido = true`.
  3. **Treino e Dieta do Akr** (Opção C): copia `PROTOCOLO_BASE` e `REFEICOES` do `config/`, sem dados pessoais.
- Cada template (`iniciante` / `intermediario` / `avançado`) traz 3 divisões (Upper A, Lower, Upper B) com exercícios e metarreps pré-definidas.
- Cada objetivo define metas calóricas e lista de refeições padrão.
- **Verificação inicial** (10 s timeout) — se já houver `onboardingConcluido` ou treinos, pula direto.

---

## 5. Telas do App (Tour Detalhado)

### Layout raiz (`Layout.jsx`)

Estrutura:

```
<div .flex flex-col h-full max-w-full md:max-w-2xl lg:max-w-4xl mx-auto relative>
  <AetherParticles />          ← 26 partículas animadas (CSS)
  <main overflow-y-auto pb-28> ← Conteúdo da página atual
    {children}
  </main>
  <nav aether-nav fixed bottom-0> ← 5 abas com indicador luminoso
    {5 botões com ícones Lucide}
  </nav>
</div>
```

- **Responsivo**: full-width no mobile, container 672 px (md) / 896 px (lg) no desktop, com `my-4` e altura `calc(100vh-2rem)`.
- **Safe-area**: `paddingTop: max(1.5rem, env(safe-area-inset-top, 1.5rem))` para iPhone com notch.
- **Indicador de aba ativa**: calculado via `offsetLeft` + `offsetWidth` e animado com `transform: translateX(...)`.
- **Tab order** (esquerda → direita): `home` → `dieta` → `treinar` → `evolucao` → `configurar`.
- **AetherParticles**: 26 partículas geradas em `useEffect` (após mount) com cores `gold`, `cyan`, `purple` e propriedades CSS customizadas (`--p-duration`, `--p-delay`, `--p-x`, `--p-y`).

### Transições de página (`PageTransition.jsx`)

- Detecta a direção (próxima aba está à direita ou à esquerda na `ordemTabs`).
- Aplica classe `fade-exit-active` (220 ms) → troca `children` → `fade-enter` (próximo frame) → `fade-enter-active`.
- Movimento horizontal de 28 px + `scale(0.97)` + `opacity: 0` durante a transição.

### ErrorBoundary

Captura qualquer erro de render e exibe tela minimalista com ícone `AlertTriangle`, mensagem curta e botão `Recarregar`. Detalhes técnicos só aparecem se a prop `mostrarDetalhes` for passada.

### ConfirmModal

Portal React, `fixed inset-0 z-50` com backdrop `bg-black/70 backdrop-blur-sm`. Scrolla para o centro do modal quando aberto. Botões "Cancelar" e "Confirmar" (gradient emerald→cyan).

---

## 6. Arquitetura Geral

### Diagrama lógico

```
┌──────────────────────────────────────────────────────────────────┐
│                          Browser / PWA                           │
│                                                                  │
│   ┌────────────┐  ┌──────────────────────────────────────────┐  │
│   │  index.html │  │  React App (src/)                       │  │
│   │  + manifest │  │                                          │  │
│   │  + sw.js    │  │  App.jsx                                │  │
│   └────────────┘  │    └─ AuthProvider (via UserContext)    │  │
│                   │    └─ Router (useState)                  │  │
│                   │    └─ Lazy pages                         │  │
│                   │       ├─ Home                           │  │
│                   │       ├─ Dieta (Gemini)                 │  │
│                   │       ├─ Execucao                       │  │
│                   │       ├─ Evolucao                       │  │
│                   │       ├─ Configuracao                   │  │
│   ┌────────────┐  │       └─ Login (quando !user)           │  │
│   │  service   │  │    └─ Layout (Aether nav + particles)   │  │
│   │  worker    │  │    └─ OnboardingWizard (primeiro uso)   │  │
│   │ (workbox)  │  │                                          │  │
│   └────────────┘  │  firebase.js  ───► init Firebase         │  │
│                   │  themes.js    ───► CSS vars runtime      │  │
│                   │  gemini.js    ───► SDK Gemini 2.5 Flash  │  │
│                   └──────────┬───────────────────────────────┘  │
└──────────────────────────────┼───────────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
   ┌────────────────┐                    ┌──────────────────┐
   │  Firebase      │                    │  Google Gemini   │
   │  - Auth        │                    │  (REST via SDK)  │
   │  - Firestore   │                    │  gemini-2.5-flash│
   │  - Hosting     │                    └──────────────────┘
   └────────────────┘
```

### Decisões arquiteturais

- **Sem React Router**: a navegação entre 5 telas é feita com `useState('activeTab')` em `App.jsx`. Justificativa: são poucas telas, todas equivalentes, e essa abordagem elimina dependência e simplifica transições.
- **Lazy loading** de todas as páginas via `React.lazy` + `<Suspense>`. Cada aba vira um chunk separado, com `key={uid}` para forçar remount entre usuários.
- **Firestore em modo offline-first**: `persistentLocalCache({ cacheSizeBytes: 104857600 })` — 100 MB de cache local para IndexedDB.
- **Cloud Function desativada**: chamadas de IA são feitas client-side para não exigir plano Blaze. O arquivo `functions/index.js` é mantido comentado como referência.
- **Sem Context API global de dados**: dados de cada página são carregados sob demanda via `useEffect` + `useCallback`. Reduz re-renders e mantém cada página desacoplada.
- **Auto-save granular**: cada página tem seu próprio padrão de save (localStorage para rascunho, debounce para config, explícito para treino).

---

## 7. Estrutura de Pastas e Arquivos

```
/home/akira/akrgym/akrgym/
├── .env                            ← VITE_GEMINI_API_KEY (NÃO versionado)
├── .env.example                    ← (sugestão — não presente, ver §9)
├── .gitignore
├── .firebase/                      ← cache do Firebase CLI
├── README.md
├── eslint.config.js
├── index.html                      ← HTML raiz, PWA, fontes, viewport
├── vite.config.js                  ← Vite + Tailwind + PWA + manualChunks
├── capacitor.config.json           ← Wrapper iOS/Android
├── firebase.json                   ← Hosting + Firestore rules/indexes + Functions
├── firestore.rules                 ← Regras de segurança (produção)
├── firestore.rules.suggested.txt   ← Mesmas regras com comentários extras
├── firestore.indexes.json          ← Índices compostos
├── package.json
├── package-lock.json
├── public/                         ← Assets estáticos servidos na raiz
│   ├── favicon.svg                 ← Logo SVG oficial
│   ├── icons.svg                   ← Conjunto de ícones auxiliares
│   ├── pwa-192x192.png             ← Ícone PWA
│   ├── pwa-512x512.png             ← Ícone PWA high-res
│   ├── apple-touch-icon.png        ← iOS home screen
│   ├── splash.png                  ← Tela de splash iOS
│   ├── robots.txt                  ← SEO
│   └── sitemap.xml                 ← SEO
├── fotos/                          ← Screenshots do README
│   ├── Home.png
│   ├── Dieta.png
│   ├── DietaCalendario.png
│   ├── Treino.png
│   ├── evolucao.png
│   ├── MedidasCorporais.png
│   ├── Configuracoes.png
│   └── Icone.png                   ← Fonte dos ícones PWA (gerados via script)
├── functions/                      ← Cloud Functions (legado)
│   ├── .gitignore
│   ├── package.json
│   ├── package-lock.json
│   └── index.js                    ← Função analisarRefeicao comentada
├── scripts/                        ← Scripts utilitários de manutenção
│   ├── gen-pwa-icons.cjs                  ← Gera PNGs minimalistas (legacy)
│   ├── gen-pwa-icons-from-icone.cjs       ← Gera ícones a partir de fotos/Icone.png
│   ├── migrarUsuarioId.js                 ← Migração interativa (uid em docs)
│   ├── migrarUsuarioId_auto.js            ← Migração totalmente automática
│   └── verificarUsuarioId.js              ← Auditoria: conta docs sem usuarioId
├── dist/                           ← Build de produção (gitignored)
└── src/
    ├── main.jsx                    ← Bootstrap React + applyStoredTheme()
    ├── App.jsx                     ← Orquestrador (auth, roteamento, lazy, onboarding)
    ├── firebase.js                 ← init Firebase + cache persistente
    ├── index.css                   ← Design system "Aether Luxe" (836 linhas)
    ├── config/
    │   ├── dieta.js                ← REFEICOES, METAS_DIARIAS, STATUS
    │   └── protocolo.js            ← PROTOCOLO_BASE (3 rotinas padrão)
    ├── context/
    │   └── UserContext.jsx         ← Context + hook useUser
    ├── utils/
    │   ├── gemini.js               ← calcularMacrosIA(texto)
    │   └── themes.js               ← 5 temas + applyTheme/applyStoredTheme/useTheme
    └── components/
        ├── Layout.jsx              ← Shell do app (nav, particles, container)
        ├── ConfirmModal.jsx        ← Modal de confirmação (portal)
        ├── ErrorBoundary.jsx       ← Captura de erros de render
        ├── OnboardingWizard.jsx    ← 3 opções iniciais de setup
        ├── PageTransition.jsx      ← Slide entre tabs
        ├── TrendChart.jsx          ← Gráfico Canvas para medidas
        └── pages/
            ├── Home.jsx
            ├── Login.jsx
            ├── Dieta.jsx
            ├── Execucao.jsx
            ├── Evolucao.jsx
            └── Configuracao.jsx
```

### Diretório pai `/home/akira/akrgym/`

- `akrgym/` — projeto React.
- `token/akrgym-service-account.json` — **NÃO versionado** (chave do Firebase Admin). Apontado pela variável `GOOGLE_APPLICATION_CREDENTIALS` no script `deploy` do `package.json`.
- `googlea578e0f3b4ce87e0.html` — arquivo de verificação do Google Search Console.

---

## 8. Configuração e Setup Local

### Pré-requisitos

- Node.js ≥ 18 (Vite 8 + ESLint 10 exigem Node recente).
- NPM 9+ ou PNPM/Yarn equivalentes.
- Conta Firebase com projeto `akrgym` ativo.
- Chave de API do Google AI Studio (Gemini).

### Passos

```bash
git clone https://github.com/BrunoAkiraSenai/akrgym.git
cd akrgym
npm install
cp .env.example .env   # crie manualmente se não existir
# editar .env:
#   VITE_GEMINI_API_KEY=coloque-sua-chave-aqui
npm run dev
```

### Scripts NPM

| Script | Comando | O que faz |
|---|---|---|
| `dev` | `vite` | Sobe dev-server com HMR (porta 5173 padrão) |
| `build` | `vite build` | Gera bundle de produção em `dist/` |
| `preview` | `vite preview` | Serve `dist/` localmente para teste |
| `lint` | `eslint .` | Roda ESLint no projeto todo |
| `test` | `npm run test:unit` | Executa os testes unitários puros |
| `test:unit` | `node --test tests/*.unit.spec.js` | Valida regras de cálculo e sanitização sem serviços externos |
| `test:rules` | `firebase emulators:exec --only firestore ...` | Executa os testes das regras no emulador Firestore (Java 17+) |
| `deploy` | `npm run build && GOOGLE_APPLICATION_CREDENTIALS=token/akrgym-service-account.json firebase deploy --only hosting --project akrgym` | Build + deploy apenas de hosting (sem functions) |

> ⚠️ `token/akrgym-service-account.json` é local e ignorado pelo Git. Em outro ambiente, crie essa credencial localmente ou use `firebase login` + `firebase use akrgym` antes do deploy.

### ESLint

`eslint.config.js` (formato flat config) com:
- `@eslint/js` — regras recomendadas.
- `eslint-plugin-react-hooks` — `recommended` (declarado em `reactHooks.configs.flat.recommended`).
- `eslint-plugin-react-refresh` — `vite` (HMR-safe).
- `globals.browser` + `parserOptions.ecmaFeatures.jsx`.
- Ignora a pasta `dist/`.

---

## 9. Variáveis de Ambiente

### `.env` (raiz do projeto)

| Nome | Tipo | Descrição | Obrigatório? |
|---|---|---|---|
| `VITE_GEMINI_API_KEY` | string | Chave de API do Gemini (Google AI Studio). Lida por `import.meta.env.VITE_GEMINI_API_KEY` no bundle. | Sim (funcionalidade de IA) |
| `VITE_APP_VERSION` | string | Versão exibida no rodapé de Configurações (default `'3.1'`). | Opcional |

> O `.env` está no `.gitignore`. A chave **não é commitada**. O `.env.example` não existe no repo — quem clonar precisa criar manualmente.

### Como o Gemini resolve a chave

Em `src/utils/gemini.js:6`:

```js
const key = localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY
```

> Existe um **hook futuro**: o usuário pode colar a própria chave em Configurações (campo ainda não implementado na UI; a chave `gemini_api_key` no `localStorage` está reservada).

---

## 10. Firebase — Inicialização, Auth e Firestore

### `src/firebase.js`

```js
const firebaseConfig = {
  apiKey: 'AIzaSyAWbQiEKYrAFEgjjcYvSpxXD9dcwslqLgk',
  authDomain: 'akrgym.firebaseapp.com',
  projectId: 'akrgym',
  storageBucket: 'akrgym.firebasestorage.app',
  messagingSenderId: '272661727889',
  appId: '1:272661727889:web:532c4b51c35afa28d64d30',
  measurementId: 'G-3B3R4JL7TH',
}

const app = initializeApp(firebaseConfig)

let db
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ cacheSizeBytes: 104857600 }),
  })
} catch (e) {
  console.warn('Cache persistente não disponível, usando fallback:', e.message)
  db = getFirestore(app)
}

export { db }
export const auth = getAuth(app)
export const provider = new GoogleAuthProvider()
provider.setCustomParameters({ prompt: 'select_account consent' })
```

Pontos:

- **Cache persistente IndexedDB de 100 MB** — armazena documentos para uso offline e abre a UI instantaneamente.
- **Fallback automático** para `getFirestore(app)` se o cache persistente não for suportado (browsers antigos, modo anônimo restrito).
- **GoogleAuthProvider com `select_account consent`** — sempre mostra o seletor de contas do Google.

### Auth

- `auth.currentUser.isAnonymous` distingue usuário anônimo de registrado.
- No `App.jsx`, `onAuthStateChanged` decide o que renderizar:
  1. **Sem usuário** → tenta `signInAnonymously`. Se desabilitado, cai na tela de Login.
  2. **Com usuário** → `ensureUserConfig(uid)` (cria doc de config se não existir) → entra no app.
- O `prevUidRef` (no `App.jsx`) detecta troca de conta e reseta o estado da UI.

### Firestore

- Inicializado com `localCache: persistentLocalCache(...)`.
- Todas as queries da aplicação são feitas via SDK modular (`getDoc`, `getDocs`, `addDoc`, `setDoc`, `updateDoc`, `deleteDoc`, `query`, `where`, `orderBy`, `limit`, `startAfter`).
- **Sem uso de `onSnapshot`** em runtime — o app é majoritariamente **pull-on-demand** (carrega ao abrir cada aba). Isso simplifica permissões e reduz custos de leitura contínua.

---

## 11. Modelo de Dados (Schema do Firestore)

Caminho raiz: `users/{uid}/`

### Documento `config/data` (singleton por usuário)

```jsonc
{
  "onboardingConcluido": true,            // boolean
  "criadoEm": "2024-01-01T12:00:00.000Z",  // string ISO (criado em ensureUserConfig)
  "treinos": {                            // map<id, Rotina>
    "upper_a": {
      "nome": "💥 UPPER A",
      "exercicios": [
        {
          "nome": "Supino Inclinado Halter",
          "base_top": 26,                 // carga de referência inicial (kg)
          "meta_reps": "7",               // string ("7", "6-8", "8-10")
          "tem_aquecimento": true,        // bool — se faz série de aquecimento
          "IsAgachamento": false,         // bool — flag para regra especial
          "nota": "👉 Descida lenta..."   // string opcional
        }
      ]
    },
    "lower": { "...": "..." },
    "upper_b": { "...": "..." }
  },
  "refeicoes": [                          // array<Refeicao>
    {
      "id": "cafe",                       // string estável
      "nome": "Café da Manhã",
      "horario": "08:30",
      "alimentos": ["3 Ovos", "2 fatias Pão Integral", "30g Aveia"],
      "kcal": 460,
      "proteinas": 29,
      "carboidratos": 42,
      "gorduras": 19
    }
  ],
  "metas": {
    "kcal": 1970,
    "proteinas": 165,
    "carboidratos": 226,
    "gorduras": 43
  }
}
```

Regras de validação no cliente (em `Configuracao.jsx`):

- `kcal` ∈ [0, 99999]
- `proteinas/carboidratos/gorduras` ∈ [0, 9999]
- `base_top` ∈ [0, 9999]

Regras no servidor (`firestore.rules`):

- Exige que `metas`, `refeicoes` e `treinos` existam em qualquer `write`.

### Coleção `historico_treinos/{docId}`

```jsonc
{
  "rotina_id": "upper_a",                 // FK para treinos[key]
  "data": <Timestamp>,                    // Date do Firestore (serverTimestamp ou new Date() no client)
  "createdAt": <Timestamp>,               // serverTimestamp()
  "exercicios": [
    { "nome": "Supino Inclinado Halter", "carga_top": 28, "reps_top": 7 },
    { "nome": "Remada Curvada Barra", "carga_top": 60, "reps_top": 8 }
  ],
  "usuarioId": "abc123"                   // preenchido via script de migração
}
```

Regras: `update` é **bloqueado** (`allow update: if false`). Apenas `create` e `delete`. Histórico é imutável.

### Coleção `diario_dieta/{YYYY-MM-DD}`

`docId` é a data no formato ISO local (`hojeId()` retorna `YYYY-MM-DD` considerando timezone do usuário).

```jsonc
{
  "data": "2025-01-15",                   // string YYYY-MM-DD
  "updatedAt": <Timestamp>,               // serverTimestamp()
  "refeicoes": {                          // map<id, RefeicaoStatus>
    "cafe": {
      "status": "limpo",                  // pendente | limpo | customizado | pulado | livre
      "substituto": null,                 // { proteinas, carboidratos, gorduras, nome } | null
      "extra": []                         // extras individuais desta refeição
    },
    "almoco": {
      "status": "customizado",
      "substituto": { "nome": "Tofu", "proteinas": 30, "carboidratos": 20, "gorduras": 10 },
      "extra": []
    },
    "pre_treino": { "status": "pulado", "substituto": null, "extra": [] },
    "jantar": { "status": "limpo", "substituto": null, "extra": [] }
  },
  "extras_globais": [                     // fora da dieta
    { "nome": "Sorvete", "kcal": 200, "proteinas": 4, "carboidratos": 28, "gorduras": 9 }
  ],
  "usuarioId": "abc123"
}
```

### Coleção `historico_corporal/{docId}`

```jsonc
{
  "data": <Timestamp>,                    // new Date(YYYY-MM-DD + 'T12:00:00')
  "createdAt": <Timestamp>,
  "updatedAt": <Timestamp>,               // apenas se foi editado
  "peso": 75.5,                           // kg
  "cintura": 82.0,                        // cm
  "abdomen": 85.0,                        // cm
  "braco_dir": 36.5,                      // cm
  "peito": 100.0,                         // cm
  "coxa_dir": 58.0,                       // cm
  "usuarioId": "abc123"
}
```

Ranges validados no client: `peso` [0, 500], `cintura/abdomen/peito` [0, 200], `braco_dir/coxa_dir` [0, 100].

---

## 12. Regras de Segurança do Firestore

`firestore.rules` (versão produção):

```js
rules_version = '2'
service cloud.firestore {
  match /databases/{database}/documents {

    match /{document=**} {
      allow read, write: if false;        // DENY por padrão
    }

    // Hierarquia /users/{userId}/...
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Config: campos obrigatórios em write
    match /users/{userId}/config/data {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null
                   && request.auth.uid == userId
                   && request.resource.data.keys().hasAll(['metas', 'refeicoes', 'treinos']);
    }

    // Histórico de treinos: append-only
    match /users/{userId}/historico_treinos/{docId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null
                    && request.auth.uid == userId
                    && request.resource.data.keys().hasAll(['rotina_id', 'data', 'exercicios']);
      allow delete: if request.auth != null && request.auth.uid == userId;
      allow update: if false;
    }

    // Diário alimentar
    match /users/{userId}/diario_dieta/{docId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null
                   && request.auth.uid == userId
                   && request.resource.data.keys().hasAny(['refeicoes', 'data', 'extras_globais']);
    }

    // Histórico corporal
    match /users/{userId}/historico_corporal/{docId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null
                   && request.auth.uid == userId
                   && request.resource.data.keys().hasAny(['peso', 'data']);
    }
  }
}
```

> O arquivo `firestore.rules.suggested.txt` é idêntico, mas com comentários estendidos e referência ao deploy. Foi mantido como referência de leitura.

### Como aplicar mudanças

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

---

## 13. Índices Compostos

`firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "historico_treinos",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "rotina_id", "order": "ASCENDING" },
        { "fieldPath": "data", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "diario_dieta",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "data", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

- `historico_treinos(rotina_id ASC, data DESC)` — usado em `Execucao.jsx` para buscar o último treino de uma rotina.
- `diario_dieta(data ASC)` — usado em `Dieta.jsx` (PainelEstatisticas) para queries por intervalo mensal.

---

## 14. Fluxo de Autenticação (com migração)

### Diagrama de sequência

```
Usuário abre app
   │
   ▼
onAuthStateChanged
   │
   ├── (user = null)
   │     ├── signInAnonymously  ─── ok ──┐
   │     │                                ▼
   │     │                       setUser(anonUser)
   │     │                                │
   │     │                                ▼
   │     │                       ensureUserConfig(uid)  (cria config/data se não existe)
   │     │                                │
   │     │                                ▼
   │     │                       Renderiza app (Anônimo)
   │     │
   │     └── falhou (auth/operation-not-allowed)
   │             └── Renderiza <Login />
   │
   └── (user != null)
         ├── if prevUid !== currentUid  → resetUIState()
         ├── ensureUserConfig(uid)
         └── Renderiza app
```

### Migração anônimo → conta permanente

Em `Login.jsx`, antes de chamar `signInWithEmailAndPassword` / `createUserWithEmailAndPassword` / `signInWithPopup`:

```js
const anonymousUid = auth.currentUser?.isAnonymous ? auth.currentUser.uid : null
const result = await signInWithEmailAndPassword(...)
if (anonymousUid && result.user.uid !== anonymousUid) {
  await migrateAnonymousData(anonymousUid, result.user.uid)
}
```

`migrateAnonymousData(anonymousUid, newUid)`:

1. Lê `users/{anonUid}/historico_treinos`, `diario_dieta`, `historico_corporal`.
2. Lê `users/{anonUid}/config/data`.
3. Escreve em batches de 400 (`writeBatch`) em `users/{newUid}/...`.
4. Após o login, o `onAuthStateChanged` já cuida do resto (`ensureUserConfig`, renderizar app).

### Login Google

`signInWithGoogle()` em `Login.jsx:125`:

1. Tenta `signInWithPopup`.
2. Em caso de popup bloqueado ou ambiente sem suporte (`auth/popup-blocked`, `auth/cannot-create-iframe`, `auth/operation-not-supported-in-this-environment`), faz fallback para `signInWithRedirect`.
3. `getRedirectResult(auth)` é processado em `useEffect` na montagem do componente.

### Timeout de segurança

`useEffect` em `Login.jsx:52-56`:

```js
useEffect(() => {
  if (!loading) return
  const t = setTimeout(() => setLoading(false), 15000)
  return () => clearTimeout(t)
}, [loading])
```

Garante que o botão de loading nunca trava para sempre (15 s).

---

## 15. Sistema de Design "Aether Luxe"

O design system é definido em `src/index.css` (836 linhas) e complementado por classes utilitárias do Tailwind 4.

### Filosofia visual

- **Dark mode fixo** (`#07050c` como base).
- **Profundidade em camadas**: gradientes radiais no `body::before`, grid sutil no `body::after`, partículas animadas.
- **Glassmorphism**: `backdrop-blur-md` + `bg-neutral-900/50` + `border border-white/5`.
- **Glow controlado**: sombras com `rgba(var(--brand-rgb), 0.28)`, `drop-shadow-[0_0_8px_rgba(...)]` em ícones ativos.
- **Tipografia**:
  - Display: **Syne** 600/700/800 — títulos e CTAs.
  - Body: **Inter** 400/500/600/700/800 — textos corridos.
- **Animações com easing customizado**: `--ease-aether: cubic-bezier(0.2, 0.9, 0.4, 1.1)`.

### Camadas visuais (em ordem Z)

| Camada | z-index | Descrição |
|---|---|---|
| Fundo orbital | `-3` | Gradientes radiais com `animation: aether-orbit 24s` |
| Grid sutil | `-2` | `body::after` com `mask-image: radial-gradient(...)` |
| Partículas | `-1` | 26 partículas, `position: absolute` dentro de `.aether-particles` |
| Conteúdo | `0` | Main scrollable |
| Toast | `50` | `fixed bottom-24` |
| Modal | `50` | `fixed inset-0` via portal |
| Nav inferior | `50` | `fixed bottom-0` com indicador luminoso |

### Componentes utilitários (`.index.css`)

| Classe | Função |
|---|---|
| `.card-premium` | Card base com borda sutil, blur, raio `2.5rem`. |
| `.btn-primary` | Botão principal com gradient animado (highlight → brand → accent). |
| `.btn-secondary` | Botão secundário com borda translúcida. |
| `.btn-danger` | Botão de perigo (vermelho, usado em exclusão). |
| `.skeleton`, `.skeleton-card`, `.skeleton-circle`, `.skeleton-title` | Estados de carregamento. |
| `.tab-active` | Aba selecionada (gradient + text neon). |
| `.transition-page` | Container de transição entre páginas. |
| `.fade-enter`, `.fade-exit-active`, `.fade-enter-active` | Estados da animação de página. |
| `.card-complete-glow` | Pulso visual quando uma ação é concluída (treino/refeição). |
| `.glow-dot` | Brilho em pontos do heatmap semanal. |
| `.aether-nav` | Container da nav inferior com gradient sutil. |
| `.aether-nav-indicator` | Indicador luminoso (a barra que segue a aba ativa). |
| `.aether-tab` | Cada botão da nav. |
| `.aether-tab-label` | Label da aba. |
| `.aether-particles`, `.aether-particle` | Partículas animadas. |
| `.icon-hover` | Micro-animação de hover para ícones. |
| `.theme-swatch`, `.theme-swatch-dots`, `.theme-swatch-dot` | Seletor visual de tema. |
| `.scrollbar-thin` | Scroll customizado (fino, translúcido). |

### Variáveis CSS principais (em `:root`)

```css
:root {
  --brand-50 ... --brand-900;       /* cor primária (10 tons) */
  --accent-50 ... --accent-900;     /* cor secundária (10 tons) */

  --brand: #8b78b3;
  --brand-bright: #a896c8;
  --brand-rgb: 139, 120, 179;

  --accent: #7076a8;
  --accent-rgb: 112, 118, 168;

  --accent2: #7c6ba8;
  --highlight: #b56bb5;

  --emerald: var(--brand);
  --cyan: var(--accent);
  --gold: var(--highlight);

  --bg-deep: #07050c;
  --bg-card: rgba(16, 12, 26, 0.55);

  --gradient-primary, --gradient-aether, --gradient-gold-emerald,
  --gradient-premium-btn, --gradient-border-animated, --gradient-fire;

  --text-primary: #ffffff;
  --text-secondary: #a89db5;

  --shadow-sm, --shadow-md, --shadow-lg, --shadow-glow,
  --shadow-glow-gold, --shadow-glow-cyan;

  --ease-aether: cubic-bezier(0.2, 0.9, 0.4, 1.1);
  --transition-fast/base/slow;

  --radius-card: 2.5rem;
  --radius-button: 3rem;
  --radius-input: 1.5rem;
}
```

> Os valores de `--brand-*`, `--accent-*`, `--bg-deep`, `--bg-card` e `--text-secondary` são **sobrescritos em runtime** pelo `applyTheme()` em `src/utils/themes.js`.

### Tailwind 4 `@theme` override

`@theme` em `index.css` remapeia as cores do Tailwind para usar as variáveis CSS:

```css
@theme {
  --color-emerald-50: var(--brand-50);
  ...
  --color-emerald-900: var(--brand-900);
  --color-cyan-50: var(--accent-50);
  ...
  --color-cyan-900: var(--accent-900);
}
```

Dessa forma, classes como `bg-emerald-500`, `text-cyan-400` e `border-emerald-500/30` **mudam dinamicamente** com o tema.

---

## 16. Sistema de Temas Dinâmicos

`src/utils/themes.js` (234 linhas).

### Temas disponíveis

| ID | Nome | Emoji | Brand | Accent | Highlight | BG Deep |
|---|---|---|---|---|---|---|
| `roxo-suave` | Roxo Suave | 🟣 | Roxo (desaturado) | Indigo (desaturado) | Rosa (desaturado) | `#07050c` |
| `esmeralda` | Esmeralda | 🟢 | Emerald (desaturado) | Cyan (desaturado) | Dourado (desaturado) | `#050807` |
| `oceano` | Oceano | 🔵 | Blue (desaturado) | Sky (desaturado) | Teal (desaturado) | `#050709` |
| `lava` | Claro | 🟠 | Orange (desaturado) | Red (desaturado) | Âmbar (desaturado) | `#f4f5f3` |
| `original` | Escuro | 🎯 | Emerald (vivo) | Cyan (vivo) | Laranja (vivo) | `#050505` |

Os temas escuros passam por uma função `desaturate(hex, 0.45, 0.04)` que remove ~45 % da saturação e escurece levemente. O tema `lava` é a variação clara, com superfícies porcelana e texto café escuro.

### Função `themeToVars(theme)`

Converte um tema em um dicionário de CSS variables:

```js
vars['--brand'] = theme.brand[500]
vars['--brand-bright'] = theme.brand[400]
vars['--brand-rgb'] = hexToRgb(theme.brand[500])
vars['--accent'] = theme.accent[500]
// ... etc para todas as 10 shades, --bg-deep, --bg-card, --text-secondary
```

### `applyTheme(themeId)`

1. Encontra o tema (ou cai no primeiro).
2. Calcula as vars.
3. Itera `documentElement.style.setProperty(key, value)` para cada var.
4. Define `data-theme={id}` em `<html>`.
5. Persiste em `localStorage['akrgym-theme']`.
6. Dispara `window.dispatchEvent(new CustomEvent('themechange', { detail: themeId }))`.

### `applyStoredTheme()`

Lê `localStorage['akrgym-theme']` (ou usa o primeiro tema como default) e aplica.

É chamado em `src/main.jsx:7` **antes** do `createRoot`, evitando flash de tema errado.

### Hooks

- `useTheme()` — retorna `[themeId, applyTheme]`. Sincroniza via `themechange` event.
- `useThemeColor(varName)` — observa mudanças da var CSS específica e re-renderiza quando ela muda. Usado em `Evolucao.jsx` para colorir gráficos dinamicamente.

### Onde o tema é aplicado

- `src/index.css` (`:root` define defaults que são sobrescritos).
- `Configuracao.jsx` — UI de seleção (`<div className="grid grid-cols-3 sm:grid-cols-5 gap-2">`).
- `Evolucao.jsx` — usa `useThemeColor` para que a cor do gráfico mude em tempo real.
- `Body::before` e `body::after` — gradientes e grid que usam `var(--brand-rgb)` etc.
- Todas as partículas (`--brand-rgb`, `--accent-rgb`, `--highlight-rgb`).
- Cards `.card-premium`, botões `.btn-primary`, abas `.tab-active` — todos consomem `var(--brand)` / `var(--gradient-premium-btn)`.

---

## 17. PWA — Manifesto, Service Worker e Cache Offline

### Manifesto (`vite.config.js`)

```js
manifest: {
  name: 'AkrGym - Seu Treino e Dieta',
  short_name: 'AkrGym',
  description: 'Acompanhe treinos, dieta e evolução com IA',
  theme_color: '#06080f',
  background_color: '#06080f',
  display: 'standalone',
  orientation: 'portrait',
  scope: '/',
  start_url: '/',
  icons: [
    { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
    { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png', purpose: 'apple touch icon' },
  ],
}
```

### iOS / Apple

Em `index.html`:

```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="AkrGym" />
<meta name="apple-touch-fullscreen" content="yes" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="apple-touch-startup-image" href="/splash.png" />
```

### Service Worker (Workbox)

`vite-plugin-pwa` com `registerType: 'autoUpdate'`.

`workbox.globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,xml,txt,webmanifest}']` — pré-cache de tudo do build.

`navigateFallbackDenylist: [/\.xml$/, /\.txt$/, /\.webmanifest$/]` — não usar fallback de navegação para esses arquivos.

`runtimeCaching`:

| Pattern | Estratégia | Cache | Validade | Limite |
|---|---|---|---|---|
| `https://firestore.googleapis.com/*` | NetworkFirst | `firestore-cache` | 24 h | 50 entries |
| `https://fonts.googleapis.com/*` | CacheFirst | `google-fonts-cache` | 30 dias | 10 entries |
| `https://fonts.gstatic.com/*` | CacheFirst | `gstatic-fonts-cache` | 30 dias | 10 entries |

### Headers customizados (`firebase.json`)

| Recurso | Cache-Control | Content-Type |
|---|---|---|
| `**/*.html` | `no-cache, no-store, must-revalidate` | — |
| `sw.js` | `no-cache, no-store, must-revalidate` | — |
| `/sitemap.xml` | `no-cache, max-age=0` | `application/xml; charset=utf-8` |
| `/robots.txt` | `no-cache, max-age=0` | `text/plain; charset=utf-8` |
| `/manifest.webmanifest` | (default) | `application/manifest+json; charset=utf-8` |

### Rewrites

`{ "source": "**", "destination": "/index.html" }` — todas as rotas caem no `index.html` (SPA fallback).

---

## 18. Integração com a IA Gemini

`src/utils/gemini.js` (40 linhas).

```js
import { GoogleGenerativeAI } from '@google/generative-ai'

const FALLBACK = { nome: '', kcal: 0, proteinas: 0, carboidratos: 0, gorduras: 0, _erro: null }

export async function calcularMacrosIA(textoAlimentos) {
  const key = localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY
  if (!key) return { ...FALLBACK, nome: textoAlimentos.trim(), _erro: 'Chave da API Gemini não configurada. Adicione em Configurações.' }

  try {
    const genAI = new GoogleGenerativeAI(key)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `Você é um assistente de nutrição especialista em tabelas brasileiras (TACO/TBCA).
Calcule os macronutrientes TOTAIS da seguinte refeição completa: "${textoAlimentos}"
Some os valores de todos os alimentos listados.
Responda SOMENTE com um objeto JSON puro, sem markdown, sem texto adicional, começando com { e terminando com }:
{ "kcal": número, "p": número, "c": número, "g": número }
Onde: kcal = calorias totais, p = proteínas em gramas, c = carboidratos em gramas, g = gorduras em gramas.
Arredonde para números inteiros.`

    const result = await model.generateContent(prompt)

    const rawText = result.response?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!rawText) throw new Error('Resposta vazia da IA')

    const cleaned = rawText.replace(/```json?/gi, '').replace(/```/g, '').trim()

    let parsed
    try { parsed = JSON.parse(cleaned) }
    catch { throw new Error('Resposta inválida (não JSON)') }

    if (typeof parsed.kcal !== 'number' || typeof parsed.p !== 'number' ||
        typeof parsed.c !== 'number' || typeof parsed.g !== 'number') {
      throw new Error('Campos nutricionais ausentes no formato esperado')
    }

    return {
      nome: textoAlimentos.trim(),
      kcal: Math.round(parsed.kcal),
      proteinas: Math.round(parsed.p),
      carboidratos: Math.round(parsed.c),
      gorduras: Math.round(parsed.g),
    }
  } catch (err) {
    return { ...FALLBACK, nome: textoAlimentos.trim(), _erro: `IA indisponível: ${err.message}. Use o formulário manual.` }
  }
}
```

### Onde é usado

1. **`Dieta.jsx:296` (`analisarComIA`)** — textarea → preenche o formulário de extra global.
2. **`Configuracao.jsx:182` (`calcularMacrosRefeicao`)** — texto da refeição → atualiza macros salvos.

### Rate-limit e cache

`Dieta.jsx` implementa:

```js
const ultimoRequisicaoTime = useRef(0)
const [ultimaAnalise, setUltimaAnalise] = useState({})

const analisarComIA = async () => {
  if (analisando) return                                // trava re-entrante
  const agora = Date.now()
  const segundosDesdeUltima = (agora - ultimoRequisicaoTime.current) / 1000
  if (segundosDesdeUltima < 3) return                   // rate limit 3 s

  const cacheKey = aiInput.trim().toLowerCase()
  if (ultimaAnalise[cacheKey] && (agora - ultimaAnalise[cacheKey].timestamp) < 10000) {
    return                                              // cache 10 s
  }
  // ...
}
```

### Tratamento de 429 (rate limit do Gemini)

```js
if (parsed._erro.includes('429') || parsed._erro.includes('Too Many Requests') || parsed._erro.includes('RESOURCE_EXHAUSTED')) {
  setErro('Limite de análises excedido. Tente novamente em alguns minutos.')
}
```

### Modelo

`gemini-2.5-flash` — rápido, multimodal, low-cost. Trocar para `gemini-1.5-pro` exige apenas alterar a string do modelo.

---

## 19. Cloud Functions (legado / referência)

`functions/index.js` (70 linhas). **Função está comentada** — não está em produção.

> A intenção original era usar uma Cloud Function para esconder a chave do Gemini. Como o projeto está no plano Spark (gratuito), optou-se por chamar o SDK diretamente do frontend e injetar a chave via `VITE_GEMINI_API_KEY` no `.env`. Se um dia migrar para o plano Blaze, basta descomentar o bloco e fazer `firebase deploy --only functions`.

### Estrutura preservada

```js
const PROMPT = `...regras para o Gemini responder JSON puro com kcal, p, c, g...`
// exports.analisarRefeicao = functions.https.onRequest(async (req, res) => {
//   res.set('Access-Control-Allow-Origin', 'https://akrgym.web.app')
//   res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
//   ...
//   const apiKey = functions.config().gemini?.key
//   ...
// })
```

Para reativar no futuro:

```bash
cd functions
npm install
firebase functions:config:set gemini.key="SUA_CHAVE"
firebase deploy --only functions
```

---

## 20. Capacitor (wrapper mobile)

`capacitor.config.json`:

```json
{
  "appId": "com.akrgym.app",
  "appName": "AkrGym",
  "webDir": "dist"
}
```

- **Estado**: configurado mas sem builds iOS/Android geradas no repo.
- Para buildar iOS: `npx cap add ios && npx cap sync && npx cap open ios`.
- Para buildar Android: `npx cap add android && npx cap sync && npx cap open android`.
- O `webDir` aponta para `dist/` (output do `vite build`).

> A PWA já é o canal principal mobile. Capacitor está pronto para uma eventual versão nativa com acesso a APIs nativas (câmera para foto de refeição, notificações push locais, etc.).

---

## 21. SEO, robots.txt e sitemap.xml

### `public/robots.txt`

```
User-agent: *
Allow: /
Sitemap: https://akrgym.web.app/sitemap.xml
```

### `public/sitemap.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://akrgym.web.app/</loc>
    <lastmod>2026-08-07</lastmod>
  </url>
</urlset>
```

### Verificação Google Search Console

O Search Console é verificado pela meta `google-site-verification` no `index.html`. O sitemap deve ser enviado no Search Console como `sitemap.xml` depois de confirmar a propriedade `https://akrgym.web.app/`.

### Meta tags (`index.html`)

- `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover" />` — mobile-first, suporta zoom, safe-area.
- `<meta name="theme-color" content="#06080f" />` — cor da barra do navegador no Android.
- `<meta name="description" ... />`, `<meta name="robots" content="index, follow" />` e `<link rel="canonical" ... />` — descoberta e URL principal.
- JSON-LD com `WebSite` e `SoftwareApplication` — classificação do aplicativo para mecanismos de busca.
- `<meta name="build-version" content="3.2" />`.
- `<meta name="google-site-verification" content="0MxCLkjvr7j4yC0BgJI575Hxwa786fC1wDGYcCfw5fc" />` — token do Search Console.
- `<link rel="manifest" href="/manifest.webmanifest" />`.
- `<link rel="preconnect" href="https://fonts.googleapis.com" />` + `preconnect` para `fonts.gstatic.com` — acelera carregamento de fontes.
- `<link href="...Archivo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />`.
- `<link href="...Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />`.

---

## 22. Build, Bundle e Otimizações

### `vite.config.js`

```js
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({ ... }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('/react/')) return 'react-vendor'
            if (id.includes('firebase')) return 'firebase-vendor'
          }
        },
      },
    },
  },
})
```

### Chunks gerados (em `dist/assets/`)

| Chunk | Tamanho aprox. | Conteúdo |
|---|---|---|
| `react-vendor-*.js` | ~140 KB | React, ReactDOM, react-dom/client |
| `firebase-vendor-*.js` | ~400 KB | SDK Firebase (Auth + Firestore) |
| `index-*.js` | pequeno | Bootstrap + Layout + Context |
| `Home-*.js` | pequeno | Página Home |
| `Dieta-*.js` | médio | Página Dieta |
| `Execucao-*.js` | pequeno | Página Execução de Treino |
| `Evolucao-*.js` | médio | Página Evolução |
| `Configuracao-*.js` | médio | Página Configurações |
| `Login-*.js` | pequeno | Página Login |
| `gemini-*.js` | pequeno | SDK Gemini |
| `flame-*.js`, `pencil-*.js`, `trash-*.js`, `x-*.js` | minúsculos | Ícones Lucide individuais |
| `index-*.css` | ~28 KB | Design system "Aether Luxe" |

> Os ícones Lucide são tree-shaken automaticamente — cada ícone vira um chunk minúsculo.

### Code splitting

- Cada página é importada com `React.lazy(() => import('./components/pages/Home'))` em `App.jsx:11-16`.
- A primeira carga baixa só o shell (`index`, `react-vendor`, `firebase-vendor`). As páginas são carregadas sob demanda.

### Service Worker

Gerado automaticamente via `vite-plugin-pwa` (Workbox). Faz pré-cache de todos os assets de `dist/` na instalação e aplica as estratégias de runtime caching descritas em §17.

---

## 23. Deploy (Hosting + Functions)

### Deploy rápido de hosting

```bash
npm run deploy
```

O script faz:

1. `npm run build` — gera `dist/`.
2. Configura `GOOGLE_APPLICATION_CREDENTIALS=token/akrgym-service-account.json`.
3. `firebase deploy --only hosting --project akrgym`.

> ⚠️ O caminho da service account é específico desta máquina. Para deploy em CI/CD, gere a chave no CI, salve como secret e substitua o caminho.

### Deploy de regras e índices

```bash
firebase deploy --only firestore:rules,firestore:indexes --project akrgym
```

### Deploy de Cloud Functions (se reativadas)

```bash
cd functions
npm install
firebase deploy --only functions --project akrgym
```

### Setup inicial em uma nova máquina

```bash
npm install -g firebase-tools
firebase login
firebase use akrgym              # ou: --project akrgym em cada comando
```

---

## 24. Preview Channels do Firebase Hosting

```bash
npm run build
firebase hosting:channel:deploy dev --project akrgym
```

Cria uma URL temporária do tipo `https://akrgym--dev-785gryhc.web.app` que expira em 7 dias (renovável). Útil para validar mudanças sem afetar produção.

> O ID do canal no exemplo (`785gryhc`) é gerado pelo Firebase e varia a cada deploy.

---

## 25. Scripts Utilitários (Node)

### `scripts/gen-pwa-icons.cjs` — Gerador minimalista (legado)

Gera PNGs sem dependências externas (apenas `zlib` nativo do Node). Fundo roxo escuro + barra amarela diagonal + letra "A" branca central. Usado como fallback quando `fotos/Icone.png` ainda não existia.

Saídas:
- `public/pwa-192x192.png`
- `public/pwa-512x512.png`
- `public/apple-touch-icon.png`
- `public/robots.txt` (User-agent: *, Allow: /)

```bash
node scripts/gen-pwa-icons.cjs
```

### `scripts/gen-pwa-icons-from-icone.cjs` — Gerador a partir de `Icone.png`

Requer `pngjs` (já nas devDependencies). Faz:
- Decode de `fotos/Icone.png`.
- **Resize bilinear** para 192×192, 512×512, 180×180 com fundo roxo Aether.
- **Splash screen** 1290×2796 (iPhone 14 Pro Max) com gradiente radial e ícone centralizado ocupando 55 % da largura.
- Encode PNG puro (sem dependência de `sharp` ou `jimp`).

Saídas: `pwa-192x192.png`, `pwa-512x512.png`, `apple-touch-icon.png`, `splash.png`.

```bash
node scripts/gen-pwa-icons-from-icone.cjs
```

> Para trocar a logo: substituir `fotos/Icone.png` e rodar o script. Para trocar a cor de fundo, alterar a const `bg = [10, 8, 26]` no script.

### `scripts/verificarUsuarioId.js` — Auditoria

Lista todos os documentos das coleções `historico_treinos`, `diario_dieta` e `historico_corporal` e verifica se o campo `usuarioId` está presente. Útil após uma migração.

```bash
GOOGLE_APPLICATION_CREDENTIALS=... node scripts/verificarUsuarioId.js
```

Requer `serviceAccountKey.json` em um dos caminhos padrão:
- `./serviceAccountKey.json`
- `resolve(process.cwd(), 'serviceAccountKey.json')`
- `/home/akira/projetos/AkrGym/serviceAccountKey.json`
- `serviceAccountKey.json` (cwd)

Saída: contagem total / com `usuarioId` / sem, com até 10 exemplos de paths faltantes.

### `scripts/migrarUsuarioId.js` — Migração interativa

Fase 1 (opcional): backup em `backup_migracao/{uid}` com `serverTimestamp` e snapshot completo das 3 coleções + `config/data`.

Fase 2 (opcional): percorre todos os docs sem `usuarioId` e preenche com o UID do path. Usa `writeBatch` com chunks de 400 (limite do Firestore).

```bash
GOOGLE_APPLICATION_CREDENTIALS=... node scripts/migrarUsuarioId.js
```

Perguntas interativas:
- `Criar backup na coleção backup_migracao/data? (s/N)`
- `Preencher usuarioId nos documentos que não possuem? (s/N)`

### `scripts/migrarUsuarioId_auto.js` — Migração automática

Mesma lógica do `migrarUsuarioId.js`, mas **sem prompts** — sempre faz backup + migração. Útil em pipelines.

```bash
GOOGLE_APPLICATION_CREDENTIALS=... node scripts/migrarUsuarioId_auto.js
```

---

## 26. Componentes — referência completa

### `Layout.jsx`

| Prop | Tipo | Descrição |
|---|---|---|
| `activeTab` | string | `home` \| `dieta` \| `treinar` \| `evolucao` \| `configurar` |
| `onTabChange` | (key) => void | Callback ao clicar em uma aba |
| `children` | ReactNode | Página atual |

Renderiza: `AetherParticles` (26 partículas CSS-only), `<main>` scrollable, `<nav>` fixa com 5 abas e indicador luminoso animado.

### `ConfirmModal.jsx`

| Prop | Tipo | Descrição |
|---|---|---|
| `isOpen` | boolean | Se true, renderiza via portal |
| `onConfirm` | () => void | Callback do botão Confirmar |
| `onCancel` | () => void | Callback do botão Cancelar |
| `title` | string | Título do modal (default: "Confirmar") |
| `message` | string | Mensagem (default: "Tem certeza?") |

Comportamento extra: ao abrir, dá `window.scrollTo({ top: 0 })` e tenta centralizar o modal via `scrollIntoView({ block: 'center' })` 100 ms depois (fallback para scroll suave).

### `ErrorBoundary.jsx`

| Prop | Tipo | Descrição |
|---|---|---|
| `mostrarDetalhes` | boolean | Se true, exibe `<details>` com stack trace |

Captura qualquer erro de render dos filhos e exibe UI minimalista de fallback com botão `Recarregar`.

### `PageTransition.jsx`

| Prop | Tipo | Descrição |
|---|---|---|
| `activeTab` | string | Chave da aba atual (usada para detectar mudança) |
| `children` | ReactNode | Página a ser renderizada com transição |

Detecta direção (esquerda/direita) comparando índices em `ordemTabs`. Aplica classes `fade-exit-active` → `fade-enter` (próximo frame) → `fade-enter-active` com 220 ms de delay intermediário.

### `OnboardingWizard.jsx`

| Prop | Tipo | Descrição |
|---|---|---|
| `onComplete` | () => void | Callback quando o usuário termina qualquer uma das 3 opções |

Estados: `opcoes` (inicial) → `experiencia` (Opção A) → `objetivo` (Opção A) → `revisao` (Opção A) → completa.

Templates pré-definidos em `TEMPLATES.experiencia` (3 níveis × 3 divisões × 3-4 exercícios) e `TEMPLATES.objetivo` (3 objetivos × metas + 4 refeições cada).

### `TrendChart.jsx`

| Prop | Tipo | Default | Descrição |
|---|---|---|---|
| `data` | `Array<{ data, valor }>` | — | Série temporal |
| `width` | number | 280 | Largura do canvas (px) |
| `height` | number | 200 | Altura do canvas (px) |
| `cor` | string (hex) | `'#ec4899'` | Cor da linha |

Renderiza gráfico de linha em **Canvas 2D** (não SVG) com:
- Grid de 4 níveis (`min` e `max` arredondados para múltiplos de 5).
- Linha com shadow blur da cor.
- Pontos com borda da cor.
- Labels de data no eixo X (`dd/mm`).

Usado em `Evolucao.jsx` para "Tendência de Peso" (medidas corporais).

---

## 27. Páginas — comportamento detalhado

### `Home.jsx` (198 linhas)

- **Estado**: `ultimoTreino`, `totalTreinos`, `diasComTreino` (Set<dayOfWeek>), `loading`, `erro`, `treinos`.
- **Efeito**: 3 queries paralelas no mount (`Promise.all`):
  1. `query(ref, orderBy('data','desc'), limit(1))` — último treino.
  2. `ref` inteira — total de treinos.
  3. `query(ref, where('data','>=',inicioSemana), where('data','<=',fimSemana))` — semana atual.
- **Cálculo de streak**: itera do dia atual para trás enquanto `datas.has(dia)` for true.
- **Render**: cards em grid 2 colunas (Último / Total) + card de semana + card de streak.

### `Login.jsx` (231 linhas)

- **Estados**: `modo` ('entrar'|'cadastrar'), `email`, `password`, `confirmarSenha`, `loading`, `erro`.
- **Função `traduzirErro(code)`**: dicionário de 10 erros do Firebase Auth → pt-BR.
- **`getRedirectResult(auth)`** em useEffect na montagem — processa o retorno de `signInWithRedirect` do Google.
- **`signInWithGoogle()`**: tenta popup → fallback redirect em 3 casos.
- **Validações** (cadastro): senha ≥ 6, senhas iguais.

### `Dieta.jsx` (760 linhas)

- **Estrutura**: 2 funções — `Dieta` (principal) e `PainelEstatisticas` (heatmap mensal).
- **Refeições dinâmicas**: o usuário pode criar/excluir refeições em `Configuracao.jsx`; `Dieta.jsx` lê `config.refeicoes` e renderiza cards para cada.
- **Cálculo de totais** (`calcularTotais`):
  - `pendente` → 0
  - `limpo` ou `livre` → macros do `refs[i]`
  - `customizado` → macros do `substituto` (kcal calculado por Atwater: P×4 + C×4 + G×9)
  - `extra[]` → soma os macros
  - `extras_globais[]` → soma os macros
- **Modo "Editar dia passado"**: o docId é a data (`YYYY-MM-DD`), então basta `setDataAtiva(novaData)` para abrir outro documento.
- **Heatmap mensal** (`corDia`): verde ≤ 2000 kcal, âmbar 2001-2250, vermelho > 2250, sem dados → neutro.
- **Cálculo de aderência**:
  - Verde: tudo clean
  - Amarelo: 1 pulada ou ≥ 1 customizada
  - Vermelho: > 1 pulada OU refeição "livre"

### `Execucao.jsx` (375 linhas)

- **3 steps**: `select` (escolhe rotina) → `active` (executa) → salva.
- **Auto-save (debounce 500 ms)** em `localStorage['rascunho_treino_{uid}']`.
- **Recuperação**: ao montar, lê o rascunho e preenche `rotinaKey` + `topSetData` + pula para step `active` com banner "⚡ Rascunho de treino recuperado!".
- **Iniciar treino**: busca `historico_treinos` da mesma rotina (`orderBy('data','desc'), limit(1)`) e usa a `carga_top` do último treino como referência (fallback para `ex.base_top`).
- **Cálculo do protocolo**:
  - Aquecimento: `Math.round(ex.ref * 0.6)` (exceto agachamento = barra × 10).
  - Preparatória: `Math.round(ex.ref * 0.85) × 6 reps`.
  - Back-Off: `Math.round(cargaHoje * 0.9)` se agachamento, senão `Math.round(cargaHoje * 0.85)`.
- **Confirmação**: modal antes de salvar + efeito visual `card-complete-glow` no container.
- **Validação final**: `podeFinalizar = topSetData.every(ex => Number(ex.carga) > 0 && Number(ex.reps) > 0)`.

### `Evolucao.jsx` (743 linhas)

- **Aba Treino**:
  - Carrega últimos 20 treinos.
  - Constrói `Set<exercicios>` em ordem alfabética.
  - Select com filtro de rotinas (aparece se > 1 rotina).
  - `parseMetaTeto(meta)`: se "6-8" → 8, se "7" → 7, senão Infinity.
  - Cards: Recorde / Última Top Set / Próximo Objetivo ("Subir Carga!" se `ultimoTreino.reps >= tetoMeta`).
  - Gráfico SVG com `viewBox` dinâmico, `feGaussianBlur` para glow, polyline + circles com `drop-shadow`.
  - Tooltip on-click em cada ponto.
  - Lista dos últimos N + paginação `startAfter(lastTreinoDoc)`.
- **Aba Medidas**:
  - Carrega últimos 20 registros.
  - Validação de ranges (`peso` 0-500, `cintura/abdomen/peito` 0-200, `braco_dir/coxa_dir` 0-100).
  - **Último Registro**: diff vs penúltimo (verde se melhorou, vermelho se piorou, considerando `lowerBetter`).
  - **Comparação**: diff entre última e primeira medida do período filtrado.
  - Gráfico SVG por medida (similar ao de treino, com cor `--accent`).
  - TrendChart Canvas para peso.
  - Filtro Semana/Mês/Tudo.
  - Tabela em telas `sm:+`, cards em mobile.

### `Configuracao.jsx` (451 linhas)

- **5 abas visíveis** (na verdade 2 + subseções):
  - Header de perfil (sempre).
  - Aparência (temas — sempre).
  - Treinos / Dieta (tabs).
- **Auto-save debounced (600 ms)** para `metas` e `refeicoes` em `config`.
- **Validação rigorosa** no botão "Salvar Treinos" / "Salvar Tudo" (lança erro se algum número for inválido).
- **`sincronizarMetas`**: soma todos os macros das refeições e grava em `metas`.
- **`calcularMacrosRefeicao(idx)`**: pega o texto do input, chama `calcularMacrosIA`, preenche os macros e salva.
- **`signOut(auth)`** no rodapé.

---

## 28. Hooks e Contexto

### `UserContext.jsx`

```js
import { createContext, useContext } from 'react'

export const UserContext = createContext(null)

export function useUser() {
  return useContext(UserContext)
}
```

Usado em **todas as páginas** (Home, Dieta, Execucao, Evolucao, Configuracao, Login) para acessar `user.uid`, `user.email`, `user.isAnonymous`.

### Hooks de tema (`themes.js`)

- `useTheme()` → `[themeId, applyTheme]`.
- `useThemeColor(varName = '--brand')` → `string` (cor computada atual da var CSS).

### Hooks internos de página

Cada página define seus próprios `useCallback` para queries e `useEffect` para carregar dados. Não há hook global de Firestore — a simplicidade é a prioridade.

---

## 29. Tratamento de Erros, Loading e UX defensiva

### Padrão de loading

- **Spinner central** enquanto `loading === true && initializing === true` (em `App.jsx`).
- **Skeletons** (`.skeleton`, `.skeleton-card`) em cada página durante fetch.
- **Empty states** explícitos: "Nenhum treino configurado", "Nenhuma medida registrada ainda", "Sem dados ainda. Vá treinar!".

### Padrão de erro

- **Banner de erro** com botão de fechar (X) ou auto-dismiss.
- **Mensagens em pt-BR** em todos os catch.
- **Timeout de segurança** em Login (15 s) e em `verifyPrimeiroAcesso` (10 s).
- **ErrorBoundary** envolve toda a árvore e cada página.

### UX defensiva

- **Validação numérica** com `parseFloat(String(v).replace(',', '.'))` — aceita vírgula como decimal.
- **Ranges explícitos** para evitar valores absurdos.
- **Confirmação modal** para ações destrutivas (Pular refeição, Excluir divisão, Excluir refeição, Deletar medida).
- **Auto-save** evita perda de dados em treinos e configurações.
- **Toast com Desfazer** por 5 s após confirmar refeição.
- **Detecção de mudança de UID** (`prevUidRef`) reseta a UI para evitar mostrar dados de outro usuário.

---

## 30. Padrões e Convenções do Código

### Estilo

- **Indentação**: 2 espaços (formato Prettier padrão do Vite).
- **Aspas**: simples para strings JS (`'`).
- **Ponto-e-vírgula**: não usado consistentemente (omitido em vários arquivos).
- **Componentes funcionais** com hooks (nenhum class component exceto `ErrorBoundary`).
- **JSX inline** para a maioria dos componentes (sem divisão por arquivo pequeno).

### Nomes

- Variáveis de estado: camelCase (`rotinaKey`, `topSetData`).
- Constantes globais: SNAKE_CASE (`DIAS_SEMANA`, `CAMPOS_MEDIDA`).
- Refs: `xxxRef` (`navRef`, `tabRefs`, `configRef`).
- Handlers: `handleXxx` ou `xxx` direto.
- IDs de coleção Firestore: snake_case em inglês (`historico_treinos`, `diario_dieta`).
- IDs de doc: camelCase ou kebab-case conforme contexto (`upper_a`, `cafe`, `refeicao_1700000000`).

### Imports

- **Ordem**: bibliotecas externas → arquivos locais (sem ordem alfabética estrita).
- **Aliases**: `../../firebase`, `../../context/UserContext`, etc.

### React 19 specifics

- `StrictMode` ativado em `main.jsx`.
- `React.lazy` + `Suspense` para code splitting.
- `useCallback` para queries Firestore.
- `useRef` para refs DOM e valores mutáveis.
- `useMemo` apenas em `Evolucao.jsx` (`medidasFiltradas`).

### Estados derivados

- `podeFinalizar`, `aderencia`, `ultimaMedida`, `medidaAnterior` são calculados em tempo de render (sem estado).
- `tooltip` em `Evolucao.jsx` é `useState` (string | number | null).

### Documentação inline

- Comentários curtos explicam intenção em pontos-chave.
- Blocos longos explicam o "porquê" (ex: "Mantida apenas como referência para migração futura para plano Blaze").

---

## 31. Cache Persistente e Estratégia Offline

### Firestore (IndexedDB)

`persistentLocalCache({ cacheSizeBytes: 104857600 })` — 100 MB.

- Os dados ficam disponíveis offline depois do primeiro acesso online.
- Mutations feitas offline são sincronizadas automaticamente quando a conexão volta.
- Cache é **persistente entre sessões** (não é apagado ao fechar a aba).

### Service Worker (Workbox)

- **Precache** de todos os assets do `dist/`.
- **NetworkFirst** para Firestore (com fallback para cache se falhar).
- **CacheFirst** para Google Fonts (economia de banda).

### localStorage

Chaves usadas:

| Chave | Conteúdo | Onde |
|---|---|---|
| `akrgym-theme` | ID do tema ativo (`roxo-suave` etc.) | `themes.js` |
| `gemini_api_key` | Chave Gemini (reservado para futuro) | `gemini.js` |
| `rascunho_treino_{uid}` | `{ rotinaKey, topSetData }` para auto-save de treino | `Execucao.jsx` |

### Comportamento offline

1. Primeira visita: baixa SW + assets + lê Firestore.
2. Visitas subsequentes online: revalida via NetworkFirst.
3. **Offline**:
   - App abre instantaneamente (SW + assets no cache).
   - Firestore serve do cache local.
   - Mutações ficam enfileiradas e sincronizam quando voltar online.
   - Treinos são salvos em rascunho local + (quando online) commitados em `historico_treinos`.
   - Configurações (debounce 600 ms) commitam ao reconectar.

---

## 32. Performance, Acessibilidade e PWA checklist

### Performance

- ✅ **Code splitting** por página (lazy).
- ✅ **Tree shaking** de ícones Lucide.
- ✅ **Cache offline** Firestore + Service Worker.
- ✅ **Preconnect** para Google Fonts.
- ✅ **Manual chunks** para `react-vendor` e `firebase-vendor` (cache-friendly).
- ✅ **CSS-in-CSS** sem framework runtime (apenas Tailwind compilado).
- ✅ **Sem realtime listeners** — apenas pull-on-demand.
- ✅ **Imagens** com tamanho otimizado (PWA icons 192/512, apple 180).

### Acessibilidade

- ✅ `aria-label` em botões de ícone (Confirmar, Pular, Editar, Deletar).
- ✅ Inputs com `placeholder` legível.
- ✅ Foco visível (`focus:ring-2`).
- ✅ Contraste suficiente no dark mode (texto branco + acentos saturados).
- ✅ Suporte a zoom (até 5×).
- ✅ `safe-area-inset-top` para notches.
- ⚠️ Faltam ARIA-live regions para toasts (mas o conteúdo é anunciado por screen readers via mudança de texto).
- ⚠️ Faltam testes formais com NVDA/VoiceOver (recomendação futura).

### PWA checklist

- ✅ Manifesto válido com ícones maskable.
- ✅ Service Worker registrado (`registerType: 'autoUpdate'`).
- ✅ HTTPS obrigatório (Firebase Hosting fornece).
- ✅ iOS meta tags (apple-touch-icon, splash, status-bar-style).
- ✅ Theme color consistente com o design.
- ✅ Offline-ready (cache Firestore + assets).

### SEO

- ✅ `robots.txt` e `sitemap.xml`.
- ✅ Sitemap servido com `200 OK`, `Content-Type: application/xml` e URL absoluta canônica.
- ✅ Google Search Console verificado por meta tag.
- ✅ `title`, `description`, `robots`, canonical, `hreflang` e conteúdo inicial rastreável.
- ✅ JSON-LD `WebSite` + `SoftwareApplication`.
- ⚠️ Sem Open Graph / Twitter Cards (recomendação para compartilhamento).

---

## 33. Limitações Conhecidas e Roadmap

### Limitações atuais

- **Chave Gemini exposta no bundle**: como o SDK é chamado client-side, a chave fica acessível a usuários técnicos. Mitigação: rotacionar periodicamente e monitorar uso.
- **Sem confirmação de e-mail** no cadastro (Firebase Auth permite, mas não foi habilitado).
- **Sem recuperação de senha** (idêntico ao anterior).
- **Sem CSP** (Content Security Policy) configurado no Hosting — recomendado adicionar.
- **Sem rate limit server-side** nas chamadas Gemini além do cache e rate-limit client-side.
- **Anônimo não consegue login Google em popup**: a migração pode ser imperfeita em alguns cenários.
- **Testes de interface ainda não cobrem todos os fluxos** (Playwright permanece recomendado).
- **CI/CD configurado**: validação em pull requests e deploy do Hosting na `main`; o secret `FIREBASE_SERVICE_ACCOUNT_AKRGYM` precisa existir no GitHub.
- **iOS Splash e ícones gerados por script custom** (sem `capacitor-assets` ou `@vite-pwa/assets-generator`).

### Roadmap sugerido

- [ ] Adicionar **CSP** no `firebase.json` headers.
- [ ] Adicionar **Open Graph / Twitter Card** meta tags.
- [ ] Migrar Gemini para **Cloud Function** (quando migrar para Blaze).
- [x] Adicionar testes unitários para `parseMetaTeto`, `epley1RM`, `volumePorTreino`, `diasDesde`, `formatarVolume` e validações.
- [ ] Adicionar **Playwright** para testes e2e de login + treino + dieta.
- [x] Adicionar **GitHub Actions** para CI: lint + testes + regras Firestore + build.
- [x] Configurar **deploy contínuo do Hosting** pela branch `main` usando secret do GitHub.
- [ ] Suporte a **foto de refeição** (via Capacitor Camera ou `<input type="file" capture>`).
- [ ] **Notificações push** (Firebase Cloud Messaging) para lembretes de treino/refeição.
- [ ] **Exportar dados** (JSON ou CSV) para backup local.
- [ ] **Compartilhar treino** (gerar link público de uma sessão específica).
- [x] **Modo escuro/claro** (`Original` = Escuro, `Lava` = Claro).

---

## 34. FAQ de Manutenção

### Como adicionar uma nova página?

1. Criar `src/components/pages/NovaPagina.jsx`.
2. Adicionar `const Nova = lazy(() => import('./components/pages/NovaPagina'))` em `App.jsx`.
3. Adicionar um caso no `switch (activeTab)`.
4. Adicionar um item em `tabs` em `Layout.jsx`.

### Como adicionar um novo campo em `config/data`?

1. Editar `src/config/dieta.js` ou `src/config/protocolo.js` (defaults).
2. Adicionar input no `Configuracao.jsx`.
  3. Atualizar `firestore.rules` (a regra exige `metas`, `refeicoes` e `treinos`; caminhos de coleções desconhecidas são bloqueados).
4. Ler o campo em outras páginas via `getDoc(doc(db, 'users', uid, 'config', 'data'))`.

### Como mudar a chave Gemini sem deploy?

- Atualizar `.env` e fazer `npm run build && npm run deploy`.
- Alternativa: usuário pode colar a própria chave em `localStorage.setItem('gemini_api_key', '...')` (interface ainda não existe).

### Como regenerar ícones PWA?

```bash
# Substitua fotos/Icone.png pela nova logo
node scripts/gen-pwa-icons-from-icone.cjs
npm run build
firebase deploy --only hosting
```

### Como adicionar um novo tema?

Em `src/utils/themes.js`, adicionar um objeto em `THEMES`:

```js
{
  id: 'meu-tema',
  name: 'Meu Tema',
  emoji: '🎨',
  brand: M(blue),                          // palette dessaturada
  accent: M(cyan),
  accent2Hex: desaturate('#hex'),
  highlightHex: desaturate('#hex'),
  bgDeep: '#000000',
  bgCard: 'rgba(0,0,0,0.5)',
  textSecondary: '#cccccc',
}
```

Pronto — aparece automaticamente em `Configuracao > Aparência`.

### Como rodar o app atrás de um proxy?

Vite aceita `--host 0.0.0.0 --port 8080` para expor na rede. Para HTTPS local, use `@vitejs/plugin-basic-ssl` ou um reverse proxy (Caddy/Nginx).

### Como auditar uso de quota do Firestore?

- Console Firebase → Firestore → Usage.
- Cada `getDocs`/`getDoc` conta como 1 leitura por documento retornado.
- O `historico_treinos` pode crescer bastante — considere paginar mais agressivamente (atualmente 20 por vez).

---

## 35. Apêndice — Conteúdo de cada arquivo-fonte

### `src/main.jsx` (13 linhas)
- Importa `StrictMode`, `createRoot`, `index.css`, `applyStoredTheme`, `App`.
- Aplica o tema salvo no `localStorage` **antes** do `createRoot` (evita flash).
- Renderiza `<App />` em modo strict.

### `src/App.jsx` (130 linhas)
- 5 estados: `user`, `loading`, `activeTab`, `initializing`, `abaInicialConfig`, `mostrarOnboarding`.
- `onAuthStateChanged`:
  - Detecta troca de UID via `prevUidRef`.
  - `ensureUserConfig(uid)` cria `config/data` se não existir.
  - Fallback para `signInAnonymously` se desabilitado.
- `renderPage()` switch para 5 abas.
- Lazy load de todas as páginas.

### `src/firebase.js` (30 linhas)
- Config do projeto `akrgym` (visível publicamente no bundle).
- `initializeFirestore` com cache persistente de 100 MB.
- `getAuth`, `GoogleAuthProvider` com `prompt: 'select_account consent'`.

### `src/config/dieta.js` (54 linhas)
- `REFEICOES`: array de 4 refeições base com macros.
- `METAS_DIARIAS`: kcal=1970, P=165, C=226, G=43.
- `STATUS`: `'limpo 🟢'`, `'substituído 🟡'`.

### `src/config/protocolo.js` (36 linhas)
- `PROTOCOLO_BASE.upper_a` (Upper A — 7 exercícios).
- `PROTOCOLO_BASE.lower` (Lower — 5 exercícios, com `IsAgachamento: true`).
- `PROTOCOLO_BASE.upper_b` (Upper B — 5 exercícios, 1 com `nota`).

### `src/utils/gemini.js` (40 linhas)
- `calcularMacrosIA(texto)` → `{ nome, kcal, proteinas, carboidratos, gorduras, _erro? }`.
- Usa `gemini-2.5-flash`.
- Lê chave de `localStorage.gemini_api_key` ou `VITE_GEMINI_API_KEY`.
- Resposta esperada: JSON `{ kcal, p, c, g }` (campos curtos).

### `src/utils/themes.js` (234 linhas)
- 10 paletas (purple, indigo, emerald, cyan, blue, sky, orange, red, pink, fuchsia).
- `hexToRgb(hex)` → `"r, g, b"`.
- `desaturate(hex, amount=0.45, darkening=0.04)` → cor dessaturada via HSL.
- `mute(palette)` → aplica dessaturação em todas as shades.
- `THEMES` — array de 5 temas.
- `themeToVars(theme)` → dicionário de CSS variables.
- `applyTheme(themeId)` — aplica + persiste + emite `themechange`.
- `getStoredTheme()`, `applyStoredTheme()`.
- `useTheme()` — hook React.
- `useThemeColor(varName)` — observa var CSS específica.

### `src/components/Layout.jsx` (139 linhas)
- 5 tabs: `home`, `dieta`, `treinar`, `evolucao`, `configurar`.
- `AetherParticles` (subcomponente) — gera 26 partículas no `useEffect`.
- `atualizarIndicador` recalcula `left` + `width` da aba ativa.
- Recalcula no `resize` + 2 `setTimeout` (120 ms e 400 ms).

### `src/components/ConfirmModal.jsx` (36 linhas)
- Portal React em `document.body`.
- `window.scrollTo({ top: 0, behavior: 'smooth' })` ao abrir.
- `scrollIntoView({ block: 'center' })` no modal após 100 ms.

### `src/components/ErrorBoundary.jsx` (48 linhas)
- `getDerivedStateFromError(erro)` → `{ erro }`.
- `componentDidCatch(erro, info)` → `console.warn`.
- UI minimalista com ícone `AlertTriangle` + botão `Recarregar`.
- Detalhes técnicos opcionais (`prop.mostrarDetalhes`).

### `src/components/PageTransition.jsx` (47 linhas)
- Estados: `exibindo`, `classe`, `direcao`.
- Detecta direção comparando índices em `ordemTabs`.
- Aplica `fade-exit-active` (220 ms) → troca children → `fade-enter` → `fade-enter-active`.
- Movimento: 28 px horizontal + `scale(0.97)`.

### `src/components/TrendChart.jsx` (77 linhas)
- Canvas 2D com DPR-aware.
- Grid de 4 níveis, linha com shadow blur, pontos com borda, labels de data.

### `src/components/OnboardingWizard.jsx` (342 linhas)
- 4 etapas: `opcoes`, `experiencia`, `objetivo`, `revisao`.
- 3 templates: `experiencia` (3 níveis × 3 divisões) + `objetivo` (3 objetivos × 4 refeições + metas).
- `verificarPrimeiroAcesso` com timeout 10 s via `AbortController`.
- 3 funções `salvarOpcaoA/B/C` gravam em `config/data`.

### `src/components/pages/Home.jsx` (198 linhas)
- 5 cards visuais: último treino, total, semana, streak, botão CTA.
- `calcularStreak(lista)` itera do dia atual para trás.
- `tempoRelativo(data)`: Hoje / Ontem / há N dias / data.
- `formatarData(data)`: "Segunda-feira, 15 de janeiro".

### `src/components/pages/Login.jsx` (231 linhas)
- 2 modos (entrar/cadastrar).
- `traduzirErro(code)` para 10 erros comuns.
- `migrateAnonymousData(anonUid, newUid)` com `writeBatch` de 400.
- Google: popup → fallback redirect.
- Timeout 15 s.

### `src/components/pages/Dieta.jsx` (760 linhas)
- 2 abas: `diario`, `estatisticas`.
- 2 funções: `Dieta` (principal) e `PainelEstatisticas` (heatmap).
- `calcularTotais(dia, refs)` percorre refeições, extras, customizações.
- `corMeta(p, m)` retorna gradient baseado em % de atingimento.
- `analisarComIA` com rate-limit 3 s e cache 10 s.
- Toast com auto-dismiss 5 s + botão Desfazer.
- `onDayClick(data)` navega para o dia no diário.

### `src/components/pages/Execucao.jsx` (375 linhas)
- 3 steps: `select` → `active` → save.
- Auto-save (500 ms debounce) em `localStorage['rascunho_treino_{uid}']`.
- Cálculo de protocolo: aquec (60% / barra), prep (85% × 6), backoff (85% ou 90% se agachamento).
- Busca em tempo real (`filtroBusca`).
- Modal de confirmação antes de salvar.

### `src/components/pages/Evolucao.jsx` (743 linhas)
- 2 abas: `treino`, `corporal`.
- 6 medidas: `peso`, `cintura`, `abdomen`, `braco_dir`, `peito`, `coxa_dir`.
- `parseMetaTeto(meta)`: "6-8" → 8, "7" → 7, null → Infinity.
- `CAMPOS_MEDIDA` com `lowerBetter` (true para cintura/abdomen).
- Diff visual com ícones `ChevronUp`/`ChevronDown`/`Minus`.
- Gráfico SVG com `viewBox` + `feGaussianBlur` para glow.
- TrendChart Canvas para peso.
- Filtro Semana/Mês/Tudo.
- Paginação com `startAfter(lastDoc)`.

### `src/components/pages/Configuracao.jsx` (451 linhas)
- 2 abas: `treinos`, `dieta`.
- `validarNumero(v, min, max, nome)` lança erro.
- `salvar(novo)` valida TUDO antes de gravar.
- `addRoutine`, `deleteRoutine`, `addExercise`, `updateExercise`, `deleteExercise`.
- `addRefeicao`, `deleteRefeicao`, `updateRefeicao`, `updateMeta`.
- `sincronizarMetas` soma macros das refeições.
- `calcularMacrosRefeicao(idx)` chama Gemini.
- Debounce 600 ms para `metas` e `refeicoes`.
- `signOut(auth)` no rodapé.

### `src/index.css` (836 linhas)
- `@import "tailwindcss"`.
- `@theme` remapeia `emerald-*` e `cyan-*` para variáveis CSS.
- `:root` com todas as vars do Aether Luxe.
- `body::before` — gradientes orbitais.
- `body::after` — grid sutil com mask.
- `.aether-particles` + `.aether-particle` — partículas.
- `.card-premium`, `.btn-primary`, `.btn-secondary`, `.btn-danger`.
- `.skeleton`, `.skeleton-card`, `.skeleton-circle`, `.skeleton-title`.
- `.tab-active`, `.transition-page`, `.fade-*`, `.card-complete-glow`.
- `.glow-dot`, `.aether-nav`, `.aether-nav-indicator`, `.aether-tab`, `.aether-tab-label`.
- `.theme-swatch`, `.theme-swatch-dots`, `.theme-swatch-dot`.
- `.icon-hover`, `.scrollbar-thin`.
- Animações: `aether-orbit`, `grid-shift`, `particle-float`, `progress-shimmer`, `pulse-emerald`, `drift-y`, `drift-x`.

---

## 36. Glossário

| Termo | Significado |
|---|---|
| **Aether Luxe** | Design system proprietário do app (dark + glow + glassmorphism). |
| **AkrGym** | Nome do app (junção de "Akira" + "Gym"). |
| **Back-Off** | Série após a top set, com carga ~85% (ou 90% para agachamento) e mais reps. |
| **Calistenia** | Treino com peso corporal — não suportado nativamente. |
| **Cache persistente** | Firestore offline cache baseado em IndexedDB. |
| **Cloud Function** | Código serverless Firebase — atualmente desativado no projeto. |
| **Heatmap** | Grade visual colorida por intensidade (semanal, mensal). |
| **Onboarding** | Fluxo de primeiro uso (3 opções). |
| **PWA** | Progressive Web App — instalável, offline, em casa cheia com app nativo. |
| **Rascunho** | Estado parcial de um treino salvo em `localStorage`. |
| **Streak** | Sequência de dias consecutivos com treino. |
| **TACO/TBCA** | Tabelas brasileiras de composição de alimentos (Unicamp / USP). |
| **Top Set** | Série principal do exercício — alvo de progressão. |

---

## 37. Licença e Créditos

### Licença

```
MIT License

Copyright (c) Bruno Akira Furumori

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Créditos

- **Concepção, design, código e operação**: Bruno Akira Furumori
- **IA**: Google Gemini (modelo `gemini-2.5-flash`)
- **Backend**: Firebase (Auth, Firestore, Hosting)
- **Ícones**: Lucide (licença ISC)
- **Fontes**: Inter (OFL), Syne (OFL)
- **Inspiração de design**: Apple Human Interface Guidelines + modernos dashboards mobile.

### Agradecimentos

- Às tabelas TACO/TBCA que tornam a análise nutricional possível.
- À comunidade open-source (React, Vite, Tailwind, Firebase, Workbox, Lucide).
- A todos que testaram e deram feedback durante o desenvolvimento.

---

<p align="center">
  <sub>📘 Documentação gerada para o projeto AkrGym — versão do build: 3.2</sub>
  <br/>
  <sub>Feito com 💪 e ☕ por Bruno Akira Furumori</sub>
</p>
