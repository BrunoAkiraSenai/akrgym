export const REFEICOES = [
  {
    id: 'cafe',
    nome: 'Café da Manhã',
    horario: '08:30',
    alimentos: ['3 Ovos', '2 fatias Pão Integral', '30g Aveia'],
    kcal: 460,
    proteinas: 29,
    carboidratos: 42,
    gorduras: 19,
  },
  {
    id: 'almoco',
    nome: 'Almoço',
    horario: '12:30',
    alimentos: ['150g Frango', '150g Arroz', '100g Feijão', 'Salada'],
    kcal: 490,
    proteinas: 55,
    carboidratos: 56,
    gorduras: 4,
  },
  {
    id: 'pre_treino',
    nome: 'Pré-Treino',
    horario: '16:30',
    alimentos: ['100g Frango', '150g Arroz', '10g Azeite'],
    kcal: 430,
    proteinas: 35,
    carboidratos: 42,
    gorduras: 13,
  },
  {
    id: 'jantar',
    nome: 'Jantar',
    horario: '20:30',
    alimentos: ['150g Patinho', '200g Arroz', '400g Melancia'],
    kcal: 590,
    proteinas: 46,
    carboidratos: 86,
    gorduras: 7,
  },
]

export const METAS_DIARIAS = {
  kcal: 1970,
  proteinas: 165,
  carboidratos: 226,
  gorduras: 43,
}

export const STATUS = {
  limpo: 'Limpo 🟢',
  substituido: 'Substituído 🟡',
  livre: 'Livre 🔴',
}
