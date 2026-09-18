---
tipo: roadmap
projeto: AkrGym
status: planejamento
atualizado: 2026-09-08
date: 2026-09-08
type: roadmap
tags: [roadmap, saas, akrgym]
ai-first: true
---

# AkrGym — Roadmap SaaS

## For future agent
This roadmap separates future SaaS, reliability and TypeScript work from shipped AkrGym features as of 2026-09-08. Items here are proposals until an explicit decision and implementation record exists.

Este mapa registra decisões futuras sem misturá-las com funcionalidades já entregues.

## Agora: confiabilidade antes de cobrar

- Corrigir concorrência do diário, snapshots de nutrientes e respostas tardias da IA.
- Fechar contratos profundos das regras Firestore e validar zero/vírgula decimal sem `NaN`.
- Adicionar observabilidade do Worker (request id, latência, erro por classe) e testes E2E autenticados.
- Melhorar estados vazios, erros recuperáveis, acessibilidade, responsividade e 404.
- Documentar backup/exportação JSON e restauração segura.

## Depois: base comercial sem alterar usuários

- Definir entidades de produto: plano, recurso, limite, assinatura, período e entitlement.
- Manter autorização de plano no backend/Firestore Rules; nunca confiar apenas em flag do frontend.
- Separar dados de usuário, telemetria operacional e faturamento.
- Escolher provedor de pagamento e webhooks idempotentes antes de expor cobrança.
- Criar migrações e feature flags para testar sem mudar todos os usuários.

## TypeScript gradual

- Não reescrever o app inteiro.
- Começar por tipos compartilhados (schemas de refeição, treino, respostas da IA e documentos Firestore).
- Migrar utilitários de baixo risco, depois hooks/serviços, e por fim componentes.
- Manter JavaScript funcionando durante a transição, com `allowJs` apenas enquanto necessário.
- Cada etapa deve ter lint, testes e build verdes.

## Critérios de prontidão para SaaS

- [ ] Isolamento de dados provado por regras e testes.
- [ ] Recuperação de conta, exclusão/exportação e consentimento documentados.
- [ ] Rate limit distribuído e orçamento de IA definido.
- [ ] Backups, monitoramento, alertas e rollback praticados.
- [ ] Entitlement verificado no backend e billing com webhook idempotente.
- [ ] Termos, privacidade e tratamento de dados revisados.

[[AkrGym — Backlog e decisões]] · [[AkrGym — Arquitetura técnica]]
