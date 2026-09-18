---
tipo: operação
area: AkrGym
status: ativo
atualizado: 2026-09-08
date: 2026-09-08
type: area
tags: [area, operations, akrgym]
ai-first: true
---

# Operação do AkrGym

## For future agent
This runbook records safe Windows, Worker and Firebase operations for AkrGym as of 2026-09-08. Commands are intentionally secret-free; verify project aliases, environment variables and current deployment targets before execution.

Runbook sem segredos para trabalhar no projeto com segurança. Colaboradores usam somente a branch `QA`, validam no localhost e registram o resultado no [[AkrGym — Hub]]. proprietário do AkrGym é o único responsável por promover `QA` para `PRD` e publicar.

## Frontend local (Windows)

```powershell
cd <CAMINHO_LOCAL_DO_REPOSITORIO>
npm ci
npm run dev -- --host 0.0.0.0
```

Abrir a URL informada pelo Vite. Para acessar de outro dispositivo na mesma rede, usar o endereço LAN mostrado pelo Vite e liberar a porta apenas na rede confiável.

## Verificações antes do deploy

```powershell
npm run lint
npm run test:unit
npm run test:rules
npm run build
npm run preview
```

`test:rules` depende do Firebase CLI/Emulator e Java disponíveis. Se falhar por ferramenta ausente, registrar como bloqueio de ambiente, não como falha do código.

## Worker de IA

Executar a partir de `cloudflare-worker/analisar-refeicao`:

```powershell
npx wrangler login
npx wrangler secret put GEMINI_API_KEY
npx wrangler deploy --env staging
npx wrangler deploy --env=""
```

O valor do secret nunca deve ser colado em notas, commits, mensagens ou saída de terminal compartilhada. Staging pode aceitar origem local; produção deve aceitar somente origens públicas necessárias.

## Firebase Hosting

- Conferir projeto/alias e variáveis de build do ambiente.
- Rodar lint, unit, rules e build antes de publicar.
- Publicar somente o diretório de build configurado pelo `firebase.json`.
- Após publicar, abrir Home, Login, Dieta, IA e Treino em aba anônima e autenticada.
- Registrar URL, horário, commit e resultado; não confundir “build local passou” com “deploy ativo”.

## Fluxo de branch e sincronização

1. `git fetch origin --prune`.
2. `git switch QA` e `git pull --ff-only origin QA`.
3. `git status` e `git log --oneline -5`; confirmar que alterações existentes não serão sobrescritas.
4. Implementar pequena mudança na `QA`.
5. Testar localmente e revisar diff.
6. Commit com mensagem específica e `git push origin QA`.
7. Entregar evidências para Bruno; não tocar em `PRD` nem publicar sem autorização dele.

## Diagnóstico rápido do localhost

- `ERR_CONNECTION_REFUSED`: o processo Vite não está rodando, a porta mudou ou o host não está acessível.
- Manifest com erro de sintaxe: conferir resposta real de `/manifest.webmanifest` e MIME; não assumir que o warning é da IA.
- 401/403: Auth, App Check ou origem.
- 422: corpo/resposta fora do contrato.
- 429: limite de uso; aguardar e conferir logs.
- 502/504: upstream/Worker/rede/timeout; comparar celular, PC e logs antes de alterar o prompt.

## Pós-deploy mínimo

- [ ] Home abre sem erro de console bloqueante.
- [ ] Login e recuperação de senha funcionam.
- [ ] Treino registra, pula exercício e preserva rascunho.
- [ ] Dieta soma kcal/P/C/G/fibras e conta extra como consumido.
- [ ] IA funciona com texto curto e longo, com fallback manual.
- [ ] Logout não deixa dados da sessão anterior.
- [ ] `robots.txt`, `sitemap.xml` e manifest retornam status/MIME corretos.

[[AkrGym — Arquitetura técnica]] · [[AkrGym — IA e segurança]] · [[SEO e publicação]]
