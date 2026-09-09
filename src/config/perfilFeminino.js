const criarExercicio = (nome, metaReps, opcoes = {}) => ({
  nome,
  base_top: 0,
  meta_reps: metaReps,
  tem_aquecimento: false,
  carga: '',
  reps: '',
  ...opcoes,
})

const criarTreino = (nome, exercicios) => ({
  nome,
  exercicios,
})

// Sugestões iniciais com mais volume para glúteos e membros inferiores.
// As cargas começam vazias para que cada pessoa ajuste com segurança.
export const TREINOS_FEMININOS = {
  iniciante: {
    treinos: {
      lower_a: criarTreino('Lower A', [
        criarExercicio('Agachamento Goblet', '10-12', { tem_aquecimento: true, IsAgachamento: true }),
        criarExercicio('Hip Thrust', '10-12'),
        criarExercicio('Leg Press', '10-12'),
        criarExercicio('Abdutora', '12-15'),
      ]),
      upper: criarTreino('Upper', [
        criarExercicio('Puxada Frontal', '10-12'),
        criarExercicio('Remada Sentada', '10-12'),
        criarExercicio('Supino Máquina', '10-12'),
        criarExercicio('Desenvolvimento Halter', '10-12'),
      ]),
      lower_b: criarTreino('Lower B', [
        criarExercicio('Stiff', '10-12'),
        criarExercicio('Afundo', '10-12'),
        criarExercicio('Flexora Sentada', '10-12'),
        criarExercicio('Glúteo na Polia', '12-15'),
      ]),
    },
  },
  intermediario: {
    treinos: {
      lower_a: criarTreino('Lower A', [
        criarExercicio('Agachamento', '8-10', { tem_aquecimento: true, IsAgachamento: true }),
        criarExercicio('Hip Thrust', '8-10'),
        criarExercicio('Leg Press', '10-12'),
        criarExercicio('Abdutora', '12-15'),
        criarExercicio('Panturrilha', '12-15'),
      ]),
      upper: criarTreino('Upper', [
        criarExercicio('Puxada Frontal', '8-10'),
        criarExercicio('Remada Sentada', '8-10'),
        criarExercicio('Supino Inclinado Halter', '8-10'),
        criarExercicio('Desenvolvimento Halter', '10-12'),
        criarExercicio('Tríceps Corda', '10-12'),
      ]),
      lower_b: criarTreino('Lower B', [
        criarExercicio('Stiff', '8-10'),
        criarExercicio('Afundo', '10-12'),
        criarExercicio('Flexora Sentada', '10-12'),
        criarExercicio('Extensora', '10-12'),
        criarExercicio('Glúteo na Polia', '12-15'),
      ]),
    },
  },
  avancado: {
    treinos: {
      lower_a: criarTreino('Lower A', [
        criarExercicio('Agachamento', '6-8', { tem_aquecimento: true, IsAgachamento: true }),
        criarExercicio('Hip Thrust', '6-8'),
        criarExercicio('Leg Press', '8-10'),
        criarExercicio('Abdutora', '12-15'),
        criarExercicio('Panturrilha', '10-12'),
      ]),
      upper: criarTreino('Upper', [
        criarExercicio('Puxada Frontal', '6-8'),
        criarExercicio('Remada Sentada', '6-8'),
        criarExercicio('Supino Inclinado Halter', '8-10'),
        criarExercicio('Desenvolvimento Halter', '8-10'),
        criarExercicio('Tríceps Corda', '10-12'),
      ]),
      lower_b: criarTreino('Lower B', [
        criarExercicio('Stiff', '6-8'),
        criarExercicio('Afundo', '8-10'),
        criarExercicio('Flexora Sentada', '8-10'),
        criarExercicio('Extensora', '10-12'),
        criarExercicio('Glúteo na Polia', '12-15'),
      ]),
    },
  },
}

// Valores de partida para o onboarding. Não substituem avaliação profissional
// e podem ser ajustados na aba Configuração conforme rotina e necessidades.
export const DIETAS_FEMININAS = {
  perder_peso: {
    metas: { kcal: 1650, proteinas: 125, carboidratos: 171, gorduras: 55, fibras: 25 },
    refeicoes: [
      { id: 'cafe', nome: 'Café da Manhã', horario: '08:00', alimentos: ['Iogurte natural', '30g Aveia', '1 Banana'], kcal: 340, proteinas: 18, carboidratos: 48, gorduras: 9, fibras: 5 },
      { id: 'almoco', nome: 'Almoço', horario: '12:30', alimentos: ['130g Frango', '100g Arroz', 'Feijão', 'Salada'], kcal: 470, proteinas: 43, carboidratos: 48, gorduras: 9, fibras: 8 },
      { id: 'lanche', nome: 'Lanche', horario: '16:00', alimentos: ['1 Ovo', '1 fatia Pão Integral', '1 fruta'], kcal: 250, proteinas: 12, carboidratos: 31, gorduras: 9, fibras: 4 },
      { id: 'jantar', nome: 'Jantar', horario: '20:00', alimentos: ['150g Peixe', '150g Batata', 'Legumes'], kcal: 390, proteinas: 36, carboidratos: 37, gorduras: 10, fibras: 5 },
    ],
  },
  ganhar_massa: {
    metas: { kcal: 2200, proteinas: 145, carboidratos: 276, gorduras: 67, fibras: 30 },
    refeicoes: [
      { id: 'cafe', nome: 'Café da Manhã', horario: '08:00', alimentos: ['2 Ovos', '2 fatias Pão Integral', '30g Aveia', '1 fruta'], kcal: 560, proteinas: 25, carboidratos: 72, gorduras: 19, fibras: 6 },
      { id: 'almoco', nome: 'Almoço', horario: '12:30', alimentos: ['150g Frango', '180g Arroz', 'Feijão', 'Salada'], kcal: 620, proteinas: 49, carboidratos: 79, gorduras: 11, fibras: 8 },
      { id: 'lanche', nome: 'Pré-Treino', horario: '16:30', alimentos: ['Iogurte natural', 'Banana', '30g Aveia'], kcal: 370, proteinas: 17, carboidratos: 63, gorduras: 7, fibras: 5 },
      { id: 'jantar', nome: 'Jantar', horario: '20:30', alimentos: ['150g Patinho', '200g Batata', 'Legumes', 'Azeite'], kcal: 570, proteinas: 44, carboidratos: 62, gorduras: 17, fibras: 5 },
    ],
  },
  manter_saude: {
    metas: { kcal: 1900, proteinas: 130, carboidratos: 220, gorduras: 60, fibras: 25 },
    refeicoes: [
      { id: 'cafe', nome: 'Café da Manhã', horario: '08:30', alimentos: ['2 Ovos', '2 fatias Pão Integral', '1 fruta'], kcal: 430, proteinas: 22, carboidratos: 49, gorduras: 16, fibras: 4 },
      { id: 'almoco', nome: 'Almoço', horario: '12:30', alimentos: ['130g Frango', '150g Arroz', 'Feijão', 'Salada'], kcal: 520, proteinas: 45, carboidratos: 65, gorduras: 9, fibras: 8 },
      { id: 'lanche', nome: 'Lanche', horario: '16:30', alimentos: ['Iogurte natural', '30g Aveia', '1 fruta'], kcal: 330, proteinas: 16, carboidratos: 53, gorduras: 7, fibras: 5 },
      { id: 'jantar', nome: 'Jantar', horario: '20:30', alimentos: ['150g Peixe', '150g Batata', 'Legumes', 'Azeite'], kcal: 500, proteinas: 39, carboidratos: 49, gorduras: 17, fibras: 5 },
    ],
  },
}
