---
tipo: histórico
projeto: AkrGym
status: ativo
atualizado: 2026-09-08
date: 2026-09-08
type: changelog
tags: [changelog, akrgym]
ai-first: true
---

# AkrGym — Histórico de implementações

## For future agent
This changelog consolidates AkrGym features, commits and operational decisions known on 2026-09-08. A commit proves repository history only; verify the active branch, build and deployed URL before treating a feature as live.

Registro consolidado das entregas que já foram feitas no projeto. Os commits abaixo são referências no Git; o estado exato do código deve sempre ser conferido na branch e no `git log` atuais.

## Linha do tempo de commits

| Commit | Entrega registrada |
|---|---|
| `3932316` | Proteção das credenciais locais do Firebase. |
| `50aa2e1` | Onboarding com perfil (mulher/homem) e planos sensíveis ao perfil. |
| `00a66e4` | Manter itens recém-adicionados visíveis na tela. |
| `ac6135e`, `9ec2b78`, `7025a1b` | Vídeos da dieta adicionados em `public/videos`. |
| `46a8ca7` | Home com sinais reais de treino. |
| `c4c1f3c` | Refeições analisadas pela IA entram no progresso diário. |
| `33477f3` | Remoção da UI para colar chave Gemini no usuário. |
| `f9602da` | Alimento extra contabilizado sem substituir refeição planejada. |
| `14e900a` | Refeição da IA contabilizada mesmo sem nome explícito de slot. |
| `b2a6ee1` | Ações de extras e edição da dieta melhoradas. |
| `9a1ff21` | Edição sem mudança mostra estado de “nenhuma alteração feita”. |
| `09264d3` | SEO, páginas públicas e suporte à indexação do Google. |
| `313874f` | Melhorias integradas em fluxos de treino, dieta, Home e autenticação. |
| `b3c1b14` | Regras Firestore de dieta endurecidas. |

Commits anteriores relevantes incluem a criação da IA (`8b6cb68`), melhorias de resultado e alimento extra (`4a76380`, `3667b30`), animação de macros (`4d573d6`, `bef69ca`), melhorias de Home/design, Treino, Dieta e Evolução (`8e2748e`, `4639507`, `c77efce`, `ef88393`, `ac90561`), revisão funcional e regras (`0df2993`), testes/CI (`0900c0a`), correções de configuração (`2b85e0a`, `0222647`) e deploy contínuo/SEO (`f6b930a`, `7929008`, `c9d70cd`).

## Entregas de produto já implementadas

### Treino

- Onboarding oferece treino novo, treino próprio e o treino do AkrGym.
- Experiência do usuário pergunta nível (iniciante, intermediário ou avançado) e perfil (mulher, homem ou opção neutra, quando disponível no fluxo).
- Execução registra aquecimento/preparação, Top Set, Back-Off, notas e cargas.
- Regra especial de agachamento, busca de exercícios, confirmação e validação foram preservadas.
- É possível pular um exercício explicitamente; isso não deve ser confundido com completar séries.
- Rascunho de execução é salvo localmente com debounce e pode ser restaurado.
- Histórico de treinos alimenta Home e Evolução.

### Dieta e progresso alimentar

- Diário tem quatro refeições fixas, ações confirmar/modificar/pular, refeição personalizada e extras globais.
- Alimento extra conta no progresso como refeição consumida, mas permanece identificado como extra; não é forçado para café, almoço, jantar ou pré-treino.
- Análise de refeição por IA cria/atualiza o registro consumido e incrementa o progresso diário.
- Calorias, proteínas, carboidratos e gorduras foram mantidos; fibras foram adicionadas ao plano, ao resultado da IA, às refeições e ao progresso.
- Edição e exclusão receberam controles maiores e estados de feedback; quando não há mudança, a UI informa em vez de falhar silenciosamente.
- Inclusão de refeição mantém o novo item em posição acessível/visível para configuração.
- Há estatísticas, heatmap e edição de datas anteriores.
- O vídeo da dieta foi adicionado ao diretório público em versões sucessivas.
- Configurações ganhou exportação dos dados do usuário em JSON para backup/portabilidade.
- Estados vazios receberam orientação e próximo passo em Treinar, Dieta, Evolução e Configurações.

### Home e evolução

- Home foi redesenhada seguindo a referência: hierarquia forte, CTA “Começar treino”, cards premium, consistência e navegação mobile-first.
- “Ritmo atual” passou a usar sinais do histórico em vez de número puramente decorativo; o gráfico deve reagir à frequência recente.
- “Última sessão” usa contexto da rotina/sessão para escolher arte discreta relacionada (peito, costas, pernas/lower, ombro, braço, upper, lower ou full body).
- Evolução possui gráficos, filtros por exercício/rotina, recordes/metas e medidas corporais com histórico, diferenças e paginação.

### Autenticação e conta

- Login por e-mail/senha e Google (popup com fallback redirect), mensagens traduzidas, timeout de carregamento e migração de sessão anônima.
- Fluxo de recuperação de senha foi incluído.
- Há limitação local de tentativas; isso melhora UX, mas não substitui proteção anti-bot do provedor.
- Configuração do usuário é isolada por UID no Firestore.

### IA e segurança

