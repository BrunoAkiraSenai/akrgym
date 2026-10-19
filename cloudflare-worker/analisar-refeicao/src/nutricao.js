// Conta nutricional feita pelo app, não pela IA.
// A IA só separa a descrição em itens (alimento, gramas, estado). Cada item é
// procurado na tabela TACO; achando, os valores saem da tabela (por 100 g).
// Sem correspondência segura, fica a estimativa que a própria IA deu para o item.

const ESTADOS = {
  cru: 'cru', crua: 'cru', crus: 'cru', cruas: 'cru',
  cozido: 'cozido', cozida: 'cozido', cozidos: 'cozido', cozidas: 'cozido',
  grelhado: 'grelhado', grelhada: 'grelhado', grelhados: 'grelhado', grelhadas: 'grelhado',
  assado: 'assado', assada: 'assado', assados: 'assado', assadas: 'assado',
  frito: 'frito', frita: 'frito', fritos: 'frito', fritas: 'frito',
  refogado: 'refogado', refogada: 'refogado',
  torrado: 'torrado', torrada: 'torrado',
}
export const ESTADOS_VALIDOS = ['cru', 'cozido', 'grelhado', 'assado', 'frito', 'refogado', 'torrado']

// Palavras que não ajudam a achar o alimento.
const VAZIAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'com', 'em', 'a', 'o', 'tipo', 'g', 'gramas'])

// Jeitos comuns de escrever que a TACO nomeia de outro modo.
// A primeira regra que casar vale.
const SINONIMOS = [
  [/\barroz branco\b|^arroz$/, 'arroz tipo 1'],
  [/\bpeito de frango\b|\bfile de frango\b|\bfrango file\b/, 'frango peito sem pele'],
  [/\bclaras?( de ovo)?\b/, 'ovo galinha clara'],
  [/\bovos?\b(?! de codorna)/, 'ovo galinha inteiro'],
  [/\bpao frances\b|\bpaozinho\b/, 'pao trigo frances'],
  [/\bpao de forma\b/, 'pao trigo forma'],
  [/\bfeijao\b(?! (preto|carioca|fradinho|rajado|jalo|rosinha|roxo|branco))/, 'feijao carioca'],
  [/\bcarne moida\b|\bpatinho moido\b/, 'carne bovina acem moido'],
  [/\bcontra ?file\b/, 'carne bovina contra file sem gordura'],
  [/\bmussarela\b|\bmucarela\b|\bmuzzarela\b/, 'queijo mozarela'],
  [/^banana$/, 'banana prata'],
  [/^requeijao\b/, 'queijo requeijao cremoso'],
  [/^macarrao$|\bmacarrao (de )?trigo\b/, 'macarrao trigo'],
]

// Começo do nome na TACO que é só categoria ("Carne, bovina, patinho"): a
// busca pode citar só o corte. Nos demais, o primeiro termo da tabela é o
// próprio alimento e precisa estar na busca ("maçã" não pode cair em
// "Banana, maçã").
const CATEGORIAS = new Set(['carne', 'bovina', 'peixe'])

// Variações que mudam muito o valor: só valem se a pessoa escreveu
// ("leite" não pode virar "leite em pó").
const SO_SE_PEDIDO = new Set(['po', 'instantaneo', 'milanesa', 'empanado', 'desidratado', 'manteiga', 'achocolatado'])

export function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function radical(palavra) {
  if (ESTADOS[palavra]) return ESTADOS[palavra]
  if (palavra.length > 4 && palavra.endsWith('oes')) return palavra.slice(0, -3) + 'ao'
  if (palavra.length > 3 && palavra.endsWith('s')) return palavra.slice(0, -1)
  return palavra
}

function tokens(texto) {
  return normalizar(texto).split(' ').filter(p => p && !VAZIAS.has(p)).map(radical)
}

export function estadoDoTexto(texto) {
  for (const palavra of normalizar(texto).split(' ')) if (ESTADOS[palavra]) return ESTADOS[palavra]
  return null
}

// Índice montado uma vez: tokens de cada alimento da tabela e o estado dele.
export function criarIndice(tabela) {
  return tabela.map(item => {
    const t = tokens(item.nome)
    return { item, tokens: new Set(t), cabeca: t[0], estado: t.find(p => ESTADOS_VALIDOS.includes(p)) || null, tamanho: t.length }
  })
}

/**
 * Procura o alimento na tabela.
 * Todas as palavras da busca precisam estar no nome da tabela; o estado (cru,
 * cozido...) precisa bater quando a tabela distingue estados. Entre os que
 * passam, vence o nome mais curto (menos detalhes que a pessoa não pediu).
 */
