---
tipo: backlog
projeto: AkrGym
status: ativo
atualizado: 2026-09-09
date: 2026-09-09
type: backlog
tags: [backlog, akrgym]
ai-first: true
---

# AkrGym — Backlog e decisões

## For future agent
This is the active AkrGym backlog and decision register as of 2026-09-08. Completed work is linked to [[AkrGym — Histórico de implementações]]; open items require fresh repository and runtime verification before being marked done.

O que já foi entregue está consolidado em [[AkrGym — Histórico de implementações]]. Este arquivo mantém somente o trabalho pendente e as decisões que ainda orientam o projeto.

## Concluído e documentado

- [x] Fluxos de onboarding, perfil feminino/masculino e planos iniciais.
- [x] Dieta com extras, contabilização pela IA, fibras e edição com feedback.
- [x] Treino com rascunho, pular exercício e histórico.
- [x] Home redesenhada, ritmo baseado em treino e última sessão contextual.
- [x] Login Google/e-mail, recuperação de senha e migração de sessão.
- [x] Worker Cloudflare para IA, App Check, validação, CORS, limites e timeout.
- [x] SEO público, `robots.txt`, sitemap, canonical e PWA.
- [x] Exportação JSON, validações e testes adicionados ao worktree atual.

## Próximas entregas

### Proteção de dados e consistência — P1

- [x] C02: impedir que duas ações rápidas no diário se sobrescrevam — transações por intenção; browser smoke test com duas confirmações.
- [x] C03: salvar nutrientes consumidos como snapshot histórico — cálculo mantém valores após alteração/exclusão do plano.
- [ ] Retestar C01: carregamento lento não gravou configuração antes da hidratação; falha de leitura ainda depende de teste específico.
- [x] Retestar C04: resposta tardia da IA exibiu aviso e preservou a edição; edição seguida imediatamente de “Calcular IA” também foi aplicada corretamente.
- [x] Retestar C05: cenário sem sessão exibiu Login e não liberou a Home.

### Contratos e validação — P1/P2

- [ ] C06: endurecer regras Firestore com migração compatível; intervalo de mês/dia do diário já é rejeitado, mas validação profunda de listas/mapas aguarda migração.
- [x] A01/A02: aceitar zero e vírgula decimal sem persistir `NaN`.
- [x] A09/A10: métricas completas e rotina personalizada na Evolução — histórico completo e `rotina_nome`.

### Operação e publicação

- [x] C07: tornar o build de produção reproduzível com App Check configurado — site key obrigatória no check de produção e no workflow.
- [ ] A21: observar timeout ponta a ponta em produção; limites de cliente, JWKS e Gemini foram adicionados localmente.
- [ ] A22: rate limit distribuído para a IA (requer Durable Object/KV; contador em memória não é garantia).
- [ ] A28/A29: atualizar dependências com testes e substituir testes estruturais por testes de comportamento.

## Registro de decisões

| Data | Decisão | Motivo | Estado |
|---|---|---|---|
| 2026-09-08 | O cofre não armazena segredos do AkrGym | Markdown local e plugins podem acessar arquivos; separar conhecimento de credenciais | Ativa |
| 2026-09-08 | Corrigir perda de dados antes de estética | Sobrescritas e histórico incorreto afetam confiança do usuário | Ativa |
| 2026-09-08 | Preferir recursos nativos do Obsidian no início | Backlinks, Properties, Templates, Daily notes, Search e Bases já estão ativos | Ativa |
| 2026-09-17 | Colaborador trabalha somente em `QA`; Bruno promove para `PRD` | Separar revisão/desenvolvimento da publicação do site e evitar deploy acidental | Ativa |

## Fonte detalhada

O relatório técnico completo fica no repositório, em:

`<CAMINHO_LOCAL_DO_REPOSITORIO>\docs\AUDITORIA-2026-09-08.md`
## Padrão de branches (2026-09-09)

- `QA`: desenvolvimento e validação local antes da publicação.
- `PRD`: versão aprovada que representa o site em produção (`https://akrgym.web.app`).
- O workflow de deploy automático foi ajustado para disparar somente ao receber alterações em `PRD`.
- `main` permanece temporariamente como alias legado no GitHub, pois ainda é a branch padrão configurada no repositório; deve ser trocada para `PRD` nas configurações do GitHub.
- Antes de cada tarefa e handoff, o colaborador deve buscar/puxar `origin/QA`; commits e pushes ficam em `QA`, sem reset, force push ou sobrescrita de alterações alheias.
- O prompt copiável e as regras de onboarding estão em [[2026-09-17 - Prompt de onboarding do colaborador AkrGym]].
