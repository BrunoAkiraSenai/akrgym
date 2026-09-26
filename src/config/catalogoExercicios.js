// Catálogo compacto de nomes; instruções e imagens não são carregadas junto.
const exerciciosPorGrupo = {
  Peito: [
    'Supino reto com barra', 'Supino reto com halteres', 'Supino reto na máquina', 'Supino reto no Smith',
    'Supino inclinado com barra', 'Supino inclinado com halteres', 'Supino inclinado na máquina', 'Supino inclinado no Smith',
    'Supino declinado com barra', 'Supino declinado com halteres', 'Supino declinado na máquina',
    'Supino com pegada fechada', 'Supino com pegada aberta', 'Supino articulado', 'Chest press na máquina',
    'Crucifixo reto com halteres', 'Crucifixo inclinado com halteres', 'Crucifixo declinado com halteres',
    'Crucifixo na máquina', 'Peck deck', 'Crossover na polia alta', 'Crossover na polia média', 'Crossover na polia baixa',
    'Crossover unilateral', 'Crucifixo na polia alta', 'Crucifixo na polia baixa', 'Flexão de braço',
    'Flexão de braço inclinada', 'Flexão de braço declinada', 'Flexão de braço com pegada fechada', 'Pullover com halter',
    'Pullover na polia', 'Supino com halteres no chão',
  ],
  Costas: [
    'Barra fixa pronada', 'Barra fixa supinada', 'Barra fixa neutra', 'Barra fixa assistida',
    'Puxada alta pela frente', 'Puxada alta pela frente com pegada aberta', 'Puxada alta pela frente com pegada fechada',
    'Puxada alta com pegada neutra', 'Puxada alta com pegada semi-pronada', 'Puxada alta supinada', 'Puxada alta unilateral',
    'Puxada alta unilateral com pegada semi-pronada', 'Puxada alta atrás da nuca',
    'Pulley frente', 'Pulley frente com triângulo', 'Pulley frente com pegada semi-pronada',
    'Pulldown com braços estendidos', 'Pulldown unilateral na polia', 'Puxada articulada com pegada semi-pronada',
    'Remada curvada com barra', 'Remada curvada com barra e pegada semi-pronada', 'Remada curvada com halteres',
    'Remada serrote com halter', 'Remada unilateral na polia', 'Remada unilateral na polia com pegada semi-pronada',
    'Remada baixa com triângulo', 'Remada baixa com barra', 'Remada baixa com pegada aberta',
    'Remada baixa com pegada semi-pronada', 'Remada baixa neutra', 'Remada baixa unilateral',
    'Remada cavalinho', 'Remada cavalinho com apoio', 'Remada cavalinho com pegada semi-pronada',
    'Remada T-bar', 'Remada na máquina',
    'Remada articulada', 'Remada no Smith', 'Remada invertida', 'Levantamento terra', 'Levantamento terra sumô',
    'Levantamento terra romeno', 'Rack pull', 'Good morning', 'Extensão lombar no banco', 'Hiperextensão lombar',
    'Encolhimento com barra', 'Encolhimento com halteres', 'Encolhimento na máquina',
  ],
  Ombros: [
    'Desenvolvimento com barra', 'Desenvolvimento com halteres', 'Desenvolvimento Arnold', 'Desenvolvimento no Smith',
    'Desenvolvimento na máquina', 'Desenvolvimento articulado', 'Desenvolvimento unilateral com halter',
    'Elevação lateral com halteres', 'Elevação lateral na polia', 'Elevação lateral unilateral na polia',
    'Elevação lateral na máquina', 'Elevação lateral inclinada', 'Elevação frontal com halteres',
    'Elevação frontal com barra', 'Elevação frontal na polia', 'Elevação frontal com anilha',
    'Elevação frontal unilateral na polia', 'Crucifixo inverso com halteres', 'Crucifixo inverso na máquina',
    'Crucifixo inverso na polia', 'Face pull', 'Remada alta com barra', 'Remada alta na polia',
    'Remada alta com halteres', 'Rotação externa do ombro na polia', 'Rotação externa com elástico',
    'Rotação interna do ombro na polia', 'Y-raise com halteres', 'Elevação em Y na polia',
  ],
  Bíceps: [
    'Rosca direta com barra', 'Rosca direta com barra W', 'Rosca direta com halteres', 'Rosca direta na polia',
    'Rosca alternada com halteres', 'Rosca simultânea com halteres', 'Rosca martelo', 'Rosca martelo na polia',
    'Rosca concentrada', 'Rosca Scott com barra', 'Rosca Scott com halteres', 'Rosca Scott na máquina',
    'Rosca inclinada com halteres', 'Rosca inclinada a 45 graus com halteres',
    'Rosca inclinada no banco a 45 graus', 'Rosca 45 graus para bíceps',
    'Rosca spider', 'Rosca inversa com barra', 'Rosca inversa na polia',
    'Rosca bayesian na polia', 'Rosca na polia baixa', 'Rosca unilateral na polia', 'Rosca Zottman',
    'Rosca 21', 'Flexão de cotovelo com elástico',
  ],
  Tríceps: [
    'Tríceps pulley com barra', 'Tríceps pulley com corda', 'Tríceps pulley com pegada invertida',
    'Tríceps na polia unilateral', 'Tríceps coice com halter', 'Tríceps coice na polia',
    'Tríceps testa com barra', 'Tríceps testa com barra W', 'Tríceps testa com halteres',
    'Tríceps francês com halter', 'Tríceps francês unilateral', 'Tríceps francês na polia',
    'Extensão de tríceps acima da cabeça com corda', 'Extensão de tríceps acima da cabeça com halter',
    'Mergulho nas paralelas', 'Mergulho no banco', 'Supino fechado', 'Tríceps máquina',
    'Flexão diamante', 'Extensão de tríceps com elástico',
  ],
  Antebraço: [
    'Rosca de punho com barra', 'Rosca de punho invertida', 'Flexão de punho com halteres',
    'Extensão de punho com halteres', 'Rosca inversa de punho', 'Desvio radial com halter',
    'Desvio ulnar com halter', 'Caminhada do fazendeiro', 'Suspensão na barra',
  ],
  Quadríceps: [
    'Agachamento livre', 'Agachamento frontal', 'Agachamento no Smith', 'Agachamento com halteres',
    'Agachamento goblet', 'Agachamento sumô', 'Agachamento hack', 'Agachamento hack na máquina',
    'Agachamento com caixa', 'Agachamento búlgaro', 'Agachamento pistol', 'Agachamento com elástico',
    'Leg press', 'Leg press 45 graus', 'Leg press horizontal', 'Leg press unilateral',
    'Cadeira extensora', 'Cadeira extensora unilateral', 'Afundo com halteres', 'Afundo no Smith',
    'Passada com halteres', 'Passada no Smith', 'Avanço caminhando', 'Step-up com halteres',
    'Sissy squat', 'Spanish squat', 'Cadeira adutora', 'Extensão de joelho na polia',
  ],
  'Posterior de coxa e glúteos': [
    'Stiff com barra', 'Stiff com halteres', 'Levantamento terra romeno com barra',
    'Levantamento terra romeno com halteres', 'Mesa flexora', 'Mesa flexora unilateral',
    'Cadeira flexora', 'Cadeira flexora unilateral', 'Flexora em pé', 'Flexora em pé unilateral',
    'Flexão de joelho na polia', 'Nordic curl', 'Good morning', 'Elevação pélvica',
    'Elevação pélvica com barra', 'Elevação pélvica unilateral', 'Hip thrust na máquina',
    'Glute bridge', 'Coice na polia', 'Coice com caneleira', 'Coice na máquina',
    'Abdução de quadril na máquina', 'Abdução de quadril na polia', 'Abdução de quadril com elástico',
    'Cadeira abdutora', 'Extensão de quadril na polia', 'Pull-through na polia',
    'Hiperextensão para glúteos', 'Kickback na máquina', 'Agachamento búlgaro para glúteos',
    'Passada reversa', 'Levantamento terra sumô', 'Bom dia com barra', 'Clamshell com elástico',
  ],
  Panturrilhas: [
    'Panturrilha em pé', 'Panturrilha em pé na máquina', 'Panturrilha no leg press',
    'Panturrilha sentada', 'Panturrilha sentada na máquina', 'Panturrilha unilateral em pé',
    'Panturrilha no Smith', 'Panturrilha no degrau', 'Panturrilha donkey', 'Flexão plantar na polia',
  ],
  Abdômen: [
    'Abdominal crunch', 'Abdominal supra', 'Abdominal infra', 'Abdominal bicicleta',
    'Abdominal oblíquo', 'Abdominal na polia', 'Abdominal na máquina', 'Abdominal com roda',
    'Abdominal canivete', 'Elevação de pernas na barra', 'Elevação de joelhos na paralela',
    'Prancha', 'Prancha lateral', 'Prancha com elevação de perna', 'Dead bug', 'Hollow hold',
    'Russian twist', 'Wood chop na polia', 'Pallof press', 'Mountain climber',
    'Extensão lombar no banco', 'Bird dog', 'Abdominal reverso', 'Toque nos calcanhares',
  ],
  Funcional: [
    'Burpee', 'Kettlebell swing', 'Kettlebell goblet squat', 'Kettlebell deadlift',
    'Thruster com barra', 'Thruster com halteres', 'Clean and press', 'Power clean',
    'Push press', 'Arranco com halter', 'Battle rope', 'Puxada de trenó', 'Empurrada de trenó',
    'Box jump', 'Salto no caixote', 'Salto com corda', 'Polichinelo', 'Agachamento com salto',
  ],
  Cardio: [
    'Esteira', 'Caminhada na esteira', 'Corrida na esteira', 'Bicicleta ergométrica',
    'Bicicleta horizontal', 'Bicicleta spinning', 'Elíptico', 'Transport', 'Remo ergométrico',
    'Escada ergométrica', 'Simulador de escada', 'Air bike', 'Corrida', 'Caminhada',
  ],
}

