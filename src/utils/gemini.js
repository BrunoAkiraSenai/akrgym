import { GoogleGenerativeAI } from '@google/generative-ai'
import { NUTRITION_RESULT_ERROR, validarResultadoMacros, validarTextoAlimento } from './nutrition.js'

/**
 * calcularMacrosIA — análise de macros via Gemini.
 *
 * IMPORTANTE (decisão de produto): a chave da API é injetada em build via
 * `VITE_GEMINI_API_KEY` e fica visível no bundle JS do navegador. Isso é
 * intencional: o tier gratuito do Gemini não permite expor cobrança caso
 * a chave vaze, e a conta é pessoal (1 usuário).
 *
 * Se um dia migrar para Cloud Function, basta trocar esta implementação
 * por `fetch(...)` e remover `@google/generative-ai` das dependências.
 * A Cloud Function `analisarRefeicao` em `functions/index.js` está pronta
 * para ser ativada nesse caso.
 */

const FALLBACK = { nome: '', kcal: 0, proteinas: 0, carboidratos: 0, gorduras: 0, _erro: null }

export async function calcularMacrosIA(textoAlimentos) {
  const texto = typeof textoAlimentos === 'string' ? textoAlimentos.trim() : ''
  const erroDeEntrada = validarTextoAlimento(texto)
  if (erroDeEntrada) return { ...FALLBACK, nome: texto, _erro: erroDeEntrada }

  const key = localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY
  if (!key) return { ...FALLBACK, nome: texto, _erro: 'Chave da API Gemini não configurada. Adicione em Configurações.' }

  try {
    const genAI = new GoogleGenerativeAI(key)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `Você é um assistente de nutrição especialista em tabelas brasileiras (TACO/TBCA).
Analise somente alimentos, bebidas ou ingredientes consumíveis. Objetos, móveis, eletrônicos, exercícios, serviços, pessoas e textos sem relação com alimentação devem ser rejeitados.
Calcule os macronutrientes TOTAIS da seguinte refeição completa: "${texto}"
Some os valores de todos os alimentos listados.
Responda SOMENTE com um objeto JSON puro, sem markdown, sem texto adicional, começando com { e terminando com }.
Para uma entrada alimentar válida, use: { "valido": true, "kcal": número, "p": número, "c": número, "g": número }
Para uma entrada que não seja alimento ou bebida, use: { "valido": false, "kcal": 0, "p": 0, "c": 0, "g": 0 }
Onde: kcal = calorias totais, p = proteínas em gramas, c = carboidratos em gramas, g = gorduras em gramas.
Arredonde para números inteiros. Nunca invente macros para entradas inválidas.`

    const result = await model.generateContent(prompt)

    const rawText = result.response?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!rawText) throw new Error('Resposta vazia da IA')

    const cleaned = rawText.replace(/```json?/gi, '').replace(/```/g, '').trim()

    let parsed
    try { parsed = JSON.parse(cleaned) }
    catch { throw new Error('Resposta inválida (não JSON)') }

    if (typeof parsed.valido !== 'boolean' || typeof parsed.kcal !== 'number' || typeof parsed.p !== 'number' || typeof parsed.c !== 'number' || typeof parsed.g !== 'number') {
      throw new Error('Campos nutricionais ausentes no formato esperado')
    }

    const erroNutricional = validarResultadoMacros(parsed)
    if (erroNutricional) return { ...FALLBACK, nome: texto, _erro: erroNutricional }

    return { nome: texto, kcal: Math.round(parsed.kcal), proteinas: Math.round(parsed.p), carboidratos: Math.round(parsed.c), gorduras: Math.round(parsed.g) }
  } catch (err) {
    const mensagem = err.message === NUTRITION_RESULT_ERROR ? err.message : `IA indisponível: ${err.message}. Use o formulário manual.`
    return { ...FALLBACK, nome: texto, _erro: mensagem }
  }
}
