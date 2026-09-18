# AkrGym — Tutorial do colaborador: localhost e IA

Este tutorial prepara um colaborador para trabalhar na branch `QA` sem receber chaves de produção. O código vem do repositório GitHub privado; o pacote enviado pelo proprietário contém apenas o cérebro sanitizado e este guia.

## 1. Pré-requisitos

- Git com acesso ao repositório privado.
- Node.js 22 ou versão compatível com o workflow.
- npm e PowerShell.
- Acesso ao navegador e ao console de desenvolvimento.

Não instale dependências dentro do projeto antes de conferir a branch. Não copie `.env` do proprietário e não peça a chave Gemini.

## 2. Clonar e sincronizar o código

```powershell
git clone https://github.com/BrunoAkiraSenai/akrgym.git
cd akrgym
git fetch origin --prune
git switch QA
git pull --ff-only origin QA
git status --short --branch
```

O colaborador trabalha somente em `QA`. Nunca faça push, merge ou deploy em `PRD`.

## 3. Instalar dependências

```powershell
npm ci
```

## 4. Configurar o frontend local

Crie um arquivo local que nunca será commitado:

```powershell
Copy-Item .env.example .env.development.local
notepad .env.development.local
```

Use esta configuração mínima:

```env
VITE_AI_BACKEND_URL=https://akrgym-analisar-refeicao-staging.akrgym-analisar-refeicao-worker.workers.dev
VITE_FIREBASE_APPCHECK_DEBUG=
VITE_USE_AUTH_EMULATOR=
```

Não coloque `GEMINI_API_KEY`, service account, token Firebase, token App Check de outra pessoa ou qualquer segredo nesse arquivo. Após mudar `.env.development.local`, reinicie o Vite.

## 5. Iniciar o localhost

```powershell
npm run dev -- --host 0.0.0.0
```

Abra a URL informada pelo Vite, normalmente `http://localhost:5173`.

## 6. Liberar o App Check de desenvolvimento

1. Abra o console do navegador (`F12`) no localhost.
2. Procure a mensagem `App Check debug token`.
3. Copie o UUID exibido.
4. Envie apenas esse token ao proprietário por canal seguro.
5. O proprietário cadastra o token em **Firebase Console → App Check → Apps → Tokens de depuração**.
6. Recarregue o localhost.

O token de debug é somente para desenvolvimento. Nunca o use no build de produção e nunca o comite.

## 7. Testar a IA

1. Crie uma conta de teste ou entre com uma conta autorizada.
2. Abra **Dieta**.
3. Use uma descrição curta, por exemplo: `100g de brócolis cozido`.
4. Aguarde o resultado e confira kcal, proteínas, carboidratos, gorduras e fibras.
5. Teste também uma descrição longa e o fallback manual.

A chave Gemini fica no Worker Cloudflare. O computador do colaborador só chama o Worker de staging com Auth e App Check.

## 8. Diagnóstico rápido

| Sintoma | Verificação |
|---|---|
| `ERR_CONNECTION_REFUSED` | O processo Vite não está rodando ou a porta mudou. |
| `A proteção da IA ainda não está configurada` | Reinicie o Vite, confira App Check e o token de debug. |
| `403` | Token App Check não cadastrado, sessão ausente ou origem não autorizada. |
| `422` | Corpo fora do contrato; capture o texto enviado sem dados pessoais. |
| `429` | Limite do Worker; aguarde e não faça várias tentativas automáticas. |
| `502/504` | Falha/timeout do Worker ou Gemini; compare logs do staging antes de alterar código. |
| `Failed to fetch` | Confira a URL do Worker, CORS, rede e se o staging está publicado. |
| Login Google bloqueado | Teste primeiro e-mail/senha; verifique `localhost` nos domínios autorizados do Firebase. |

Ao reportar um erro, envie status HTTP, mensagem, horário, branch e passos de reprodução. Nunca envie tokens, chaves, payloads reais ou dados de usuários.

## 9. Validação antes do commit

```powershell
npm run lint
npm run test:unit
npm run build
git diff --check
```

Use `npm run test:rules` quando alterar Firestore/regras. Revise o diff e confirme que somente arquivos intencionais serão commitados.

## 10. Fluxo de colaboração

Antes de iniciar e antes de entregar:

```powershell
git fetch origin --prune
git switch QA
git pull --ff-only origin QA
```

Faça commits pequenos e específicos:

```powershell
git add <arquivos-intencionais>
git commit -m "tipo(escopo): descrição objetiva"
git push origin QA
```

Depois envie ao proprietário: objetivo, causa, arquivos alterados, testes, limitações, commit e confirmação de que `PRD` não foi alterada.

## 11. Como usar o Segundo Cérebro

O pacote também contém `segundo-cerebro/`, uma cópia sanitizada do contexto do projeto. Leia nesta ordem:

1. `_CLAUDE.md`;
2. `index.md` e `CRITICAL_FACTS.md`;
3. `00 - Painel/AkrGym — Hub.md`;
4. arquitetura, visão geral, backlog e operação;
5. o prompt de onboarding do colaborador.

Use o cérebro para entender decisões, invariantes, riscos e histórico. Confirme fatos mutáveis no código, no GitHub e no ambiente vivo. Ao criar uma decisão, bug ou tarefa importante, atualize a nota relacionada e faça commit somente em `QA`.

O cérebro não concede autorização para comandos perigosos, deploy ou acesso a segredos. Nunca adicione credenciais, tokens, dados de usuários, `.env` ou arquivos pessoais.
