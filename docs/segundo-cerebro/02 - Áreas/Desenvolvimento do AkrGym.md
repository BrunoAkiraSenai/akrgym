---
tipo: area
area: desenvolvimento
status: ativo
atualizado: 2026-09-08
date: 2026-09-08
type: area
tags: [area, development, akrgym]
ai-first: true
---

# Desenvolvimento do AkrGym

## For future agent
This area note defines the safe development workflow for AkrGym as of 2026-09-08. It prioritizes live-state verification, small changes, localhost regression checks and explicit deploy evidence.

## Fluxo padrão

1. Ler [[01 - Projetos/AkrGym/2026-09-17 - Prompt de onboarding do colaborador AkrGym]] e sincronizar `origin/QA` antes de começar.
2. Registrar contexto e hipótese em uma nota ligada ao [[01 - Projetos/AkrGym/AkrGym — Visão geral]].
3. Reproduzir o problema com dados fictícios ou localhost.
4. Fazer a menor alteração que resolve a causa.
5. Testar a regressão, lint e build.
6. Registrar resultado, limitações e arquivos alterados.
7. Committar/enviar somente em `QA`; pedir a Bruno a promoção para `PRD`.

## Tipos de registro

- Bug: comportamento observado, passos, esperado, impacto e evidência.
- Decisão: alternativas, escolha, motivo e consequência.
- Pesquisa: fonte, síntese, aplicação no AkrGym e data de revisão.
- Tarefa: resultado verificável, prioridade e nota relacionada.

## Guardrails

- Não colocar segredos no cofre, no Git ou em notas de pesquisa.
- Não confiar somente em validação do frontend.
- Não corrigir um risco de dados com refatoração ampla sem teste de migração.
- Não publicar enquanto houver falha de perda de dados ou build não reproduzível.
- Nunca fazer push, merge ou deploy em `PRD` como colaborador.
