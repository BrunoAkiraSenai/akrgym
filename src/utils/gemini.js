import { GoogleGenerativeAI } from '@google/generative-ai'

const FALLBACK = { nome: '', kcal: 0, proteinas: 0, carboidratos: 0, gorduras: 0, _erro: null }

export async function calcularMacrosIA(textoAlimentos) {
  const key = localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY
  if (!key) return { ...FALLBACK, nome: textoAlimentos.trim(), _erro: 'Chave da API Gemini não configurada. Adicione em Configurações.' }

  try {
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

    const rawText = result.response?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!rawText) throw new Error('Resposta vazia da IA')

    const cleaned = rawText.replace(/```json?/gi, '').replace(/```/g, '').trim()

    let parsed
    try { parsed = JSON.parse(cleaned) }
    catch { throw new Error('Resposta inválida (não JSON)') }

    if (typeof parsed.kcal !== 'number' || typeof parsed.p !== 'number' || typeof parsed.c !== 'number' || typeof parsed.g !== 'number') {
      throw new Error('Campos nutricionais ausentes no formato esperado')
    }

    return { nome: textoAlimentos.trim(), kcal: Math.round(parsed.kcal), proteinas: Math.round(parsed.p), carboidratos: Math.round(parsed.c), gorduras: Math.round(parsed.g) }
  } catch (err) {
    return { ...FALLBACK, nome: textoAlimentos.trim(), _erro: `IA indisponível: ${err.message}. Use o formulário manual.` }
  }
}
