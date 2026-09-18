---
tipo: projeto
projeto: AkrGym
status: ativo
responsavel: proprietário do AkrGym
atualizado: 2026-09-08
date: 2026-09-08
updated: 2026-09-08
type: project
tags: [project, akrgym]
ai-first: true
repo: '<CAMINHO_LOCAL_DO_REPOSITORIO>'
---

# AkrGym — Visão geral

## For future agent
AkrGym is an active fitness PWA project documented on 2026-09-08. This note explains its purpose and boundaries; use the repository, audit and operation notes to verify mutable code, security and deployment state.

## Objetivo

Construir um app fitness mobile-first, premium e confiável para registrar treinos, dieta, fibras, evolução corporal e análises nutricionais com IA, preparando a base para um SaaS.

## Fonte do código

Pasta local do projeto:

`<CAMINHO_LOCAL_DO_REPOSITORIO>`

O cofre não deve conter cópias de `.env`, chaves Gemini, tokens Firebase, contas de serviço ou dados pessoais de usuários.

## Arquitetura conhecida

- Frontend: React + Vite + JavaScript, com CSS/Tailwind e componentes próprios.
- Dados e autenticação: Firebase Auth e Firestore.
- IA: frontend solicita análise ao Cloudflare Worker; o segredo Gemini fica no ambiente do Worker.
- Publicação: Firebase Hosting; Worker separado para a IA.
- Testes existentes: lint, testes unitários, regras Firestore e build.

## Decisões atuais

- Fazer mudanças na branch `QA` e testar no localhost antes de publicar; `PRD` é promovida e publicada somente por proprietário do AkrGym.
- Colaboradores devem sincronizar `origin/QA` antes de começar e antes de entregar, commitar apenas mudanças intencionais e nunca sobrescrever trabalho alheio.
- Usar o Obsidian para contexto, decisões, bugs, pesquisas, tarefas e histórico; o código continua no Git.
- Não instalar plugin comunitário sem verificar o código, manutenção e acesso que ele exige.
- Nunca considerar um teste estrutural por regex como prova de segurança de runtime.

## Interfaces relacionadas

- [[AkrGym — Backlog e decisões]]
- [[AkrGym — Histórico de implementações]]
- [[AkrGym — Arquitetura técnica]]
- [[AkrGym — IA e segurança]]
- [[AkrGym — Roadmap SaaS]]
- [[AkrGym — Auditoria 2026-09-08]]
- [[02 - Áreas/Desenvolvimento do AkrGym]]
- [[Operação do AkrGym]]
- [[SEO e publicação]]

## Estado de trabalho em 2026-09-08

- Estado de branches atualizado em 2026-09-17: `QA` e `PRD` estão sincronizadas no GitHub; a última verificação local ocorreu em `PRD`, commit `e058ef7`.
- O worktree deve ser verificado antes de qualquer tarefa; não tratar alterações existentes como descartáveis nem limpar sem revisão.
- O relatório [[AkrGym — Auditoria 2026-09-08]] é a referência para prioridades críticas. O [[AkrGym — Histórico de implementações]] registra o que já foi entregue sem confundir commit com deploy.