- A chave Gemini não aparece mais nas configurações nem no bundle do frontend.
- Cliente envia texto, token de Firebase Auth e token App Check para um Cloudflare Worker.
- Worker valida JWT/Auth, App Check, origem CORS, corpo/tamanho, resposta estruturada, timeout e limites por usuário.
- Worker usa `gemini-2.5-flash`, orientação TACO/TBCA e devolve macros incluindo fibras.
- Existem ambientes de staging (localhost) e produção; o segredo `GEMINI_API_KEY` é configurado como secret do Worker.
- Foram exercitados casos negativos: origem/token inválido, expiração, audience incorreta, corpo não JSON, campos extras, excesso de tamanho, conteúdo recusado e respostas inválidas.
- Erros intermitentes observados (422, 429, 502 e 504) foram documentados; ainda exigem observabilidade e reteste autenticado ponta a ponta em cada ambiente.

### Publicação, PWA e descoberta

- App é PWA mobile-first com manifest, ícones, service worker e cache de runtime.
- Firebase Hosting publica o frontend; Worker publica a análise de IA.
- `robots.txt`, `sitemap.xml`, canonical e dados estruturados foram adicionados para páginas públicas.
- Sitemap atual cobre Home, Treinos, Dieta e Progresso.
- Fluxo de trabalho adotado: branch `dev` → localhost → testes → build → deploy; não publicar diretamente durante diagnóstico.

## Operação e decisões registradas ao longo do projeto

- O repositório foi clonado do GitHub e a pasta de trabalho passou a ser mantida localmente; também foi solicitado atalho da pasta na área de trabalho.
- Deploys para Firebase Hosting foram feitos em momentos anteriores; sempre confirmar o commit e a URL ativa antes de declarar um deploy como concluído.
- O desenvolvimento local foi adotado como etapa obrigatória. Quando `localhost` recusou conexão, a causa operacional foi processo/porta indisponível, não uma alteração automática no código.
- A estratégia de custo evitou depender do plano Blaze para a chamada Gemini: frontend no Firebase Hosting e IA em Cloudflare Workers.
- O Cloudflare Worker recebeu configuração de staging e produção; o prompt/documentação oficial de setup foi consultado e os secrets permanecem fora do Git e do cofre.
- App Check foi habilitado. Para localhost, usa-se token de debug registrado no Firebase Console; esse token não deve ser usado na produção.
- O erro de “chave Gemini não configurada” levou à remoção da entrada de chave no app e à centralização da chave no Worker.
- Foram investigadas falhas intermitentes no PC (422/429/502/504) enquanto o celular funcionava; a decisão foi coletar status, origem, tokens, limites e logs antes de mudar o código.
- A indexação do Google foi tratada como processo separado do deploy: sitemap/robots/canonical podem ser validados sem garantir indexação imediata, e a cota do Search Console deve ser respeitada.
- Foi discutida a preparação para SaaS e a migração gradual para TypeScript; ambas permanecem no roadmap, sem migração total ou cobrança ativa.

## O que não deve ser tratado como concluído

## Checkpoint técnico — 2026-09-09

- O bloco de consistência do diário, ritmo da Home, execução de treino, Evolução, acessibilidade e timeouts da IA foi implementado localmente na branch `dev`.
- Smoke test no harness local confirmou: duas refeições rápidas preservam `2 / 4`; extra editado atualiza totais e fibras; exercício pulado não impede finalizar outro com carga `0`; modal recebe foco; Evolução mostra histórico completo e filtro semanal.
- Verificações: 39 testes unitários, 28 testes de regras Firestore, lint, build e checagem de produção aprovados. A regra nova rejeita mês/dia impossíveis no diário.
- O deploy foi endurecido para exigir site key do App Check e o script deixou de depender de caminho Linux de credencial. `firebase-tools` está declarado em desenvolvimento.
- Worker/cliente têm timeout de requisição e resposta da IA sem fibra numérica deixou de ser tratada como zero. Rate limit distribuído e validação profunda de listas/mapas no Firestore continuam pendentes.
- Nenhum commit, deploy ou segredo foi alterado nesta sessão. Evidência detalhada: [[Logs/2026-09-09]] e [[AkrGym — Auditoria 2026-09-08]].

### Reteste de continuidade — 2026-09-09

- Cenário lento confirmou que a configuração não grava antes da leitura terminar.
- Alteração de alimentos durante resposta tardia da IA foi preservada com aviso; nenhum resultado obsoleto foi aplicado.
- Edição de alimentos seguida imediatamente de “Calcular IA” aplicou os novos macros/fibras, sem o falso descarte causado pelo `onBlur`.
- Cenário sem sessão exibiu Login, sem liberar dados da Home.

- Um commit existente não prova que aquele artefato está no deploy ativo; registrar URL e horário de cada publicação.
- Testes de regex/estrutura não substituem testes de comportamento no navegador, regras Firestore e chamadas reais da IA.
- A migração para TypeScript e monetização SaaS foram decisões de futuro, não entregas concluídas.
- Secret Manager pago, billing, planos pagos e entitlement confiável ainda não foram ativados.

## Fontes canônicas

- Código: `<CAMINHO_LOCAL_DO_REPOSITORIO>`
- Documentação do projeto: `<CAMINHO_LOCAL_DO_REPOSITORIO>\DOCUMENTACAO.md`
- Auditoria: `<CAMINHO_LOCAL_DO_REPOSITORIO>\docs\AUDITORIA-2026-09-08.md`
- Histórico completo: `git log --oneline --decorate`

[[AkrGym — Hub]] · [[AkrGym — Arquitetura técnica]] · [[AkrGym — IA e segurança]]
