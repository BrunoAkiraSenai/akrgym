---
tipo: inventário
projeto: AkrGym
status: referência
atualizado: 2026-09-08
date: 2026-09-08
type: inventory
tags: [inventory, akrgym]
ai-first: true
---

# AkrGym — Inventário do repositório

## For future agent
This inventory maps important AkrGym source, backend, deployment, public and test files as observed on 2026-09-08. It is a navigation aid, not a substitute for reading the file at the current commit.

Mapa dos pontos de entrada para localizar rapidamente cada parte do sistema.

## Frontend

- `src/App.jsx`: composição/navegação principal e ciclo de sessão.
- `src/main.jsx`: bootstrap React/Vite.
- `src/firebase.js`: inicialização Firebase, Auth, Firestore e App Check.
- `src/context/UserContext.jsx`: sessão e dados do usuário.
- `src/components/Layout.jsx`: shell mobile, bottom navigation e estados globais.
- `src/components/OnboardingWizard.jsx`: escolha de plano, perfil, nível e objetivo.
- `src/components/pages/Home.jsx`: dashboard, ritmo, última sessão e consistência.
- `src/components/pages/Execucao.jsx`: execução, séries, pular exercício, rascunho e gravação.
- `src/components/pages/Dieta.jsx`: diário, extras, IA, edição, progresso e fibras.
- `src/components/pages/Evolucao.jsx`: gráficos, filtros, recordes e medidas.
- `src/components/pages/Configuracao.jsx`: rotinas, refeições, metas, temas e preferências.
- `src/components/pages/Login.jsx`: e-mail/senha, Google, recuperação e mensagens.
- `src/components/TrendChart.jsx`: gráfico de tendência/ritmo.
- `src/components/ConfirmModal.jsx`, `ErrorBoundary.jsx`, `PageTransition.jsx`: segurança de interação e UX.

## Configuração e utilitários

- `src/config/dieta.js`, `perfilFeminino.js`, `protocolo.js`: defaults e planos iniciais.
- `src/utils/gemini.js`: cliente do Worker, tokens e tratamento de erro.
- `src/utils/nutrition.js`: normalização/cálculo de macros e fibras.
- `src/utils/fitness.js`: agregações de treino, ritmo e evolução.
- `src/utils/validation.js`, `configValidation.js`: contratos de entrada e configuração.
- `src/utils/exportData.js`: exportação dos dados do usuário em JSON.
- `src/utils/themes.js`, `useAnimatedNumber.js`: design system e animações.

## Backend e publicação

- `cloudflare-worker/analisar-refeicao/src/index.js`: Worker de análise Gemini.
- `cloudflare-worker/analisar-refeicao/wrangler.toml`: nomes, ambientes, variáveis e CORS do Worker.
- `functions/index.js`: funções Firebase legadas/fallback; revisar antes de criar novo fluxo paralelo.
- `firestore.rules`, `firestore.indexes.json`: autorização e índices Firestore.
- `firebase.json`: Hosting, headers, CSP report-only, rewrites, manifest, robots e sitemap.
- `vite.config.js`: build, PWA e precache.
- `public/*.html`, `robots.txt`, `sitemap.xml`, `manifest.webmanifest`: páginas/artefatos públicos SEO/PWA.
- `public/images/home-session-atlas.png`: arte contextual da Home.
- `public/videos/dieta-*.mp4`: vídeos da dieta adicionados nas entregas anteriores.

## Testes e documentação

- `tests/*.unit.spec.js`: nutrição, onboarding, fitness, exportação, segurança IA, configuração e SEO.
- `tests/firestore.rules.spec.js`: regras no Emulator.
- `README.md`: visão para quem chega ao projeto.
- `DOCUMENTACAO.md`: referência funcional/técnica detalhada.
- `docs/AUDITORIA-2026-09-08.md`: achados priorizados e evidências da auditoria.

## Alertas de manutenção

- O script `npm run deploy` contém caminho de credencial Linux histórico; em Windows, revisar o fluxo antes de executá-lo e nunca adicionar a credencial ao Git.
- O worktree observado em 2026-09-08 está sujo, com alterações de usuário e arquivos novos. Fazer `git diff`/backup antes de qualquer limpeza.
- Documentação antiga de Functions pode divergir do caminho atual do Worker; o Worker é a rota atual da IA, mas Functions não deve ser removida sem validar dependências.
- Versões declaradas no `package.json` podem ter sido resolvidas para versões patch diferentes no lockfile; usar lockfile e testes como referência.

[[AkrGym — Arquitetura técnica]] · [[Operação do AkrGym]] · [[AkrGym — Auditoria 2026-09-08]]
