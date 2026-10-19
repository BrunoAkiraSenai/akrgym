// Detalhe por item da análise de alimento (Worker v2). A pessoa pode corrigir
// as gramas ou tirar um item; a conta é refeita com os valores por 100 g.

const CAMPOS = ['kcal', 'proteinas', 'carboidratos', 'gorduras', 'fibras']
const arred = v => Math.round(v * 10) / 10

function numero(valor) {
  const n = Number(valor)
  return Number.isFinite(n) && n >= 0 ? n : null
}

// Aceita só itens bem formados; qualquer coisa estranha some do detalhe
// (os totais do Worker continuam valendo).
export function normalizarItensIA(itens) {
  if (!Array.isArray(itens)) return []
  const validos = []
  for (const item of itens.slice(0, 30)) {
    const gramas = numero(item?.gramas)
    const por100 = item?.por100
    if (!gramas || !por100 || !CAMPOS.every(c => numero(por100[c]) !== null)) return []
    validos.push({
      nome: String(item.nome || '').slice(0, 80),
      referencia: item.referencia ? String(item.referencia).slice(0, 120) : null,
      fonte: item.fonte === 'taco' ? 'taco' : 'estimativa',
      estado: typeof item.estado === 'string' ? item.estado : null,
      estadoInformado: item.estadoInformado === true,
      gramasEstimadas: item.gramasEstimadas === true,
      por100: Object.fromEntries(CAMPOS.map(c => [c, Number(por100[c])])),
      ...recalcular(por100, gramas),
      gramas,
    })
  }
  return validos
}

function recalcular(por100, gramas) {
  return Object.fromEntries(CAMPOS.map(c => [c, arred((Number(por100[c]) || 0) * gramas / 100)]))
}

export function mudarGramas(itens, indice, gramas) {
  const valor = numero(gramas)
  if (valor === null || valor > 5000) return itens
  return itens.map((item, i) => (i === indice ? { ...item, gramas: valor, gramasEstimadas: false, ...recalcular(item.por100, valor) } : item))
}

export function removerItem(itens, indice) {
  return itens.filter((_, i) => i !== indice)
}

export function totaisDosItens(itens) {
  const soma = Object.fromEntries(CAMPOS.map(c => [c, 0]))
  for (const item of itens) for (const c of CAMPOS) soma[c] += Number(item[c]) || 0
  return Object.fromEntries(CAMPOS.map(c => [c, Math.round(soma[c])]))
}

const NOME_ESTADO = { cru: 'cru', cozido: 'cozido', grelhado: 'grelhado', assado: 'assado', frito: 'frito', refogado: 'refogado', torrado: 'torrado' }
export function rotuloEstado(item) {
  const nome = NOME_ESTADO[item.estado]
  if (!nome) return null
  return item.estadoInformado ? nome : `${nome} (presumido)`
}
