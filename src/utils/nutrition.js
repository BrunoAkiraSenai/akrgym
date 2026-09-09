const NON_FOOD_TERMS = [
  'cadeira',
  'gamer',
  'mesa',
  'computador',
  'notebook',
  'celular',
  'telefone',
  'teclado',
  'mouse',
  'monitor',
  'televisao',
  'sofa',
  'cama',
  'carro',
  'moto',
  'academia',
]

const FOOD_CONTEXT_TERMS = [
  'arroz', 'feijao', 'frango', 'carne', 'peixe', 'banana', 'sal', 'pao', 'aveia',
  'ovo', 'leite', 'queijo', 'iogurte', 'fruta', 'legume', 'verdura', 'comida',
  'refeicao', 'almoco', 'jantar', 'cafe', 'bebida', 'suco', 'creme', 'milho',
  'brocolis', 'batata', 'azeite', 'macarrao', 'prato',
]

export const NUTRITION_INPUT_ERROR = 'Digite alimentos ou bebidas para calcular os macros. Ex.: arroz, frango e salada.'
export const NUTRITION_RESULT_ERROR = 'Não reconheci alimentos nessa descrição. Revise o texto e tente novamente.'

function normalizarTexto(texto) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/**
 * Bloqueia entradas obviamente fora do contexto antes de chamar a IA.
 * A lista é intencionalmente conservadora: nomes de alimentos desconhecidos
 * continuam sendo avaliados pelo modelo, mas objetos e serviços não.
 */
export function validarTextoAlimento(texto) {
  if (typeof texto !== 'string' || texto.trim().length < 3) return NUTRITION_INPUT_ERROR
  const normalizado = normalizarTexto(texto)
  const temContextoAlimentar = FOOD_CONTEXT_TERMS.some((termo) => normalizado.includes(termo))
  const temTermoNaoAlimentar = NON_FOOD_TERMS.some((termo) => {
    const expressao = new RegExp(`(^|[^a-z])${termo}(?=[^a-z]|$)`, 'i')
    return expressao.test(normalizado)
  })
  return temTermoNaoAlimentar && !temContextoAlimentar ? NUTRITION_INPUT_ERROR : null
}

/**
 * Valida a classificação e os números devolvidos pela IA.
 * Macros zerados não são um resultado nutricional utilizável e nunca devem
 * substituir o valor anterior do usuário.
 */
export function validarResultadoMacros(resultado) {
  if (!resultado || resultado.valido !== true) return NUTRITION_RESULT_ERROR
  // Fibra é opcional apenas para manter compatibilidade com análises antigas;
  // respostas novas da IA sempre a enviam.
  const campos = [resultado.kcal, resultado.p, resultado.c, resultado.g, resultado.fibras]
  if (!campos.every((valor) => typeof valor === 'number' && Number.isFinite(valor))) return NUTRITION_RESULT_ERROR
  const valores = campos
  if (!valores.every(Number.isFinite) || valores.some((valor) => valor < 0)) return NUTRITION_RESULT_ERROR
  if (valores.every((valor) => valor === 0)) return NUTRITION_RESULT_ERROR
  return null
}
