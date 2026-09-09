# Worker de análise de refeições

Este Worker substitui a Cloud Function usada pela análise de refeições. O usuário continua usando o mesmo botão no app; a chave Gemini fica somente no secret do Cloudflare.

## Configuração única

Na pasta deste Worker (produção):

```bash
npm install -D wrangler
npx wrangler login
npx wrangler secret put GEMINI_API_KEY
npx wrangler deploy --env=""
```

Depois, copie a URL publicada para o `.env` do frontend:

```env
VITE_AI_BACKEND_URL=https://akrgym-analisar-refeicao.<sua-conta>.workers.dev
```

Para testar pelo localhost em um Worker separado:

```bash
npx wrangler secret put GEMINI_API_KEY --env staging
npx wrangler deploy --env staging
```

O staging publica em `akrgym-analisar-refeicao-staging.<sua-conta>.workers.dev` e
aceita somente `localhost`/`127.0.0.1`. Nunca habilite `ALLOW_LOCAL_ORIGIN` no
Worker de produção.

O `.env` não deve ser commitado. Para testar localmente, copie `.dev.vars.example` para `.dev.vars`, preencha a chave e execute `npx wrangler dev`.

O Worker valida:

- token de sessão do Firebase Auth;
- token Firebase App Check (reCAPTCHA Enterprise);
- origem permitida;
- payload e valores retornados pelo Gemini;
- limite de 10 análises por minuto por usuário e uma análise simultânea.

O deploy é separado do Firebase Hosting. Nenhuma chave deve ser colocada em `VITE_*`.
