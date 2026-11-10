// Sobe o laboratório (Firebase falso) numa porta própria, roda os testes de
// tela com o Chrome instalado e derruba o servidor no fim.
// Uso: npm run test:e2e
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const raiz = fileURLToPath(new URL('../..', import.meta.url))
const porta = Number(process.env.LAB_PORTA) || 5199
const url = `http://127.0.0.1:${porta}`

const servidor = spawn(process.execPath, ['tools/lab/server.mjs', raiz, String(porta)], { cwd: raiz, stdio: ['ignore', 'inherit', 'inherit'] })
const encerrar = () => { if (!servidor.killed) servidor.kill() }
process.on('exit', encerrar)

async function esperarServidor() {
  for (let i = 0; i < 120; i++) {
    try { if ((await fetch(`${url}/app?scene=normal`)).ok) return } catch { /* ainda subindo */ }
    await new Promise(r => setTimeout(r, 500))
  }
  throw new Error(`Laboratório não respondeu em ${url}`)
}

await esperarServidor()
const testes = spawn(process.execPath, ['--test', '--test-concurrency=1', 'tests/e2e/*.test.mjs'], {
  cwd: raiz, stdio: 'inherit', env: { ...process.env, LAB_URL: url },
})
testes.on('exit', codigo => { encerrar(); process.exit(codigo ?? 1) })
