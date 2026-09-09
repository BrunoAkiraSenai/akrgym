# Auditoria AkrGym — 08/09/2026

## Ponto de retomada

Trabalho em andamento na branch `dev`. O usuário autorizou corrigir problemas críticos durante a auditoria. **Não publicar nem fazer commit sem nova solicitação.** Preservar as muitas alterações locais anteriores a esta auditoria.

O usuário pediu parar perto de 20% da janela de 5 horas. Foi perguntado se significa 20% restantes ou consumidos; resposta ainda pendente. Leituras retornadas: 2%, depois 17%, depois **30% consumidos (70% restantes)**. Ao receber 30%, o trabalho foi interrompido, adotando a interpretação conservadora enquanto não há resposta. Não consumir créditos de reset. Confirmar a interpretação antes de retomar um bloco longo.

Primeiro bloco implementado: C01, C04 e C05 abaixo, com correções relacionadas A01/A02. O reteste de integração local foi concluído nesta retomada; C06 segue parcialmente aberto por exigir estratégia de migração para validar listas/mapas aninhados sem quebrar dados legados. Este arquivo deve ser atualizado após cada bloco, inclusive em caso de interrupção.

## Método e limites

- Código local completo das áreas principais, regras Firestore, Worker, cliente Gemini, configurações de publicação e testes existentes.
- `npm run lint`: passou antes das correções.
- `npm run test:unit`: 24/24 passaram antes das correções.
- `npm run test:rules`: 26/26 passaram no emulador antes das correções.
- `npm run build`: passou antes das correções.
- Testes adicionais de funções, regras e Worker com dados fictícios.
- Navegador com os componentes reais, substituindo somente Firebase e Gemini por implementações de teste; sem gravação na produção. Latência de gravação simulada em 350 ms e leitura lenta em 1.600 ms.
- Revisão visual em 320 e 390 pixels; ampliação da matriz ainda em andamento.
- Consultas HTTP públicas ao site e quatro chamadas negativas ao Worker publicado, sem token válido e sem consumo de Gemini.
- Não é uma garantia de ausência de outros erros, nem pentest completo. Login Google real, entrega de e-mail, todos os navegadores, dados privados, consoles de infraestrutura e processamento Gemini autenticado ainda exigem validação específica.

Harness e reproduções estão na pasta irmã `audit-2026-09-08`: `server.mjs`, `mock.js`, `probes.mjs`, `rules-probes.mjs`, `worker-runtime-probes.mjs`. Servidor temporário: 127.0.0.1:5186, sessão de terminal 32022, encerrado ao pausar. Para retomar, executar `node server.mjs` nessa pasta.

## Atualização 2026-09-09 — bloco validado localmente

Correções locais adicionadas após o primeiro checkpoint, ainda sem commit/deploy:

- Diário alimentar usa operações transacionais por intenção, IDs estáveis para extras, snapshots de nutrientes e normalização de documentos legados.
- Home passa o score/tendência ao gráfico; o ritmo usa janelas móveis de 7 dias sobre histórico de 14 dias (4 dias ativos = 100%), e a última rotina aceita `rotina_nome` salvo no histórico.
- Execução permite carga externa zero/peso corporal, exige repetições inteiras dentro do limite, procura referência válida em sessões anteriores, invalida rascunho quando a rotina muda e grava histórico com ID idempotente por sessão.
- Evolução carrega o histórico completo e aplica o filtro de medidas às comparações, gráfico e tabela; valida números e datas, e prefere meta/snapshot do plano efetivamente usado.
- Modal recebeu foco inicial, Escape, ciclo de Tab e restauração do foco; navegação anuncia `aria-current` e respeita safe-area inferior.
- Cliente IA e Worker receberam timeout explícito para a requisição e busca de JWKS. O bloqueio lexical permite descrições como “Banana antes do treino” e “Sal de mesa”; respostas sem fibra numérica são rejeitadas.
- Deploy local/CI agora exige site key de App Check no build de produção e não usa caminho de credencial específico de Linux; `firebase-tools` passou a ser dependência de desenvolvimento.

Evidência de interface no harness em 390px: dieta incluiu e editou um extra, refletindo `1 / 4`, 120 kcal e 3 g de fibras; execução pulou Flexão e registrou Remada com carga `0` e 8 repetições; Evolução mostrou 36 treinos e recorde de 100 kg; medidas semanais limitaram gráfico e histórico a três registros. No cenário lento, navegações repetidas não produziram gravação antes da configuração ser carregada; uma resposta de IA alterada durante a análise exibiu aviso e preservou os valores; no cenário normal, editar alimentos e clicar imediatamente em “Calcular IA” aplicou 100 kcal/3 g de fibras sem falso descarte; o cenário sem sessão exibiu Login. Suítes atuais: 39 testes unitários aprovados, 28 testes de regras aprovados, lint aprovado, build aprovado e checagem de produção aprovada.

