import { existsSync, readFileSync } from 'node:fs'

// Vite loads .env files itself; this check only protects CI/deploy from a
// production bundle that silently omits the App Check site key.
const candidates = ['.env.production.local', '.env.production', '.env']
const values = {}
for (const file of candidates) {
  if (!existsSync(file)) continue
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line)
    if (match && values[match[1]] == null) values[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
  }
}
const siteKey = process.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY || values.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY || process.env.VITE_RECAPTCHA_SITE_KEY || values.VITE_RECAPTCHA_SITE_KEY
const debugToken = process.env.VITE_FIREBASE_APPCHECK_DEBUG || values.VITE_FIREBASE_APPCHECK_DEBUG
if (!siteKey) throw new Error('VITE_RECAPTCHA_ENTERPRISE_SITE_KEY não configurada; o deploy seria publicado sem App Check.')
if (debugToken && debugToken !== 'false') throw new Error('VITE_FIREBASE_APPCHECK_DEBUG não pode ser usado no build de produção.')
console.log('Configuração de produção válida: App Check Enterprise presente; token de debug ausente.')
