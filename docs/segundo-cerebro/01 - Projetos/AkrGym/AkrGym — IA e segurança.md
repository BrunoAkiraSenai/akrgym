---
tipo: segurança
projeto: AkrGym
status: ativo
atualizado: 2026-09-08
date: 2026-09-08
type: security
tags: [security, ai, akrgym]
ai-first: true
confidence: medium
---

# AkrGym — IA e segurança

## For future agent
This note describes the AkrGym Gemini request boundary, controls and residual risks observed on 2026-09-08. It is a security snapshot; confirm Worker configuration, token verification and limits in the live environment before relying on it.

## Decisão atual

A chave Gemini não deve ficar no frontend. O frontend chama um Cloudflare Worker autenticado; o Worker guarda `GEMINI_API_KEY` como secret e chama o Gemini. O usuário não cola chave nas configurações.

## Controles em vigor

- Firebase Auth ID token verificado no Worker.
- Firebase App Check verificado no Worker.
- CORS por allowlist de origens; localhost só no staging.
- Limite de corpo (8 KiB), JSON obrigatório e campos permitidos.
- Limite de requisições por usuário e bloqueio de concorrência ativa.
- Timeout da chamada Gemini e resposta JSON validada antes de retornar.
- Prompt orientado por bases brasileiras (TACO/TBCA), limite de texto e rejeição de conteúdo claramente fora do contexto.
- Chave removida da UI e do caminho normal do cliente.
- Regras Firestore isolam documentos por usuário e bloqueiam alterações indevidas de histórico.

## Testes já executados

Foram testados no endpoint público casos de GET, origem errada, ausência de autenticação, JWT expirado/tamperizado/audience errada, App Check inválido, corpo não JSON, campo extra, corpo grande e resposta inválida. O comportamento esperado foi 401/403/405/413/415/422 conforme o caso.

Também foram observados 429 (limite), 502 e 504 (falha/timeout upstream). O fato de um teste no celular funcionar não garante que o caminho do PC esteja saudável: navegador, rede, App Check, CORS e timeout podem diferir.

## Riscos restantes

## Atualização de implementação — 2026-09-09

- Cliente agora cancela uma chamada após 55 s; o Worker mantém 45 s para o Gemini e 8 s para JWKS. Esses limites melhoram encerramento previsível, mas não eliminam a necessidade de observar 502/504.
- O contrato nutricional passou a exigir `kcal`, `p`, `c`, `g` e `fibras` como números finitos; fibra ausente não é mais convertida silenciosamente em zero.
- A validação lexical permite contexto alimentar em frases como “Banana antes do treino” e “Sal de mesa”, mantendo o bloqueio de entradas claramente não alimentares.
- A checagem de build de produção exige `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` e rejeita token de debug. O valor da chave não é armazenado no cofre.

Confiança: alta para testes locais; média para latência real do Worker/Gemini, que ainda requer correlação de logs autenticados.

- Rate limit em memória de uma única instância não é garantia distribuída; usar Durable Objects/KV ou mecanismo equivalente quando a escala exigir.
- Mensagens 502/504 precisam de logs e correlação por request id para distinguir Gemini lento, Worker, rede ou cliente.
- Rotação e revogação da chave devem ser procedimento documentado no Cloudflare, sem registrar o valor no cofre.
- O cliente precisa lidar com retry com backoff, cancelamento e resposta tardia.
- Termos lexicais de segurança podem produzir falsos positivos; revisar com casos reais antes de ampliar.
- Fibras ausentes na resposta devem virar zero somente quando essa decisão estiver explícita no contrato.
- App Check de debug é apenas para desenvolvimento; nunca reutilizar token de debug em produção.

## Checklist de incidente da IA

- [ ] Registrar horário, ambiente, URL, status HTTP e request id (sem dados sensíveis).
- [ ] Conferir logs do Worker e status/latência do Gemini.
- [ ] Verificar expiração e audience do Auth token e App Check.
- [ ] Conferir CORS/origem efetiva do navegador.
- [ ] Testar descrição curta e longa separadamente.
- [ ] Verificar rate limit antes de repetir muitas tentativas.
- [ ] Só alterar código depois de reproduzir e capturar evidência.

## Segredos

Esta nota não contém API keys, tokens, service accounts ou valores de `.env`. A documentação operacional só deve registrar o nome do secret e o local onde ele é configurado.

[[AkrGym — Arquitetura técnica]] · [[Operação do AkrGym]] · [[AkrGym — Auditoria 2026-09-08]]
