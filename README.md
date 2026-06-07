# 🏋️ AkrGym

**Aplicativo web mobile-first de academia/personal training com diário alimentar e análise por IA.**

![License](https://img.shields.io/badge/license-MIT-green)
![Firebase](https://img.shields.io/badge/Firebase-12.14-orange)
![React](https://img.shields.io/badge/React-19.2-blue)
![Vite](https://img.shields.io/badge/Vite-8.0-purple)

> Criado por Bruno Akira Furumori para uso pessoal, com arquitetura multiusuário.
>
> 🔗 **Produção:** [akrgym.web.app](https://akrgym.web.app)

---

## ✨ Funcionalidades

### 🏠 Dashboard
- Streak de dias consecutivos de treino
- Frequência semanal com calendário visual
- Último treino com tempo relativo
- Botão rápido "Iniciar Treino do Dia"

### 🏋️ Execução de Treino
- Protocolo **Top Set / Back-Off** com aquecimento e preparatória
- Referência automática do último treino
- Regra especial para agachamento (barra olímpica, -10% back-off)
- Auto-save com localStorage e recuperação de rascunho
- Busca de exercícios em tempo real

### 🥗 Diário Alimentar
- 4 refeições fixas com status: pendente, limpo, customizado, pulado
- Extras globais (fora da dieta)
- **IA Gemini** — descreva o prato e ela preenche os macros automaticamente
- Rate limiting + cache de análise
- Heatmap mensal de calorias
- Indicador de aderência (verde/amarelo/vermelho)
- Undo com toast por 5s

### 📈 Evolução
- Gráfico SVG de progresso de carga por exercício
- Medidas corporais: peso, cintura, abdômen, braço, peito, coxa
- Gráfico Canvas de tendência de peso
- Comparação entre primeira e última medida
- Filtro por período (semana/mês/tudo)
- Paginação com "Carregar mais"

### ⚙️ Configurações
- CRUD completo de treinos (divisões + exercícios)
- CRUD de refeições com cálculo de macros por IA
- Metas diárias com sincronização automática
- Auto-save com debounce

---

## 🛠️ Stack

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| React | 19.2.6 | Framework |
| Vite | 8.0 | Build tool |
| Tailwind CSS | 4 | Estilização |
| Firebase | 12.14 | Auth + Firestore + Hosting |
| Gemini AI | 0.24 | Análise nutricional |
| Lucide React | 1.17 | Ícones |
| Fonte Inter | — | Tipografia |

## 🏗️ Arquitetura

```
AkrGym/
├── src/
│   ├── App.jsx              ← Router condicional + auth
│   ├── firebase.js           ← Firebase init + cache offline
│   ├── index.css             ← Tailwind + tema Neon Forge
│   ├── config/               ← Refeições e protocolo base
│   ├── context/              ← UserContext (hook useUser)
│   ├── utils/gemini.js       ← IA Gemini para macros
│   └── components/
│       ├── pages/            ← 6 páginas (lazy loaded)
│       ├── Layout.jsx        ← Nav inferior fixa
│       ├── OnboardingWizard  ← Setup inicial (3 opções)
│       └── ...
├── firestore.rules           ← Regras de segurança
└── firestore.indexes.json    ← Índices compostos
```

### Fluxo de Autenticação
1. `onAuthStateChanged` → se sem sessão, tenta `signInAnonymously`
2. Se anônimo falhar (desabilitado), mostra tela de Login
3. Login com e-mail/senha ou Google
4. Migração automática de dados anônimos para conta permanente

### Estrutura Firestore
```
users/{uid}/
├── config/data          ← Treinos, refeições, metas
├── historico_treinos/   ← Histórico de treinos executados
├── diario_dieta/        ← {YYYY-MM-DD}: refeições do dia
└── historico_corporal/  ← Medidas corporais
```

---

## 🚀 Como rodar localmente

```bash
# 1. Clone
git clone https://github.com/BrunoAkiraSenai/akrgym.git
cd akrgym

# 2. Instale dependências
npm install

# 3. Configure Firebase
# Crie um arquivo .env na raiz com:
VITE_GEMINI_API_KEY=sua_chave_aqui

# 4. Rode em dev
npm run dev

# 5. Build para produção
npm run build
```

### Firebase (opcional, para deploy)

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only hosting,firestore --project akrgym
```

---

## 🧪 Preview Channel

O projeto usa **preview channels** do Firebase Hosting para testar mudanças sem afetar produção:

```bash
npm run build
firebase hosting:channel:deploy dev --project akrgym
```

Acesse em: `https://akrgym--dev-785gryhc.web.app`

---

## 🔐 Segurança

- Regras do Firestore restringem acesso por `auth.uid`
- Cache persistente offline (100 MB)
- Chave Gemini configurável via `.env` (não versionada)
- Service account key removida do git
- CORS configurado para domínios autorizados

---

## 📄 Licença

MIT © Bruno Akira Furumori

---

<p align="center">
  Feito com 💪 e ☕
</p>
