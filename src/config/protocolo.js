const PROTOCOLO_BASE = {
  upper_a: {
    nome: "💥 UPPER A",
    exercicios: [
      { nome: "Supino Inclinado Halter", base_top: 26, meta_reps: "7", tem_aquecimento: true },
      { nome: "Remada Curvada Barra", base_top: 60, meta_reps: "6-8", tem_aquecimento: false },
      { nome: "Supino Máquina", base_top: 75, meta_reps: "8-10", tem_aquecimento: false },
      { nome: "Puxada Aberta", base_top: 55, meta_reps: "8-10", tem_aquecimento: false },
      { nome: "Elevação Lateral", base_top: 12, meta_reps: "10-12", tem_aquecimento: false },
      { nome: "Tríceps Polia", base_top: 22, meta_reps: "8-10", tem_aquecimento: false },
      { nome: "Scott", base_top: 30, meta_reps: "8-10", tem_aquecimento: false }
    ]
  },
  lower: {
    nome: "♈️ LOWER",
    exercicios: [
      { nome: "Agachamento", base_top: 80, meta_reps: "6-8", tem_aquecimento: true, IsAgachamento: true },
      { nome: "Stiff", base_top: 70, meta_reps: "6-8", tem_aquecimento: false },
      { nome: "Extensora", base_top: 110, meta_reps: "10-12", tem_aquecimento: false },
      { nome: "Flexora Sentada", base_top: 70, meta_reps: "8-10", tem_aquecimento: false },
      { nome: "Panturrilha", base_top: 60, meta_reps: "10-12", tem_aquecimento: false }
    ]
  },
  upper_b: {
    nome: "🔱 UPPER B (Treino C)",
    exercicios: [
      { nome: "Supino Reto Máquina", base_top: 75, meta_reps: "6-8", tem_aquecimento: true },
      { nome: "Remada Máquina", base_top: 50, meta_reps: "6-8", tem_aquecimento: false },
      { nome: "Desenvolvimento Halter", base_top: 22, meta_reps: "6-8", tem_aquecimento: false },
      { nome: "Crucifixo", base_top: 60, meta_reps: "8-12", tem_aquecimento: false, nota: "👉 Descida lenta. Sem jogar peso." },
      { nome: "Puxada Neutra", base_top: 50, meta_reps: "8-10", tem_aquecimento: false }
    ]
  }
}

export default PROTOCOLO_BASE
