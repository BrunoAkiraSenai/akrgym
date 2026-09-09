export const EXPORT_SCHEMA_VERSION = 1

function serializar(valor) {
  if (valor == null) return valor
  if (valor instanceof Date) return valor.toISOString()
  if (typeof valor?.toDate === 'function') return valor.toDate().toISOString()
  if (Array.isArray(valor)) return valor.map(serializar)
  if (typeof valor === 'object') {
    return Object.fromEntries(Object.entries(valor).map(([chave, item]) => [chave, serializar(item)]))
  }
  return valor
}

export function buildUserDataExport({ config, treinos = [], diarioDieta = [], medidas = [], exportedAt = new Date() }) {
  return {
    app: 'AkrGym',
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: serializar(exportedAt),
    dados: {
      configuracao: serializar(config || {}),
      historicoTreinos: serializar(treinos),
      diarioDieta: serializar(diarioDieta),
      historicoCorporal: serializar(medidas),
    },
  }
}

export function formatExportFilename(date = new Date()) {
  const iso = date instanceof Date ? date.toISOString() : new Date(date).toISOString()
  return `akrgym-dados-${iso.slice(0, 10)}.json`
}
