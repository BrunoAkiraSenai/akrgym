---
tipo: arquitetura
projeto: AkrGym
status: ativo
atualizado: 2026-09-08
date: 2026-09-08
type: architecture-overview
tags: [architecture, akrgym]
ai-first: true
scanned-commit: b3c1b14
---

# AkrGym — Arquitetura técnica

## For future agent
This architecture overview describes the AkrGym runtime boundaries and data contracts as observed on 2026-09-08 at commit `b3c1b14`. Verify mutable implementation details against the repository before making a change.

Mapa de alto nível para orientar manutenção e futuras mudanças. O detalhe executável permanece no repositório.

## Stack atual

- React 19 + Vite 8, JavaScript/JSX ESM.
- Tailwind CSS 4 e CSS/components próprios; `lucide-react` para ícones.
- Firebase Auth, Firestore e Firebase Hosting.
- Cloudflare Worker separado para a análise Gemini.
- Capacitor para eventual empacotamento mobile.
- Vitest/testes unitários, Firebase Emulator para regras, ESLint e build Vite.
- PWA com `vite-plugin-pwa`/Workbox.
- Não há React Router: a navegação principal é controlada pelo estado da aplicação.

## Fronteiras do sistema

```text
Usuário
  └─ React/Vite (Firebase Hosting/PWA)
       ├─ Firebase Auth
       ├─ Firestore (dados por UID)
       └─ Cloudflare Worker ── Gemini API (segredo no Worker)
```

Firebase Hosting só entrega o frontend. O Worker não depende do computador do usuário estar ligado, desde que esteja publicado e configurado.

## Mapa de telas e responsabilidades

| Área | Responsabilidade principal |
|---|---|
| Home | Saudação, CTA de treino, última sessão, ritmo, histórico e consistência. |
| Treinos/Execução | Seleção da rotina, séries, carga, pular exercício, rascunho e gravação do histórico. |
| Dieta | Refeições fixas, extras, edição, IA, fibras e progresso diário. |
| Progresso/Evolução | Métricas de dieta, gráficos de desempenho, medidas corporais e metas. |
| Configuração | Rotinas, exercícios, refeições, metas e preferências. |
| Login/Onboarding | Identidade, recuperação, perfil, nível, objetivo e plano inicial. |

## Modelo de dados principal

### `users/{uid}/config/data`

- `onboardingConcluido`, `criadoEm`.
- `treinos`: mapa de rotinas e exercícios.
- `refeicoes`: lista com `id`, `nome`, `horario`, `alimentos`, `kcal`, `proteinas`, `carboidratos`, `gorduras`, `fibras`.
- `metas`: calorias, proteínas, carboidratos, gorduras e fibras.

### `historico_treinos/{docId}`

- `rotina_id`, `data`, `createdAt`, `exercicios` (`nome`, `carga_top`, `reps_top`).
- `usuarioId` opcional em registros legados; regras devem sempre preservar isolamento por UID.
- Histórico é append-only no contrato atual.

### `diario_dieta/{YYYY-MM-DD}`

- `data`, `updatedAt`, `refeicoes` (status, substituto/extra), `extras_globais`.
- `usuarioId` opcional em registros legados.
- A contagem diária considera refeição fixa consumida e extra analisado/confirmado, sem renomear o extra para outro slot.

### `historico_corporal/{docId}`

- `data`, `createdAt`/`updatedAt`, `peso`, `cintura`, `abdomen`, `braco_dir`, `peito`, `coxa_dir`.

## Fluxo da IA

1. Usuário envia descrição no frontend.
2. Cliente obtém Firebase Auth ID token e App Check token.
3. `src/utils/gemini.js` envia texto + tokens ao Worker; nenhuma chave Gemini é enviada.
4. Worker valida origem, tokens, limite e corpo.
5. Worker chama `gemini-2.5-flash` com timeout e prompt nutricional.
6. Worker valida JSON/macros/fibras e devolve resposta mínima.
7. Frontend converte o resultado em refeição/extraprogress e mostra feedback.

## Ambientes

- Local: Vite + Worker de staging; App Check usa token de debug registrado no Firebase Console.
- Staging Worker: permite origens locais somente quando a variável de ambiente correspondente está ativa.
- Produção: Firebase Hosting + Worker de produção; origem pública restrita e secret configurado no Worker.
- `.env*`, chaves, tokens e service accounts ficam fora do cofre e fora do Git.

## Atualização de consistência — 2026-09-09

- Histórico de treino novo salva `rotina_nome`, IDs de exercício quando disponíveis e um ID determinístico por sessão para retry idempotente.
- Diário novo registra `planejadas`, `metas_snapshot` e `consumido` por refeição; `diaryTotals` usa o snapshot antes do plano atual e mantém extras como alimentos consumidos independentes de slot.
- Ações do diário usam `runTransaction`, pois o Firestore pode repetir uma transação quando detecta edição concorrente; a função de transação não deve produzir efeitos externos. Fonte: [Firebase — transações](https://firebase.google.com/docs/firestore/manage-data/transactions), consultada em 2026-09-09.
- O contrato da IA agora exige números finitos para todos os cinco campos, incluindo fibras; timeout do cliente (55 s) e JWKS (8 s) complementam o timeout do Gemini no Worker (45 s).

## Contratos que exigem cuidado

- Ao atualizar plano/metas, não reescrever nutrientes históricos já consumidos.
- Ações rápidas do diário precisam ser serializadas ou usar transação para não perder a última alteração.
- Respostas tardias da IA não podem sobrescrever edição mais nova do usuário.
- Logout deve desmontar dados privados antes de exibir uma sessão diferente.
- Regras Firestore e validação de UI são camadas complementares, não substitutas.

[[AkrGym — Histórico de implementações]] · [[AkrGym — Backlog e decisões]] · [[Operação do AkrGym]]
