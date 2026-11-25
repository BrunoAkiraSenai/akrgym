// Confere uma exportação de dados do app (Configurar > Exportar dados) contra as
// regras do diário em firestore.rules, antes de publicar regras novas.
// Uso: node scripts/verificar-diario-export.mjs caminho/akrgym-dados-AAAA-MM-DD.json
// Mostra só contagens e nomes de campos; não imprime alimentos nem valores.
import { readFileSync } from 'node:fs'
import { normalizeDay } from '../src/utils/dietDiary.js'

const arquivo = process.argv[2]
if (!arquivo) {
  console.error('Informe o arquivo exportado. Ex.: node scripts/verificar-diario-export.mjs akrgym-dados-2026-11-10.json')
  process.exit(2)
}

// Arquivo salvo por programas do Windows pode vir com BOM no começo.
const exportacao = JSON.parse(readFileSync(arquivo, 'utf8').replace(/^﻿/, ''))
const dias = exportacao?.dados?.diarioDieta
if (!Array.isArray(dias)) {
  console.error('O arquivo não parece uma exportação do AkrGym (faltou dados.diarioDieta).')
  process.exit(2)
}

const DATA = /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/
const ehMapa = v => v !== null && typeof v === 'object' && !Array.isArray(v)

// Mesmas condições de isValidDietWrite, aplicadas ao documento como o app o regravaria.
function problemas(id, documento) {
  const { id: _ignorado, ...dados } = documento
  const dia = normalizeDay(dados, id)
  const lista = []
  if (!DATA.test(id)) lista.push('nome do documento não é uma data AAAA-MM-DD')
  if (!ehMapa(dia.refeicoes)) lista.push('refeicoes não é um mapa')
  else if (Object.keys(dia.refeicoes).length > 30) lista.push('mais de 30 refeições')
  if (!Array.isArray(dia.extras_globais)) lista.push('extras_globais não é lista')
  else if (dia.extras_globais.length >= 100) lista.push('100 ou mais alimentos extras')
  if ('planejadas' in dia && !(Array.isArray(dia.planejadas) && dia.planejadas.length <= 30)) lista.push('planejadas com formato inesperado')
  if ('metas_snapshot' in dia && !ehMapa(dia.metas_snapshot)) lista.push('metas_snapshot com formato inesperado')
  return lista
}

const conhecidos = new Set(['id', 'data', 'refeicoes', 'extras_globais', 'planejadas', 'metas_snapshot', 'usuarioId'])
const camposExtras = new Map()
const recusados = []
for (const documento of dias) {
  const id = String(documento.id ?? documento.data ?? '')
  for (const campo of Object.keys(documento)) if (!conhecidos.has(campo)) camposExtras.set(campo, (camposExtras.get(campo) || 0) + 1)
  const lista = problemas(id, documento)
  if (lista.length) recusados.push(`${id}: ${lista.join('; ')}`)
}

console.log(`Dias no diário: ${dias.length}`)
console.log(`Dias que as regras novas recusariam ao regravar: ${recusados.length}`)
for (const linha of recusados) console.log(`  - ${linha}`)
if (camposExtras.size) {
  console.log('Campos antigos encontrados (continuam aceitos):')
  for (const [campo, n] of camposExtras) console.log(`  - ${campo}: ${n} dia(s)`)
}
process.exit(recusados.length ? 1 : 0)