Limitações mantidas: regras Firestore ainda não percorrem conteúdo de listas/mapas de forma completa (a validação de mês/dia fora do intervalo foi adicionada); rate limit do Worker continua por instância; não houve autenticação real, teste de produção ou deploy. Estes itens não devem ser marcados como resolvidos.

## Achados prioritários

### C01 — Configurações podem ser substituídas por valores vazios [P1, corrigido localmente; falha de leitura ainda pendente]

`Configuracao.jsx`, efeito de autosave: agenda gravação 600 ms após montar, antes de terminar a leitura, sem exigir alteração do usuário. No cenário lento, o log registrou `treinos: {}`, `refeicoes: []` e perda dos demais campos; outra gravação restaurou o plano quando a leitura terminou. Sair/interromper entre essas etapas pode deixar a configuração vazia. Erro de leitura também não deve autorizar gravação de defaults.

Aceite: abrir/recarregar configurações, com leitura lenta ou falha, não grava nada; somente edição validada após carregar pode salvar.

Correção local: a tela permanece em carregamento até a leitura terminar e o autosave exige `configCarregada`/edição real; o cenário lento não registrou gravação prematura. A falha de leitura ainda deve ser exercitada em uma fixture dedicada.

### C02 — Ações rápidas no diário perdem alterações [P1, corrigido localmente]

`Dieta.jsx`, `salvarHoje` e chamadores: cada ação regrava o documento completo derivado de estado antigo. Duas confirmações feitas antes de 350 ms produziram dois documentos incompatíveis e resultado final **1/4, não 2/4**; o café voltou a pendente. O mesmo padrão ameaça extras e uso em dois aparelhos.

Aceite: mutações atômicas por ação, preservando o restante do dia; testar duas refeições, extras simultâneos, falha de rede e troca de data durante salvamento. Bloqueio visual sozinho não resolve concorrência entre dispositivos.

### C03 — Alterar o plano reescreve a interpretação do passado [P1, corrigido localmente]

`Dieta.jsx`, `calcularTotais` e `PainelEstatisticas`: refeições concluídas guardam status, mas os nutrientes são buscados no plano atual. Teste: um registro de 460 kcal/5 g de fibras passou a 999 kcal/80 g depois de editar o plano e a zero depois de excluir a refeição. A confirmação de exclusão afirma incorretamente que os dados históricos não serão afetados.

Aceite: registrar uma cópia dos nutrientes da refeição consumida e usar essa cópia em totais/estatísticas, inclusive após exclusão. Documentos antigos sem essa cópia precisam de tratamento explícito; valores históricos já perdidos não podem ser inventados.

### C04 — Resposta atrasada da IA sobrescreve outras configurações [P1, corrigido localmente]

`Configuracao.jsx`, `calcularMacrosRefeicao`: depois do `await`, monta e grava a configuração inteira capturada antes da requisição. Uma edição feita durante a análise é revertida; exclusão/reordenação pode aplicar resultado ao contexto errado.

Correção local: a resposta identifica a refeição por ID, usa o estado mais recente e descarta contexto desmontado ou alterado. A comparação de alimentos usa a lista derivada do texto atual para que editar e clicar imediatamente em “Calcular IA” continue funcionando.

Aceite: identificar refeição por ID; aplicar somente seus nutrientes ao estado mais recente; descartar resultado se os alimentos mudaram, a refeição foi removida, o usuário saiu ou a tela foi desmontada.

### C05 — Logout mantém usuário anterior na interface [P1, corrigido localmente]

`App.jsx`, callback de autenticação: quando recebe `null`, não limpa `user`; tenta login anônimo e, se falhar, libera a UI com usuário antigo. Após “Sair da conta”, o cenário com anônimo desativado retornou à Home antiga, em vez de Login. As regras continuam negando acesso entre contas; isso **não demonstra invasão do banco**, mas é falha de encerramento da sessão visual e de privacidade no mesmo aparelho.

Aceite: limpar usuário imediatamente, desmontar dados privados e ignorar callbacks assíncronos de uma sessão anterior. Decidir separadamente se o produto realmente deseja entrada anônima automática.

Correção local: a sessão anterior é removida antes de liberar a UI, callbacks antigos são invalidados e o cenário sem sessão exibiu Login no harness.

