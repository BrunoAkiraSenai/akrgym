// Gera cloudflare-worker/analisar-refeicao/src/taco.js a partir do taco4.json
// do repositório IgorFZ/taco-br (extraído do PDF oficial da TACO 4ª ed.).
// Uso: node tools/taco/gerar-taco.mjs caminho/para/taco4.json
import { readFileSync, writeFileSync } from 'node:fs'

const origem = process.argv[2]
if (!origem) { console.error('Informe o caminho do taco4.json'); process.exit(1) }
const bruto = JSON.parse(readFileSync(origem, 'utf8'))
const lista = Array.isArray(bruto) ? bruto : bruto.alimentos || Object.values(bruto).find(Array.isArray)
if (!Array.isArray(lista)) { console.error('Formato inesperado'); process.exit(1) }

// "Tr" (traço), "NA" e células vazias chegam como null: na soma valem 0.
const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
// Alimento com kcal ou macro "em reavaliação" ou não analisado (ex.: leite
// integral na 4ª ed.) fica fora: somar 0 seria pior que a estimativa da IA.
const ESSENCIAIS = ['energia_kcal', 'proteina_g', 'lipideos_g', 'carboidrato_g']
const incompleto = a => ESSENCIAIS.some(c => a.composicao_centesimal?.[c] == null && !['TRACO', 'NAO_APLICAVEL'].includes(a.qualificadores?.[c]))
const fora = lista.filter(incompleto)
console.log(`${fora.length} fora por valor ausente: ${fora.map(a => a.id).join(', ')}`)

const alimentos = lista.filter(a => !incompleto(a)).map(a => {
  const c = a.composicao_centesimal || {}
  return {
    id: a.id,
    nome: String(a.descricao).trim(),
    kcal: num(c.energia_kcal),
    proteinas: num(c.proteina_g),
    carboidratos: num(c.carboidrato_g),
    gorduras: num(c.lipideos_g),
    fibras: num(c.fibra_alimentar_g),
  }
}).filter(a => a.nome && Number.isFinite(a.id))

const linhas = alimentos.map(a => `  ${JSON.stringify(a)},`).join('\n')
const destino = new URL('../../cloudflare-worker/analisar-refeicao/src/taco.js', import.meta.url)
writeFileSync(destino, `// Gerado por tools/taco/gerar-taco.mjs — não editar à mão.
// Fonte: TACO 4ª ed. (NEPA/UNICAMP, 2011), via github.com/IgorFZ/taco-br. Valores por 100 g.
// "Reprodução parcial ou total permitida, desde que citada a fonte."
export default [
${linhas}
]
`)
console.log(`${alimentos.length} alimentos gravados`)
