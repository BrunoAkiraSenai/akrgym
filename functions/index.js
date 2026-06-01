const functions = require('firebase-functions')
const admin = require('firebase-admin')
const { GoogleGenerativeAI } = require('@google/generative-ai')

admin.initializeApp()

const PROMPT = `Você é um assistente de nutrição de alta precisão focado estritamente no mercado de alimentação do BRASIL.
Ao analisar a refeição descrita pelo usuário, siga estas diretrizes estritas:
1. Priorize como fontes de dados a tabela TACO (Unicamp), TBCA (USP) e os menus nutricionais oficiais das filiais brasileiras de marcas de fast-food (ex: McDonald's Brasil, Burger King Brasil, Subway Brasil).
2. Se o usuário mencionar pratos regionais ou estabelecimentos locais (ex: 'parmegiana do Omatutinho'), estime o peso e os macros com base no modo de preparo e tamanho de porção tradicional de restaurantes brasileiros.
3. Retorne OBRIGATORIAMENTE apenas um objeto JSON puro, sem formatação markdown (sem \`\`\`json e sem \`\`\` no final), contendo as chaves:
{
  nome: string,
  kcal: number,
  p: number,
  c: number,
  g: number
}
Não adicione nenhum texto explicativo fora do JSON.`

exports.analisarRefeicao = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', 'https://akrgym.web.app')
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(204).send('')
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ erro: 'Método não permitido.' })
    return
  }

  const { texto, uid } = req.body || {}

  if (!uid || !texto) {
    res.json({ erro: 'Parâmetros inválidos.' })
    return
  }

  const apiKey = functions.config().gemini?.key
  if (!apiKey) {
    console.error('Chave Gemini nao configurada. Rode: firebase functions:config:set gemini.key="SUA_CHAVE"')
    res.json({ erro: 'Serviço de IA temporariamente indisponível. Tente novamente.' })
    return
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    const result = await model.generateContent(`${PROMPT}\n\nRefeição do usuário: "${texto}"`)
    const text = result.response.text().trim()
    const parsed = JSON.parse(text)

    if (parsed.kcal == null || parsed.p == null) {
      res.json({ erro: 'Resposta inválida da IA. Tente novamente.' })
      return
    }

    res.json({ nome: parsed.nome, kcal: parsed.kcal, p: parsed.p, c: parsed.c, g: parsed.g })
  } catch (err) {
    console.error('Erro Gemini:', err)
    res.json({ erro: 'Serviço de IA temporariamente indisponível. Tente novamente.' })
  }
})