### C06 — Regras validam recipientes, mas deixam passar conteúdo inválido [P1, parcialmente corrigido]

`firestore.rules`: continuam aceitos configuração com macros negativos e `exercicios` não-lista dentro da rotina; treino com carga negativa/repetição fracionada; diário com status inventado e fibras negativas; medida com cintura negativa; atualização corporal removendo a data. O diário agora rejeita mês/dia fora do intervalo (`2026-99-99`), mas ainda não valida calendário completo nem percorre listas/mapas. Comentários prometem validações que não estão implementadas. Campos extras de config também são aceitos; isso não equivale a privilégios administrativos, pois não foi encontrado consumidor que confie nesses campos.

Aceite: esquema e limites compatíveis com registros existentes, testes negativos reais e estratégia de migração antes de publicar regras mais restritivas. Isolamento por UID passou nos testes existentes e adicionais.

### C07 — Publicação automatizada não reproduz o ambiente validado [P1, confirmado nos arquivos; execução remota não inspecionada]

`.github/workflows/deploy.yml` executa build sem fornecer site key App Check; `.env.production.local` não é versionado. Um checkout limpo pode publicar IA sem proteção configurada. Deploy também não depende de sucesso do workflow CI. O CI chama `firebase` sem instalar/declarar `firebase-tools`. Script `npm run deploy` contém sintaxe/caminho Linux específico, incompatível com o ambiente Windows atual.

Aceite: build de checkout limpo com variáveis públicas explícitas, validação obrigatória de configuração, CI reproduzível e deploy condicionado aos testes. Não alterar credenciais/publicar durante a auditoria.

## Outros problemas confirmados e riscos a tratar

