import { GoogleGenerativeAI } from '@google/generative-ai'

export async function calcularMacrosIA(textoAlimentos) {
  const key = localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY
  if (!key) throw new Error('Chave da API Gemini não configurada. Adicione em Configurações.')

  const genAI = new GoogleGenerativeAI(key)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const prompt = `Você é um assistente de nutrição especialista em tabelas brasileiras (TACO/TBCA).
Calcule os macronutrientes TOTAIS da seguinte refeição completa: "${textoAlimentos}"
Some os valores de todos os alimentos listados.
Responda SOMENTE com um objeto JSON puro, sem markdown, sem texto adicional, começando com { e terminando com }:
{ "kcal": número, "p": número, "c": número, "g": número }
Onde: kcal = calorias totais, p = proteínas em gramas, c = carboidratos em gramas, g = gorduras em gramas.
Arredonde para números inteiros.`

  const result = await model.generateContent(prompt)
  const raw = result.response.text().trim()
  const cleaned = raw.replace(/```json?/gi, '').replace(/```/g, '').trim()

  let parsed
  try { parsed = JSON.parse(cleaned) }
  catch { throw new Error('IA retornou resposta inválida. Tente novamente.') }

  if (parsed.kcal == null || parsed.p == null) throw new Error('Resposta incompleta da IA.')

  return { kcal: Math.round(parsed.kcal), proteinas: Math.round(parsed.p), carboidratos: Math.round(parsed.c), gorduras: Math.round(parsed.g) }
}
