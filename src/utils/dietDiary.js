// Pure diary operations: transactions always apply an intent to the latest document.
const fields = ['kcal', 'proteinas', 'carboidratos', 'gorduras', 'fibras']
export const emptyMeal = () => ({ status: 'pendente', substituto: null, extra: [] })

export function nutrients(food = {}) {
  const result = Object.fromEntries(fields.map(key => {
    const value = Number(food?.[key])
    return [key, Number.isFinite(value) ? Math.max(0, value) : 0]
  }))
  if (food.kcal == null) result.kcal = result.proteinas * 4 + result.carboidratos * 4 + result.gorduras * 9
  return result
}

function legacyId(item, index) {
  let hash = 2166136261
  for (const char of JSON.stringify(item)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return `legacy-${index}-${(hash >>> 0).toString(16)}`
}

export function normalizeDay(day, date) {
  return {
    ...day, data: date,
    refeicoes: day?.refeicoes && typeof day.refeicoes === 'object' ? { ...day.refeicoes } : {},
    extras_globais: (Array.isArray(day?.extras_globais) ? day.extras_globais : []).map((item, i) => ({ ...item, id: item.id || legacyId(item, i) })),
  }
}

export function applyDiaryAction(day, date, action, plan = [], goals = {}) {
  const next = normalizeDay(day, date)
  // Only newly created days have a known original plan. Never invent a past plan.
  if (!day) {
    next.planejadas = plan.map(meal => meal.id)
    next.metas_snapshot = nutrients(goals)
  }
  if (action.type === 'meal') {
    const previous = next.refeicoes[action.id] || emptyMeal()
    if (action.expectedRevision && previous.revision !== action.expectedRevision) throw new Error('Esta refeição mudou. Atualize o diário antes de desfazer.')
    next.refeicoes[action.id] = action.restore
      ? { ...action.restore, revision: action.revision }
      : { ...previous, status: action.status, substituto: null, consumido: action.status === 'limpo' ? { ...nutrients(action.food), nome: action.food.nome || '' } : null, revision: action.revision }
  } else if (action.type === 'extra-add') {
    if (!next.extras_globais.some(item => item.id === action.item.id)) next.extras_globais.push(action.item)
  } else {
    const index = next.extras_globais.findIndex(item => item.id === action.id)
    if (index < 0) throw new Error('Este alimento já foi removido. Atualize o diário.')
    if (action.type === 'extra-edit') {
      if (JSON.stringify(next.extras_globais[index]) !== JSON.stringify(action.previous)) throw new Error('Este alimento foi alterado em outra sessão. Abra a edição novamente.')
      next.extras_globais[index] = action.item
    } else if (action.type === 'extra-remove') next.extras_globais.splice(index, 1)
    else throw new Error('Ação de diário inválida.')
  }
  if (next.extras_globais.length >= 100) throw new Error('O limite de alimentos extras deste dia foi atingido.')
  return next
}

export function diaryTotals(day, plan = []) {
  const total = nutrients()
  const add = food => { const values = nutrients(food); fields.forEach(key => { total[key] += values[key] }) }
  for (const [id, meal] of Object.entries(day?.refeicoes || {})) {
    if (['limpo', 'livre'].includes(meal?.status)) {
      const food = meal.consumido || plan.find(item => item.id === id)
      if (food) add(food)
    } else if (meal?.status === 'customizado' && meal.substituto) add(meal.substituto)
    // Extras represent consumed food even if the planned meal was skipped.
    for (const extra of meal?.extra || []) add(extra)
  }
  for (const extra of day?.extras_globais || []) add(extra)
  return total
}

export function hasLegacyNutrition(day) {
  return Object.values(day?.refeicoes || {}).some(meal => ['limpo', 'livre'].includes(meal?.status) && !meal.consumido)
}

export function diaryProgress(day, plan = []) {
  const meals = Object.values(day?.refeicoes || {})
  const planned = day?.planejadas?.length ?? plan.length
  const consumed = meals.filter(meal => ['limpo', 'livre', 'customizado'].includes(meal?.status)).length + (day?.extras_globais?.length || 0)
  const registered = consumed > 0 || meals.some(meal => meal?.status === 'pulado' || meal?.extra?.length > 0)
  return { planned, consumed, registered, percent: planned ? Math.min(100, Math.round(consumed / planned * 100)) : 0 }
}