| ID | Prioridade | Achado e evidência | Próxima verificação/correção |
|---|---|---|---|
| A01 | P2 | Configurações rejeitam zero numérico (`valor || ''`); “Salvar” falhou em Flexão com base 0. Novas refeições também nascem com zero. | Parser único, zero permitido nos campos apropriados, validação usada por todas as gravações. |
| A02 | P2 | Digitar `1,5` em fibras nas configurações transforma o campo em `NaN`; autosave aceita o estado não validado. | Aceitar vírgula decimal e impedir valores não finitos na persistência. |
| A03 | P2 | Dias com apenas extras alimentares são ignorados nas estatísticas por `todosPendentes`, embora o diário conte o extra. | Considerar extras ao determinar dia registrado. |
| A04 | P2 | Uma refeição de quatro, com três pendentes, produz 100% de aderência. Cores usam limites fixos 2000/2250 kcal, independentemente da meta. | Definir claramente aderência e referência individual, sem rotular automaticamente alimentação como boa/ruim. |
| A05 | P2 | Edição de extras usa índice: remover um item anterior pode fazer “Atualizar” alterar outro. IA preenche formulário sem sair do modo edição. | IDs estáveis, preservar contexto e separar inclusão de edição. |
| A06 | P2 | Datas/formulários/requisições não têm proteção suficiente contra troca de dia e respostas atrasadas. A data ativa não vira automaticamente à meia-noite. | Cancelar/descartar respostas antigas e deixar dia de destino explícito. |
| A07 | P2 | Documentos legados sem `extras_globais` não são normalizados no carregamento; regras rejeitam sua regravação. | Normalização compatível; cenário sem esse campo testado no emulador. |
| A08 | P2 | Toast “Desfazer” é substituído pelo “Salvo”; wrapper com `pointer-events-none`; desfazer regrava estado antigo inteiro. | Ação acessível e atômica só sobre a refeição afetada. |
| A09 | P2 | Evolução carrega 20 treinos e calcula métricas sobre esse subconjunto. Com 36 treinos em 12 semanas, mostrou só 20 e recorde 39 kg, omitindo registro de 100 kg. | Agregações completas; paginação independente da seleção de exercício. |
| A10 | P2 | Evolução procura nome de rotina e meta em `PROTOCOLO_BASE`, não no plano personalizado. | Usar IDs e snapshots do protocolo efetivamente executado. |
| A11 | P2 | Medidas iguais geram `'0.0'` string; comparação `diff === 0` falha e gera seta/cor de mudança. | Comparação numérica antes da formatação. |
| A12 | P2 | Filtro “Semana” das medidas não filtra o histórico nem o gráfico principal, apenas partes da tela. | Aplicar filtro consistentemente ou explicitar alcance. |
| A13 | P2 | Execução exige carga > 0 e impede registrar exercício com peso corporal/carga externa zero; aceita repetições fracionadas. | Distinguir peso corporal, carga externa, unidades e limites. |
| A14 | P2 | Referência de carga usa somente a última sessão: exercício pulado perde a referência da sessão anterior; identificação só por nome mistura duplicados. | Consultar último registro válido por ID estável do exercício. |
| A15 | P2 | Ao falhar a leitura do histórico de uma nova rotina, `topSetData` antigo pode permanecer sob a nova rotina. Rascunhos não validam exercícios alterados/excluídos. | Limpar/validar estado por rotina e versão de rascunho. |
| A16 | P2 | Finalização cria ID aleatório e reabilita botão antes de sair da tela; repetição/retry pode duplicar sessão. | Idempotência por sessão e bloqueio até a conclusão. |
| A17 | P2 | `RhythmChart` não recebe `score`/`variacao`: anuncia 0% e “Estável” mesmo com histórico. | Passar dados calculados e testar estados de alta/baixa/zero. |
| A18 | P2 | Ritmo mistura janelas diferentes: exemplo com 4 treinos há 5–8 dias retorna score 100, variação +4 e ponto final 0. Dias ativos são chamados de “sessões” na semana. | Uma definição consistente de ritmo e rótulos corretos para dias versus sessões. |
| A19 | P2 | Bloqueio lexical da IA rejeita “Banana antes do treino” e “Sal de mesa” antes de consultar Gemini. | Validação contextual, sem proibir palavras isoladas de descrições alimentares válidas. |
| A20 | P2 | Worker aceita resposta nova sem fibras como 0; `null`, booleano e string vazia viram macros 0. Confirmado com JWTs de teste e resposta do provedor simulada. | Schema de resposta estrito; não confundir desconhecido com zero. |
| A21 | P2 | Cliente IA não tem prazo máximo/cancelamento; busca de JWKS no Worker também não. O timeout de 45 s cobre só a chamada Gemini. | Timeout ponta a ponta, mensagens por etapa e identificação de requisição. Não afirmar que isso explica os erros antigos sem logs correlacionados. |
| A22 | P2 | Rate limit do Worker é `Map` em memória por instância, não cota global por usuário. | Controle distribuído conforme limite desejado; não usar este contador como garantia de orçamento SaaS. |
| A23 | P2 | Migração de convidado lê UID antigo depois de trocar a autenticação. Regras negam corretamente essa leitura; com anônimo automático, a própria tela de login não é apresentada. | Definir fluxo de convidado e vínculo de credenciais. Configuração real do provedor anônimo não foi consultada. |
| A24 | P2 | Modais não gerenciam foco/Escape/restauração; nav não anuncia aba atual; formulário de medidas não associa labels aos inputs. | Testes por teclado/leitor de tela e correções sem redesign. |
| A25 | P2 | Card Ritmo cortado em 320 px, textos truncados também em 390 px; nav inferior sem `safe-area-inset-bottom`. | Ajustes mobile; validar iPhone instalado e fontes ampliadas antes de afirmar compatibilidade. |
| A26 | P2 | HTTP de raiz/rotas sem extensão não recebe CSP do padrão configurado para arquivos. CSP existente é report-only, não proteção ativa. Raiz usa cache de 1 hora. | Corrigir abrangência dos headers e testar atualização entre versões; CSP não substitui autenticação. |
| A27 | P2 | URL inexistente responde 200 com HTML da Home: potencial soft 404. | 404 real para rotas inexistentes, preservando app e páginas públicas. Sitemap/robots respondem 200 corretamente nesta auditoria. |
| A28 | P2 | `npm audit` reportou 19 pacotes afetados: 2 críticos, 7 altos, 10 moderados. | Triagem e atualização testada; não executar `audit fix --force`. `tar` vem do CLI Capacitor; `websocket-driver` da árvore Firebase Database; não foi demonstrada exploração no bundle do site. |
| A29 | P2 | Muitos testes de segurança da IA verificam texto/regex de arquivos, não comportamento. Passaram apesar dos casos inválidos comprovados. | Converter casos críticos em testes executáveis de integração/regressão. |

## O que passou / o que não deve ser tratado como erro comprovado