export function encontrarNaTabela(indice, alimento, estado) {
  let busca = normalizar(alimento)
  for (const [padrao, troca] of SINONIMOS) if (padrao.test(busca)) { busca = busca.replace(padrao, troca); break }
  const palavras = tokens(busca).filter(p => !ESTADOS_VALIDOS.includes(p))
  if (palavras.length === 0) return null
  const estadoBusca = estado && ESTADOS_VALIDOS.includes(estado) ? estado : null
  let melhor = null
  for (const entrada of indice) {
    if (!palavras.every(p => entrada.tokens.has(p))) continue
    if (!CATEGORIAS.has(entrada.cabeca) && !palavras.includes(entrada.cabeca)) continue
    if ([...entrada.tokens].some(p => SO_SE_PEDIDO.has(p) && !palavras.includes(p))) continue
    if (entrada.estado && estadoBusca && entrada.estado !== estadoBusca) continue
    // Sem estado informado, só aceita item da tabela que também não tem estado.
    if (entrada.estado && !estadoBusca) continue
    const sobra = entrada.tamanho - palavras.length - (entrada.estado ? 1 : 0)
    if (!melhor || sobra < melhor.sobra || (sobra === melhor.sobra && entrada.item.id < melhor.entrada.item.id)) melhor = { entrada, sobra }
  }
  return melhor ? melhor.entrada.item : null
}

const CAMPOS = ['kcal', 'proteinas', 'carboidratos', 'gorduras', 'fibras']
const arred = v => Math.round(v * 10) / 10

export function valoresPorGramas(por100, gramas) {
  const fator = gramas / 100
  return Object.fromEntries(CAMPOS.map(campo => [campo, arred((Number(por100[campo]) || 0) * fator)]))
}

function numeroValido(valor, maximo) {
  return typeof valor === 'number' && Number.isFinite(valor) && valor >= 0 && valor <= maximo
}

/**
 * Valida a resposta da IA (itens) e resolve cada item na tabela.
 * Retorna { itens, totais } ou { motivo } quando a resposta não serve.
 */
export function resolverItens(resposta, indice) {
  if (resposta?.valido === false) return { motivo: 'nao_alimento' }
  if (resposta?.valido !== true || !Array.isArray(resposta.itens)) return { motivo: 'formato' }
  if (resposta.itens.length === 0) return { motivo: 'nao_alimento' }
  if (resposta.itens.length > 30) return { motivo: 'limite' }
  const itens = []
  for (const bruto of resposta.itens) {
    const gramas = Number(bruto?.gramas)
    if (!numeroValido(gramas, 5000) || gramas === 0) return { motivo: 'formato' }
    const estimativa = { kcal: bruto?.kcal, proteinas: bruto?.p, carboidratos: bruto?.c, gorduras: bruto?.g, fibras: bruto?.fibras ?? 0 }
    if (!CAMPOS.every(campo => numeroValido(estimativa[campo], campo === 'kcal' ? 9999 : 999))) return { motivo: 'formato' }
    const estado = ESTADOS_VALIDOS.includes(bruto?.estado) ? bruto.estado : null
    const nome = String(bruto?.alimento || '').trim().slice(0, 80)
    if (!nome) return { motivo: 'formato' }
    const naTabela = encontrarNaTabela(indice, nome, estado)
    const base = {
      nome,
      gramas: Math.round(gramas),
      gramasEstimadas: bruto?.gramas_estimadas === true,
      estado,
      estadoInformado: bruto?.estado_informado === true,
    }
    if (naTabela) {
      const por100 = Object.fromEntries(CAMPOS.map(campo => [campo, Number(naTabela[campo]) || 0]))
      itens.push({ ...base, fonte: 'taco', referencia: naTabela.nome, por100, ...valoresPorGramas(por100, gramas) })
    } else {
      const por100 = Object.fromEntries(CAMPOS.map(campo => [campo, arred((estimativa[campo] / gramas) * 100)]))
      itens.push({ ...base, fonte: 'estimativa', referencia: null, por100, ...Object.fromEntries(CAMPOS.map(campo => [campo, arred(estimativa[campo])])) })
    }
  }
  const totais = somarItens(itens)
  if (totais.kcal > 9999 || ['proteinas', 'carboidratos', 'gorduras', 'fibras'].some(c => totais[c] > 999)) return { motivo: 'limite' }
  if (CAMPOS.every(campo => totais[campo] === 0)) return { motivo: 'nao_alimento' }
  return { itens, totais }
}

export function somarItens(itens) {
  const soma = Object.fromEntries(CAMPOS.map(campo => [campo, 0]))
  for (const item of itens) for (const campo of CAMPOS) soma[campo] += Number(item[campo]) || 0
  return Object.fromEntries(CAMPOS.map(campo => [campo, Math.round(soma[campo])]))
}
