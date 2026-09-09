import test from 'node:test'
import assert from 'node:assert/strict'
import { DIETAS_FEMININAS, TREINOS_FEMININOS } from '../src/config/perfilFeminino.js'
import { METAS_DIARIAS, REFEICOES } from '../src/config/dieta.js'

const niveis = ['iniciante', 'intermediario', 'avancado']
const objetivos = ['perder_peso', 'ganhar_massa', 'manter_saude']

test('templates femininos têm três divisões válidas por nível', () => {
  for (const nivel of niveis) {
    const treinos = TREINOS_FEMININOS[nivel]?.treinos
    assert.ok(treinos, `treinos ausentes para ${nivel}`)
    assert.equal(Object.keys(treinos).length, 3)

    for (const treino of Object.values(treinos)) {
      assert.ok(treino.nome)
      assert.ok(treino.exercicios.length >= 4)
      for (const exercicio of treino.exercicios) {
        assert.ok(exercicio.nome)
        assert.ok(exercicio.meta_reps)
        assert.equal(exercicio.base_top, 0)
      }
    }
  }
})

test('dietas femininas têm metas e refeições completas por objetivo', () => {
  for (const objetivo of objetivos) {
    const dieta = DIETAS_FEMININAS[objetivo]
    assert.ok(dieta)
    assert.ok(dieta.metas.kcal > 0)
    assert.ok(dieta.metas.proteinas > 0)
    assert.ok(dieta.metas.carboidratos > 0)
    assert.ok(dieta.metas.gorduras > 0)
    assert.ok(dieta.metas.fibras > 0)
    assert.equal(dieta.refeicoes.length, 4)
    assert.ok(dieta.refeicoes.every(refeicao => refeicao.id && refeicao.alimentos.length > 0 && refeicao.fibras >= 0))
  }
})

test('plano alimentar padrão inclui meta e fibras em todas as refeições', () => {
  assert.ok(METAS_DIARIAS.fibras > 0)
  assert.equal(REFEICOES.length, 4)
  assert.ok(REFEICOES.every(refeicao => refeicao.fibras >= 0))
})