- Worker publicado: GET com origem válida → 405; POST sem credenciais → 401; origem não permitida → 403; tokens inválidos → 401.
- Worker local real com JWTs assinados de teste: expiração, audiência errada, assinatura adulterada e App Check de outro app foram rejeitados; JSON inválido por contrato e corpo grande também. Resposta válida preservou fibras.
- Sitemap publicado: XML com namespace correto e quatro URLs, HTTP 200 e Content-Type XML; robots referencia esse sitemap. Mensagem de XML sem estilo no navegador não é defeito.
- `purpose: "any maskable"` é válido no manifest; não registrar como erro.
- A ausência das páginas públicas na denylist do service worker, isoladamente, **não prova** que elas são substituídas pela Home: o precache Workbox trata clean URLs. Testar navegação controlada antes de concluir.
- Não foi demonstrado vazamento entre contas nem exposição atual da chave Gemini no cliente. Confirmar rotação da chave historicamente exposta continua pendente.
- Política antibruteforce do Firebase Console, IAM, backup/restauração e cotas efetivas não foram auditados diretamente. Bloqueio em localStorage é UX, não garantia contra bots.
- Os erros intermitentes 429/502/504 relatados anteriormente ainda precisam de teste autenticado e correlação de logs; esta auditoria não atribui causa ao PC, ao reCAPTCHA ou ao texto sem evidência.

## Ordem sugerida do plano

1. Preservar dados: C01–C05, A05–A08, com testes que reproduzam perda/sobrescrita.
2. Endurecer contrato/validação: C06, A01–A02, A13; migrar dados com segurança antes de regras restritivas.
3. Tornar números confiáveis: A03–A04, A09–A12, A14, A17–A18 e snapshots históricos.
4. IA e operação: C07, A19–A23, A28–A29, credenciais antigas e logs.
5. Acessibilidade, responsividade, SEO/PWA: A24–A27 e matriz real de navegadores.

Cada etapa deve terminar com lint, testes, build e revisão local. Produção só depois da validação e autorização.

## Referências oficiais consultadas

- [Firebase: vincular conta anônima a credenciais permanentes](https://firebase.google.com/docs/auth/web/anonymous-auth).
- [Cloudflare: funcionamento e ciclo de vida das instâncias Workers](https://developers.cloudflare.com/workers/reference/how-workers-works/).
- [Workbox: roteamento de navegação](https://developer.chrome.com/docs/workbox/modules/workbox-routing).
- [Google: códigos HTTP e rastreamento](https://developers.google.com/crawling/docs/troubleshooting/http-status-codes).

## Alterações desta auditoria

Implementadas localmente, **sem commit/deploy**:

- `src/components/pages/Configuracao.jsx`: autosave exige carregamento bem-sucedido e edição; interface impede editar plano não carregado; respostas de leituras antigas são descartadas. A IA usa ID da refeição e estado atual, descarta resultado se a refeição/alimentos mudaram ou a tela foi desmontada. Textos de alimentos agora são associados ao ID, não à posição da lista. Todas as gravações de configuração dessa tela passam pela validação comum.
- `src/utils/configValidation.js`: validação numérica que permite zero/vírgula e rejeita valores vazios, não finitos e fora de faixa; sanitização sem mutar o formulário.
- `src/App.jsx`: limpa usuário visual ao encerrar/trocar sessão e impede callbacks antigos de restaurarem outra sessão. Comportamento de entrada anônima automática foi preservado, não redesenhado.
- `tests/config-validation.unit.spec.js`: dois testes novos de zero/vírgula/valores inválidos e preservação de campos/imutabilidade.

Verificação histórica depois do primeiro bloco: lint passou; build passou; **26/26 testes unitários passaram**; `git diff --check` não apontou erros (somente avisos de normalização CRLF de arquivos que já tinham alterações). As regras foram revalidadas posteriormente com 28/28 testes, e o reteste principal das telas foi concluído no bloco de 2026-09-09 acima.

### Retomada obrigatória

1. Confirmar se limite é 20% restantes; verificar uso atual.
2. Reabrir harness e repetir: cenário lento sem gravação inicial; erro de leitura sem permitir edição; zero/vírgula; IA em andamento com edição de outra meta, alteração/exclusão da refeição e navegação; logout com anônimo desativado.
3. Completar testes automatizados de comportamento desses três fluxos. Os novos testes unitários cobrem validação, não o ciclo de vida React.
4. Corrigir C02 (concorrência do diário) e C03 (snapshots nutricionais); ambos **continuam presentes**. Preferir transações/operações por item, não regravar documento inteiro de estado antigo. Não tentar recuperar valores históricos que nunca foram salvos.
5. Continuar C06/C07 e demais achados, preservando dados legados; não subir regras/dependências em massa.

Cuidados restantes em Configurações: há gravações de documento completo, portanto concorrência entre dois aparelhos ainda deve ser abordada; sair antes do debounce pode descartar uma edição pendente. Validar compatibilidade com planos antigos que não tenham todos os campos antes de considerar pronto para produção.
