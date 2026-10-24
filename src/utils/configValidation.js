export const LIMITE_NOTA = 120

export function validarNumeroConfig(valor, min, max, nome) {
  const texto = String(valor ?? '').trim().replace(',', '.')
  const numero = texto === '' ? NaN : Number(texto)
  if (!Number.isFinite(numero) || numero < min || numero > max) {
    throw new Error(`${nome} inválido — deve ser entre ${min} e ${max}.`)
  }
  return numero
}

// Nome em branco é digitação em andamento. O exercício vai para o banco com o
// nome que já estava salvo; se ainda não existe lá (acabou de ser criado),
// fica só na tela até ganhar nome. O resto da configuração é gravado normalmente.
export function comNomesGravaveis(config, salvo) {
  const treinos = Object.fromEntries(Object.entries(config.treinos || {}).map(([key, rotina]) => {
    const anteriores = salvo?.treinos?.[key]?.exercicios || []
    const exercicios = (rotina?.exercicios || []).flatMap(ex => {
      if (String(ex?.nome || '').trim()) return [ex]
      const anterior = ex?.id && anteriores.find(item => item?.id === ex.id && String(item.nome || '').trim())
      return anterior ? [{ ...ex, nome: anterior.nome }] : []
    })
    return [key, { ...rotina, exercicios }]
  }))
  return { ...config, treinos }
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
    exercicios: (rotina.exercicios || []).map(ex => {
      const copia = {
        ...ex,
        // Carga em branco significa "ainda sem carga para este exercício" e continua em branco.
        base_top: String(ex.base_top ?? '').trim() === '' ? '' : validarNumeroConfig(ex.base_top, 0, 9999, `Base Top de "${ex.nome}"`),
        descanso_segundos: validarNumeroConfig(ex.descanso_segundos ?? 90, 15, 600, `Descanso de "${ex.nome}"`),
      }
      if (typeof ex.nota === 'string') {
        const nota = ex.nota.trim().slice(0, LIMITE_NOTA)
        if (nota) copia.nota = nota
        else delete copia.nota
      }
      return copia
    }),
  }]))
  const salvo = { ...config, metas, refeicoes, treinos }
  if (config.metaTreinosSemana !== undefined) {
    salvo.metaTreinosSemana = Math.round(validarNumeroConfig(config.metaTreinosSemana, 1, 7, 'Meta de treinos por semana'))
  }
  return salvo
}
