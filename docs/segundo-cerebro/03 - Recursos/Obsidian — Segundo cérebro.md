---
tipo: recurso
assunto: Obsidian
status: referência
atualizado: 2026-09-08
date: 2026-09-08
type: resource
tags: [resource, obsidian, akrgym]
ai-first: true
---

# Obsidian — Segundo cérebro

## For future agent
This resource explains the Obsidian operating method adopted for AkrGym on 2026-09-08. It records durable workflow and security guidance; verify product behavior against current official Obsidian documentation when details may have changed.

## O que estamos construindo

Um segundo cérebro não é um arquivo morto. É um sistema para capturar, esclarecer, conectar, recuperar e transformar informação em decisões e entregas. Para o AkrGym, o cofre será a memória de contexto do produto; Git, Firebase e Cloudflare continuam sendo as fontes operacionais do software.

## Princípios do método

1. **Capturar sem interromper:** usar [[00 - Caixa de entrada]] para ideias rápidas.
2. **Processar em vez de acumular:** cada captura deve virar tarefa, decisão, pesquisa, bug ou ser descartada.
3. **Escrever notas atômicas:** uma nota deve responder a uma pergunta ou registrar uma decisão específica.
4. **Conectar:** cada nota relevante recebe links para projeto, área, fonte ou decisão relacionada.
5. **Usar hubs:** notas como [[00 - Painel/AkrGym — Hub]] funcionam como mapas de conteúdo e pontos de entrada.
6. **Revisar:** revisar o hub e a caixa de entrada regularmente; arquivar o que deixou de ser ativo.

## Estrutura adotada

- `00 - Painel`: hubs e índices.
- `01 - Projetos`: resultados com começo/fim, como o AkrGym.
- `02 - Áreas`: responsabilidades contínuas, como desenvolvimento e segurança.
- `03 - Recursos`: conhecimento reutilizável e pesquisas.
- `04 - Arquivo`: material inativo, preservado sem poluir o trabalho atual.
- `99 - Templates`: formatos repetíveis.

Essa é uma adaptação prática do PARA, combinada com notas atômicas e links. Pastas ajudam a encontrar; links e backlinks ajudam a pensar. Não vamos impor numeração Zettelkasten a todas as notas.

## Recursos nativos que usaremos

- **Links internos e backlinks:** conectam notas e permitem navegar pelas relações. O Obsidian atualiza links internos quando uma nota é renomeada ([documentação oficial de links internos](https://obsidian.md/help/Linking%2Bnotes%2Band%2Bfiles/Internal%2Blinks)).
- **Properties:** metadados pequenos e legíveis em YAML, como `tipo`, `status`, `projeto` e `atualizado`; eles podem ser pesquisados e filtrados ([documentação oficial de Properties](https://obsidian.md/help/properties)).
- **Templates:** inserem estruturas repetíveis e variáveis de data/título ([documentação oficial de Templates](https://obsidian.md/help/Plugins/Templates)).
- **Search:** permite `path:`, `tag:`, `task-todo:`, propriedades, frases exatas e consultas combinadas ([documentação oficial de Search](https://obsidian.md/help/Plugins/Search)).
- **Bases:** o plugin nativo cria visões de tabela/lista a partir das Properties; usar depois que houver volume suficiente ([documentação oficial de Bases](https://obsidian.md/help/bases/create-base)).
- **Daily notes:** registrar o que foi decidido ou aprendido no dia, mas transformar itens importantes em notas permanentes.

## Fluxo diário para o AkrGym

### Captura

Anotar rapidamente em `00 - Caixa de entrada.md`, sem escolher pasta perfeita.

### Processamento

Perguntar: “isso exige ação, preserva uma decisão, explica algo ou é apenas referência?”. Criar uma nota específica e ligá-la ao hub/projeto.

### Execução

Trabalhar no código local e registrar no projeto apenas o contexto, o resultado e os links para arquivos/commits. Não duplicar código no cofre.

### Revisão

No início ou fim da sessão: revisar tarefas abertas, atualizar status e registrar bloqueios. Antes de uma mudança arriscada: ler a nota de decisão e o último teste.

## Convenção de notas

Toda nota de trabalho deve ter Properties mínimas:

```yaml
---
tipo: projeto | area | recurso | bug | decisao | tarefa | auditoria
status: inbox | ativo | bloqueado | concluido | arquivado
projeto: AkrGym
atualizado: YYYY-MM-DD
---
```

Títulos devem ser específicos: `AkrGym — Snapshot de nutrientes históricos` é melhor que `Nutrição`.

## Segurança e privacidade

O vault local é composto por arquivos Markdown e não deve ser tratado como cofre de segredos. A documentação do Obsidian informa que plugins comunitários podem acessar arquivos do computador, conectar à internet e instalar programas; recomenda auditoria independente para dados sensíveis ([segurança de plugins](https://obsidian.md/help/plugin-security)). O Sync local/remoto pode usar criptografia ponta a ponta, mas a senha perdida não pode ser recuperada e o vault local não é criptografado por essa função ([segurança e privacidade do Sync](https://help.obsidian.md/Obsidian%20Sync/Security%20and%20privacy)).

Por isso: nada de `.env`, tokens, chaves, dados de usuários ou credenciais neste cofre. Se ativarmos Sync, criar backup antes e guardar a senha fora do vault.

## Como vou usar este cofre daqui em diante

- Antes de mudanças grandes, consultar o hub e o backlog.
- Depois de pesquisar, criar uma nota de recurso com fontes e aplicação prática.
- Depois de corrigir um bug, atualizar o registro do projeto com evidência e próxima pendência.
- Criar links entre decisões, bugs, pesquisas e tarefas; não deixar conclusões importantes apenas no chat.
- Não instalar plugins automaticamente: primeiro avaliar necessidade, manutenção, permissões e risco.

## Skill operacional instalada

Em 2026-09-08 foi instalada a skill `obsidian-second-brain` do repositório público `https://github.com/eugeniughelbur/obsidian-second-brain`. Ela orienta operação AI-first, busca antes de criar, propagação das alterações para notas relacionadas, catálogo em [[index]], log append-only em [[log]] e health checks. A skill está instalada localmente em `<CAMINHO_LOCAL_DA_SKILL>` e será usada quando esta conversa produzir decisões, tarefas, bugs, pesquisa ou trabalho de desenvolvimento relevante.

As automações agendadas e hooks de background não foram ativados automaticamente: exigem configuração explícita, revisão de permissões e um mecanismo de execução persistente. Até essa decisão, a manutenção é direta pelo filesystem e registrada em [[Logs/2026-09-08]].

## Fontes e data de revisão

Fontes oficiais consultadas em 2026-09-08. Revisar esta nota se o Obsidian mudar o comportamento de Properties, Bases, Templates, Sync ou plugins.
