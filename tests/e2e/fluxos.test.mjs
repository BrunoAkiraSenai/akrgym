// Fluxos principais rodando no app real (laboratório com Firebase falso).
import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { abrirApp, fecharNavegador, lerDoc, listarDocs, navegar, UID } from './lab.mjs'

after(fecharNavegador)

const hojeId = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10) }

test('login com e-mail e senha abre a Home', async () => {
  const { page, contexto, erros } = await abrirApp({ scene: 'login' })
  await page.getByLabel('E-mail').first().fill('teste@example.invalid')
  await page.getByLabel('Senha').first().fill('senha-errada')
  await page.locator('form button[type="submit"]').first().click()
  await page.getByRole('alert').first().waitFor()
  await page.getByLabel('Senha').first().fill('senha-do-laboratorio')
  await page.locator('form button[type="submit"]').first().click()
  await page.locator('.home-start-card').waitFor({ timeout: 15000 })
  assert.deepEqual(erros, [])
  await contexto.close()
})

test('registrar alimento com a IA soma no diário de hoje', async () => {
  const { page, contexto, erros } = await abrirApp()
  await navegar(page, 'Dieta')
  const antes = (await lerDoc(page, `users/${UID}/diario_dieta/${hojeId()}`))?.extras_globais?.length ?? 0
  await page.locator('textarea[aria-labelledby="diet-ai-title"]').fill('230g de arroz e 150g de fraldinha crua')
  await page.getByRole('button', { name: 'Analisar com IA' }).click()
  // A análise abre o formulário para revisar antes de salvar.
  const salvar = page.getByRole('button', { name: /^(Adicionar|Salvar|Registrar)/ }).last()
  await salvar.waitFor({ timeout: 15000 })
  await salvar.click()
  await page.waitForFunction(([caminho, n]) => (window.__labDocs.get(caminho)?.extras_globais?.length ?? 0) > n, [`users/${UID}/diario_dieta/${hojeId()}`, antes], { timeout: 10000 })
  const dia = await lerDoc(page, `users/${UID}/diario_dieta/${hojeId()}`)
  const novo = dia.extras_globais.at(-1)
  assert.equal(Math.round(novo.kcal), 660)
  assert.equal(Math.round(novo.proteinas), 32)
  assert.deepEqual(erros, [])
  await contexto.close()
})

test('treino completo pelo modo foco grava no histórico e a Home sugere a próxima divisão', async () => {
  const { page, contexto, erros } = await abrirApp()
  await page.locator('.home-start-card strong', { hasText: /^Hoje: / }).waitFor({ timeout: 15000 })
  const sugestao = await page.locator('.home-start-card strong').textContent()
  assert.match(sugestao, /^Hoje: /)
  const divisao = sugestao.replace(/^Hoje: /, '').trim()
  const antes = (await listarDocs(page, `users/${UID}/historico_treinos/`)).length
  await page.locator('.home-start-card').click()
  await page.locator('.exec-foco').waitFor()
  assert.equal((await page.locator('.treino-active-header h1').textContent()).trim(), divisao)
  // Primeiro exercício: carga e repetições, "Série feita" liga o descanso.
  await page.getByLabel('Carga (kg)').fill('40')
  await page.getByLabel('Repetições').fill('8')
  await page.getByRole('button', { name: 'Série feita' }).click()
  await page.locator('.exec-exercise-card .rest-timer-trigger strong', { hasText: /^\d\d:\d\d$/ }).waitFor()
  // Os demais ficam pulados.
  const total = await page.locator('.exec-foco-trilha ol button').count()
  for (let i = 1; i < total; i++) {
    await page.getByRole('button', { name: /^Próximo/ }).click()
    await page.getByRole('button', { name: 'Pular exercício' }).click()
  }
  await page.getByRole('button', { name: 'Finalizar treino' }).click()
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await page.locator('.home-start-card', { hasText: 'Próximo treino' }).waitFor({ timeout: 15000 })
  const depois = await listarDocs(page, `users/${UID}/historico_treinos/`)
  assert.equal(depois.length, antes + 1)
  const sessoes = await Promise.all(depois.map(caminho => lerDoc(page, caminho)))
  const nova = sessoes.find(s => s.exercicios_pulados?.length === total - 1)
  assert.ok(nova, 'a sessão nova foi gravada')
  assert.equal(nova.exercicios.length, 1)
  assert.equal(nova.exercicios[0].carga_top, 40)
  assert.deepEqual(erros, [])
  await contexto.close()
})

test('visitante não usa a IA e vê o convite para criar conta', async () => {
  const { page, contexto } = await abrirApp({ scene: 'anonymous' })
  await navegar(page, 'Dieta')
  await page.getByRole('button', { name: 'Criar conta ou entrar' }).first().waitFor()
  await page.locator('textarea[aria-labelledby="diet-ai-title"]').fill('uma banana')
  assert.equal(await page.getByRole('button', { name: 'Analisar com IA' }).isDisabled(), true)
  await contexto.close()
})

test('excluir conta apaga os dados e volta para o login', async () => {
  const { page, contexto, erros } = await abrirApp()
  await navegar(page, 'Configurar')
  await page.getByText('Conta, dados e aparência').click()
  await page.getByRole('button', { name: 'Excluir conta' }).click()
  const confirmar = page.getByRole('button', { name: 'Excluir tudo para sempre' })
  assert.equal(await confirmar.isDisabled(), true)
  await page.locator('#confirmar-exclusao').fill('excluir')
  await confirmar.click()
  await page.getByLabel('E-mail').first().waitFor({ timeout: 15000 })
  const restantes = await listarDocs(page, `users/${UID}/`)
  assert.deepEqual(restantes, [])
  assert.deepEqual(erros, [])
  await contexto.close()
})
