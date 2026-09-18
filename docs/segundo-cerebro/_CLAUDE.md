# AkrGym Vault Operating Manual

> Read this file before doing anything in this vault.
> It is the operating contract for maintaining the AkrGym second brain.

## Section 0 - AI-first rule

Every knowledge note written by an agent must be self-contained and include:

- frontmatter with `date`, `type`, `tags` and `ai-first: true`;
- a `## For future agent` preamble explaining scope, purpose and freshness;
- dates and source URLs for external claims;
- Obsidian wikilinks for AkrGym, decisions, projects and concepts;
- a confidence marker when a claim is uncertain (`stated`, `high`, `medium` or `speculation`).

Root operating files (`_CLAUDE.md`, `index.md`, `log.md`, `CRITICAL_FACTS.md`) and `Logs/` are navigation/audit surfaces and are exempt from the preamble. Templates under `99 - Templates/` are reusable scaffolds and are not normal knowledge notes.

## Section 0.5 - Verify live state

Before declaring a bug or a deploy complete, inspect the actual repository, branch, tests, environment and live URL. Git history is evidence of a change, not proof that the change is in production. Never infer a secret, token, user record or API response.

## Vault identity

- Owner: proprietário do AkrGym
- Primary purpose: maintain product context, technical decisions, research, operations and roadmap for [[AkrGym — Visão geral]].
- Last updated: 2026-09-08
- Timezone for dated operations: America/Sao_Paulo

## Folder map

| Folder | Purpose |
|---|---|
| `00 - Painel/` | Hub and dated consolidation notes. |
| `01 - Projetos/AkrGym/` | Product, architecture, history, audit, inventory, backlog and roadmap. |
| `02 - Áreas/` | Continuous development, operations and SEO responsibilities. |
| `03 - Recursos/` | Obsidian method and reusable knowledge. |
| `04 - Arquivo/` | Inactive material, only when created deliberately. |
| `99 - Templates/` | Bug, research and decision templates; do not edit during normal work. |
| `Logs/` | Append-only operation logs by date. |

Legacy notes use filenames containing an em dash because they predate this manual. Preserve their links; new dated filenames should use `YYYY-MM-DD - Title.md` with an ASCII hyphen.

## Key files

- Dashboard: [[AkrGym — Hub]]
- Project overview: [[AkrGym — Visão geral]]
- Current backlog: [[AkrGym — Backlog e decisões]]
- Audit: [[AkrGym — Auditoria 2026-09-08]]
- Architecture: [[AkrGym — Arquitetura técnica]]
- AI security: [[AkrGym — IA e segurança]]
- Repository map: [[AkrGym — Inventário do repositório]]
- Runbook: [[Operação do AkrGym]]
- SEO: [[SEO e publicação]]

## Active context (as of 2026-09-08)

- Current top priority: resolve critical data-consistency findings from the audit before expanding SaaS features.
- Code repository: `<CAMINHO_LOCAL_DO_REPOSITORIO>`
- Branches atuais: `QA` é desenvolvimento/testes; `PRD` representa o site publicado. A branch observada no último estado verificado foi `PRD`; o colaborador deve trabalhar somente em `QA`.
- AI path: React client -> Firebase Auth/App Check -> Cloudflare Worker -> Gemini.
- SaaS and gradual TypeScript migration are planning topics, not shipped features.

## Auto-save and propagation

Auto-save decisions, completed development work, verified bugs, research findings and tasks to the relevant project note, the dated daily/consolidation note and `index.md`/`Logs/` when applicable. Search for an existing note before creating another. Do not delete or silently overwrite history; preserve old facts with dates and explain contradictions.

Ask before touching personal/private data, deleting or archiving notes, changing vault-wide folder conventions, scheduling background agents, or writing credentials.

## Security

- Never store `.env` files, Gemini/Firebase keys, App Check tokens, service-account files, user data or passwords in this vault.
- The vault is plain Markdown. Audit community plugins before installing them and keep sensitive values outside the vault.
- Keep staging debug tokens separate from production credentials.

## Project operating rules

1. Colaboradores trabalham somente em `QA`; `PRD` só é promovida/publicada pelo proprietário proprietário do AkrGym após revisão e autorização explícita.
2. Antes de iniciar e antes de entregar, sincronizar com `origin` usando `git fetch origin --prune` e `git pull --ff-only origin QA`; nunca fazer push acidental em `PRD`.
3. Reproduzir no localhost, fazer a menor mudança segura, executar lint/testes/build e revisar o diff antes do commit.
4. Registrar commit, ambiente, URL e resultado; não equacionar commit com deploy.
5. Para incidentes da IA, capturar status, origem, Auth/App Check, limite e logs antes de mudar código.
6. Para dieta, preservar snapshots históricos de nutrientes e contar extras sem mudar seu rótulo semântico.

## Do not touch

- `99 - Templates/` during ordinary note updates.
- `.obsidian/` settings unless the user explicitly requests vault configuration changes.
- `Bem-vindo.md` and `Sem título.md` until their purpose is confirmed.
- Any secret or personal-data location.

[[AkrGym — Hub]] · [[AkrGym — Histórico de implementações]] · [[AkrGym — Backlog e decisões]]
