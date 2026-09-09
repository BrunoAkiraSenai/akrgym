export function validarNumeroConfig(valor, min, max, nome) {
  const texto = String(valor ?? '').trim().replace(',', '.')
  const numero = texto === '' ? NaN : Number(texto)
  if (!Number.isFinite(numero) || numero < min || numero > max) {
    throw new Error(`${nome} inválido — deve ser entre ${min} e ${max}.`)
  }
  return numero
}

export function prepararConfigParaSalvar(config) {
  const metas = { ...(config.metas || {}) }
  const campos = ['kcal', 'proteinas', 'carboidratos', 'gorduras', 'fibras']
  for (const campo of campos) {
    metas[campo] = validarNumeroConfig(metas[campo], 0, campo === 'kcal' ? 99999 : 9999, campo)
  }
  const refeicoes = (config.refeicoes || []).map(ref => {
    const copia = { ...ref }
    for (const campo of campos) {
      copia[campo] = validarNumeroConfig(ref[campo], 0, campo === 'kcal' ? 99999 : 9999, `${campo} de "${ref.nome}"`)
    }
    return copia
  })
  const treinos = Object.fromEntries(Object.entries(config.treinos || {}).map(([id, rotina]) => [id, {
    ...rotina,
    exercicios: (rotina.exercicios || []).map(ex => ({
      ...ex, base_top: validarNumeroConfig(ex.base_top, 0, 9999, `Base Top de "${ex.nome}"`),
    })),
  }]))
  return { ...config, metas, refeicoes, treinos }
}
