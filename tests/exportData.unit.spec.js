import test from 'node:test'
import assert from 'node:assert/strict'
import { buildUserDataExport, formatExportFilename } from '../src/utils/exportData.js'

test('exportação reúne os dados do usuário e normaliza timestamps', () => {
  const timestamp = { toDate: () => new Date('2026-08-12T10:20:30.000Z') }
  const exportacao = buildUserDataExport({
    config: { metas: { kcal: 2000 }, atualizadoEm: timestamp },
    treinos: [{ id: 'treino-1', data: timestamp }],
    diarioDieta: [{ id: '2026-08-12', updatedAt: timestamp }],
    medidas: [],
    exportedAt: new Date('2026-08-12T12:00:00.000Z'),
  })

  assert.equal(exportacao.app, 'AkrGym')
  assert.equal(exportacao.schemaVersion, 1)
  assert.equal(exportacao.exportedAt, '2026-08-12T12:00:00.000Z')
  assert.equal(exportacao.dados.configuracao.atualizadoEm, '2026-08-12T10:20:30.000Z')
  assert.equal(exportacao.dados.historicoTreinos[0].data, '2026-08-12T10:20:30.000Z')
})

test('nome do arquivo usa a data local do export', () => {
  assert.equal(formatExportFilename('2026-08-12T12:00:00.000Z'), 'akrgym-dados-2026-08-12.json')
})
