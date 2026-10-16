// Laboratório local: roda o app real com Firebase falso (mock.js). Sem acesso a produção.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
// Raiz do app: argumento opcional (ex.: uma cópia de PRD); padrão é este repositório.
const root = (process.argv[2] || fileURLToPath(new URL('../..', import.meta.url))).replace(/\\/g, '/').replace(/\/$/, '')
// Porta: segundo argumento opcional, para rodar duas cópias ao mesmo tempo.
const port = Number(process.argv[3]) || 5187
const nm = `${root}/node_modules`
const { createServer } = await import(`file:///${nm}/vite/dist/node/index.js`)
const react = (await import(`file:///${nm}/@vitejs/plugin-react/dist/index.js`)).default
const tailwind = (await import(`file:///${nm}/@tailwindcss/vite/dist/index.mjs`)).default
const mock = readFileSync(new URL('./mock.js', import.meta.url), 'utf8')

const server = await createServer({
  root, configFile: false, logLevel: 'warn',
  server: { host: '127.0.0.1', port, strictPort: true },
  plugins: [{
    name: 'lab-fixtures', enforce: 'pre',
    resolveId(id) { if (['firebase/firestore', 'firebase/auth', 'firebase/app', 'firebase/app-check', '/__lab__/mock.js'].includes(id)) return '\0lab-mock' },
    load(id) { if (id === '\0lab-mock') return mock },
    transform(code, id) {
      const path = id.replaceAll('\\', '/').split('?')[0]
      if (path.endsWith('/src/firebase.js')) return 'export { auth, db, provider, appCheck } from "/__lab__/mock.js"'
      if (path.endsWith('/src/utils/gemini.js')) return 'export { calcularMacrosIA } from "/__lab__/mock.js"'
    },
    transformIndexHtml(html) {
      // Bloqueia qualquer rede externa: só o próprio servidor local.
      // ?tema= escolhe o tema antes do app carregar; ?passos=Dieta|Amigos clica em botões pelo texto.
      const roteiro = `<script>
        const p = new URLSearchParams(location.search)
        if (p.get('tema')) localStorage.setItem('akrgym-theme', p.get('tema'))
        const espera = ms => new Promise(r => setTimeout(r, ms))
        const clicar = async texto => { for (let i = 0; i < 80; i++) { const el = [...document.querySelectorAll('button, [role=tab], summary')].find(e => e.textContent.trim().startsWith(texto)); if (el) { el.click(); return } await espera(100) } document.title = 'FALHOU:' + texto }
        window.addEventListener('load', async () => { await espera(900); for (const passo of (p.get('passos') || '').split('|').filter(Boolean)) { await clicar(passo); await espera(900) } document.documentElement.dataset.roteiro = 'ok' })
      </script>`
      return html.replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="connect-src 'self' ws://127.0.0.1:${port}; frame-src 'self';">${roteiro}`)
    },
    configureServer(server) {
      // Moldura com largura exata (o Chrome invisível não aceita janela estreita).
      server.middlewares.use('/moldura', (req, res) => {
        const p = new URL(req.url, 'http://localhost').searchParams
        const w = Number(p.get('w')) || 390, h = Number(p.get('h')) || 844
        p.delete('w'); p.delete('h')
        res.setHeader('Content-Type', 'text/html')
        res.end(`<!doctype html><body style="margin:0;background:#000"><iframe src="/?${p}" style="display:block;border:0;width:${w}px;height:${h}px"></iframe></body>`)
      })
    },
  }, react(), tailwind()],
})
await server.listen()
console.log(`Laboratório em http://127.0.0.1:${port}/?scene=normal`)
