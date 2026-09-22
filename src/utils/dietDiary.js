// Pure diary operations: transactions always apply an intent to the latest document.
const fields = ['kcal', 'proteinas', 'carboidratos', 'gorduras', 'fibras']
const completedMealStatuses = ['limpo', 'livre', 'customizado']
export const DIET_DAY_STATUS = Object.freeze({
  COMPLETE: 'concluido',
  OUT_OF_PLAN: 'fora_da_dieta',
  EMPTY: 'nao_preenchido',
})
export const DIET_CALORIC_TOLERANCE_ABOVE = 300
export const DIET_CALORIC_MINIMUM_DEFICIT = 1000
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

function snapshotFood(food = {}) {
  const snapshot = { ...nutrients(food), nome: food.nome || '' }
  if (Array.isArray(food.alimentos)) snapshot.alimentos = food.alimentos.map(item => String(item))
  else if (typeof food.alimentos === 'string') snapshot.alimentos = food.alimentos
  if (food.horario != null) snapshot.horario = String(food.horario)
  return snapshot
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
      : { ...previous, status: action.status, substituto: null, consumido: action.status === 'limpo' ? snapshotFood(action.food) : null, revision: action.revision }
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

export function classificarDiaPorCalorias(day, plan = [], metaKcal = 0) {
  const kcal = Math.max(0, Number(diaryTotals(day, plan).kcal) || 0)
  const meta = Number(day?.metas_snapshot?.kcal ?? metaKcal)
  if (kcal <= 0 || !Number.isFinite(meta) || meta <= 0) {
    return {
      status: DIET_DAY_STATUS.EMPTY,
      kcal,
      metaKcal: Number.isFinite(meta) && meta > 0 ? meta : 0,
      minimoKcal: null,
      maximoKcal: null,
    }
  }

  const minimoKcal = Math.max(0, meta - DIET_CALORIC_MINIMUM_DEFICIT)
  const maximoKcal = meta + DIET_CALORIC_TOLERANCE_ABOVE
  const status = kcal >= minimoKcal && kcal <= maximoKcal
    ? DIET_DAY_STATUS.COMPLETE
    : DIET_DAY_STATUS.OUT_OF_PLAN
  return { status, kcal, metaKcal: meta, minimoKcal, maximoKcal }
}

function cleanDiaryText(value) {
  const text = String(value ?? '').replaceAll('\n', ' ').replaceAll('\r', ' ').replaceAll('\t', ' ').replace(/\s+/g, ' ').trim()
  return Array.from(text).filter(character => character.codePointAt(0) >= 32 && character.codePointAt(0) !== 127).join('')
}

function formatDiaryDate(date) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ''))
  if (!match) return 'data não informada'
  const parsed = new Date(`${date}T12:00:00Z`)
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return 'data não informada'
  return `${match[3]}/${match[2]}/${match[1]}`
}

function foodDescriptions(food, fallback) {
  const source = food?.alimentos ?? fallback?.alimentos
  if (Array.isArray(source)) return source.map(cleanDiaryText).filter(Boolean)
  if (typeof source === 'string') return source.split('·').map(cleanDiaryText).filter(Boolean)
  return []
}

function formatNutritionText(food) {
  const values = nutrients(food)
  const format = value => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)
  return `${format(values.kcal)} kcal | Proteínas ${format(values.proteinas)} g | Carboidratos ${format(values.carboidratos)} g | Gorduras ${format(values.gorduras)} g | Fibras ${format(values.fibras)} g`
}

function formatMealSection(label, time, food, fallback, includeFoodName = false) {
  const heading = `${cleanDiaryText(label) || 'Refeição registrada'}${cleanDiaryText(time) ? ` - ${cleanDiaryText(time)}` : ''}`
  let descriptions = foodDescriptions(food, fallback)
  const foodName = cleanDiaryText(food?.nome)
  if (descriptions.length === 0 && includeFoodName && foodName && foodName.toLocaleLowerCase('pt-BR') !== cleanDiaryText(label).toLocaleLowerCase('pt-BR')) {
    descriptions = [foodName]
  }
  const lines = descriptions.length
    ? descriptions.map(item => `• ${item}`)
    : ['• Itens não detalhados no histórico.']
  lines.push(formatNutritionText(food))
  return [heading, ...lines].join('\n')
}

function formatExtraSection(title, items) {
  if (!Array.isArray(items) || items.length === 0) return ''
  const lines = items.map(item => `• ${cleanDiaryText(item?.nome) || 'Alimento extra'}\n  ${formatNutritionText(item)}`)
  return `${title}\n${lines.join('\n')}`
}

export function diaryText(day, plan = [], date = day?.data) {
  const sections = []
  const plannedIds = new Set()
  const entries = day?.refeicoes || {}

  for (const ref of plan) {
    if (!ref?.id || plannedIds.has(ref.id)) continue
    plannedIds.add(ref.id)
    const meal = entries[ref.id]
    if (!meal) continue

    if (['limpo', 'livre'].includes(meal.status)) {
      const food = meal.consumido || ref
      sections.push(formatMealSection(
        meal.consumido?.nome || ref.nome,
        meal.consumido?.horario || (meal.consumido ? '' : ref.horario),
        food,
        meal.consumido ? null : ref,
      ))
    } else if (meal.status === 'customizado' && meal.substituto) {
      sections.push(formatMealSection(
        ref.nome || 'Refeição personalizada',
        meal.substituto.horario || ref.horario,
        meal.substituto,
        null,
        true,
      ))
    }

    if (Array.isArray(meal.extra) && meal.extra.length) sections.push(formatExtraSection(`Alimentos extras - ${cleanDiaryText(ref.nome) || 'refeição'}`, meal.extra))
  }

  for (const [id, meal] of Object.entries(entries)) {
    if (plannedIds.has(id)) continue
    if (completedMealStatuses.includes(meal?.status)) {
      const food = meal.status === 'customizado' ? meal.substituto : meal.consumido
      if (food) {
        const isCustom = meal.status === 'customizado'
        sections.push(formatMealSection(
          isCustom ? 'Refeição personalizada' : food.nome || 'Refeição registrada',
          food.horario,
          food,
          null,
          isCustom,
        ))
      }
    }
    if (Array.isArray(meal?.extra) && meal.extra.length) sections.push(formatExtraSection('Alimentos extras registrados', meal.extra))
  }

  const extrasGlobais = Array.isArray(day?.extras_globais) ? day.extras_globais : []
  if (extrasGlobais.length) sections.push(formatExtraSection('Alimentos extras', extrasGlobais))
  if (sections.length === 0) return ''

  const lines = [
    `Refeições realizadas - ${formatDiaryDate(date)}`,
    '',
    ...sections.flatMap((section, index) => index === sections.length - 1 ? [section] : [section, '']),
    '',
    'TOTAL DO DIA',
    formatNutritionText(diaryTotals(day, plan)),
  ]
  if (hasLegacyNutrition(day)) lines.push('', 'Observação: há registros antigos sem snapshot nutricional; alguns valores podem usar o plano atual.')
  return lines.join('\n')
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