export const CATALOGO_EXERCICIOS = Object.entries(exerciciosPorGrupo)
  .flatMap(([grupo, nomes]) => nomes.map(nome => ({ nome, grupo })))

function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\bsemi[\s-]*pronada\b/g, 'semipronada')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

function palavrasParecidas(consulta, palavra) {
  if (consulta === palavra) return 0
  if (palavra.startsWith(consulta)) return 1
  if (consulta.length < 5 || palavra.length < 5 || Math.abs(consulta.length - palavra.length) > 1) return Infinity

  let i = 0
  let j = 0
  let diferencas = 0
  while (i < consulta.length && j < palavra.length) {
    if (consulta[i] === palavra[j]) { i++; j++; continue }
    diferencas++
    if (diferencas > 1) return Infinity
    if (consulta.length > palavra.length) i++
    else if (palavra.length > consulta.length) j++
    else { i++; j++ }
  }
  return diferencas + (i < consulta.length || j < palavra.length ? 1 : 0)
}

export function buscarExercicios(consulta, nomesSalvos = [], limite = 12) {
  const palavrasConsulta = normalizar(consulta)
  if (!palavrasConsulta.length) return []

  const opcoes = new Map()
  for (const exercicio of CATALOGO_EXERCICIOS) {
    const chave = normalizar(exercicio.nome).join(' ')
    if (!opcoes.has(chave)) opcoes.set(chave, exercicio)
  }
  for (const nome of nomesSalvos) {
    const nomeLimpo = String(nome || '').trim()
    const chave = normalizar(nomeLimpo).join(' ')
    if (chave && !opcoes.has(chave)) opcoes.set(chave, { nome: nomeLimpo, grupo: 'Seus treinos' })
  }

  return [...opcoes.values()]
    .map(exercicio => {
      const palavrasNome = normalizar(exercicio.nome)
      let pontuacao = Math.max(0, palavrasNome.length - palavrasConsulta.length) * 0.04
      for (const palavra of palavrasConsulta) {
        const melhor = Math.min(...palavrasNome.map(palavraNome => palavrasParecidas(palavra, palavraNome)))
        if (!Number.isFinite(melhor)) return null
        pontuacao += melhor
      }
      const nomeNormalizado = palavrasNome.join(' ')
      if (nomeNormalizado.includes(palavrasConsulta.join(' '))) pontuacao -= 0.5
      return { ...exercicio, pontuacao }
    })
    .filter(Boolean)
    .sort((a, b) => a.pontuacao - b.pontuacao || a.nome.localeCompare(b.nome, 'pt-BR'))
    .slice(0, limite)
    .map(({ nome, grupo }) => ({ nome, grupo }))
}
