// Firebase falso com dados de exemplo realistas. Nada sai do navegador.
import { REFEICOES, METAS_DIARIAS } from '/src/config/dieta.js'
import PROTOCOLO_BASE from '/src/config/protocolo.js'

const params = new URL(location.href).searchParams
const scene = params.get('scene') || 'normal'
const clone = v => structuredClone(v)
const delay = ms => new Promise(r => setTimeout(r, scene === 'slow' ? ms * 40 : ms))
const UID = 'audit-user'

export const auth = { currentUser: scene === 'login' ? null : { uid: UID, email: 'teste@example.invalid', displayName: 'Bruno Teste', isAnonymous: scene === 'anonymous', getIdToken: async () => 'fixture' } }
export const db = {}
export const provider = {}
export const appCheck = null

const docs = new Map()
const dia = d => { const v = new Date(d); v.setMinutes(v.getMinutes() - v.getTimezoneOffset()); return v.toISOString().slice(0, 10) }
const diasAtras = n => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(12, 0, 0, 0); return d }

// Plano
const treinos = Object.fromEntries(Object.entries(PROTOCOLO_BASE).map(([k, r]) => [k, { ...clone(r), exercicios: r.exercicios.map(e => ({ ...e, descanso_segundos: 120 })) }]))
docs.set(`users/${UID}/config/data`, scene === 'vazio'
  ? { onboardingConcluido: true, metas: clone(METAS_DIARIAS), refeicoes: [], treinos: {} }
  : { onboardingConcluido: true, metas: clone(METAS_DIARIAS), refeicoes: clone(REFEICOES), treinos })

if (scene !== 'vazio') {
  // Diário: 45 dias com mistura de dias no plano, fora e sem registro.
  for (let i = 0; i < 45; i++) {
    const data = dia(diasAtras(i))
    const tipo = i === 0 ? 'hoje' : i % 9 === 4 ? 'vazio' : i % 7 === 3 ? 'acima' : i % 11 === 6 ? 'abaixo' : 'ok'
    if (tipo === 'vazio') continue
    const refeicoes = Object.fromEntries(REFEICOES.map((r, idx) => {
      const feito = tipo === 'hoje' ? idx < 2 : tipo === 'abaixo' ? idx < 1 : true
      return [r.id, feito ? { status: 'limpo', consumido: { ...clone(r) }, extra: [], substituto: null } : { status: 'pendente', extra: [], substituto: null }]
    }))
    const extras = tipo === 'acima' ? [{ id: `x${i}`, nome: 'Pizza (3 fatias)', kcal: 820, proteinas: 32, carboidratos: 90, gorduras: 34, fibras: 4 }] : tipo === 'hoje' ? [{ id: 'xh', nome: 'Banana com aveia', kcal: 180, proteinas: 4, carboidratos: 36, gorduras: 3, fibras: 5 }] : []
    docs.set(`users/${UID}/diario_dieta/${data}`, { data, refeicoes, extras_globais: extras, planejadas: REFEICOES.map(r => r.id), metas_snapshot: clone(METAS_DIARIAS) })
  }
  // Treinos: 3x por semana nos últimos 90 dias, com progressão de carga.
  const rotinas = Object.keys(treinos)
  let n = 0
  for (let i = 88; i >= 1; i--) {
    if (![1, 3, 5].includes(diasAtras(i).getDay())) continue
    const key = rotinas[n % rotinas.length]
    const progresso = Math.floor(n / 3)
    docs.set(`users/${UID}/historico_treinos/t${n}`, {
      rotina_id: key, rotina_nome: treinos[key].nome, data: diasAtras(i),
      exercicios: treinos[key].exercicios.map((e, idx) => ({ id: `legacy:${idx}:${e.nome}`, nome: e.nome, meta_reps: e.meta_reps, carga_top: e.base_top + progresso * (e.base_top > 40 ? 2.5 : 1), reps_top: 8 - (progresso % 3), descanso_segundos: 120 })),
    })
    n++
  }
  // Medidas
  for (let i = 0; i < 12; i++) docs.set(`users/${UID}/historico_corporal/m${i}`, { data: diasAtras(i * 7), peso: 82 - i * -0.4 - 4.4 + (i % 2) * 0.3, cintura: 86 + i * 0.4, abdomen: 88 + i * 0.5, braco_dir: 38 - i * 0.1, peito: 104 - i * 0.2, coxa_dir: 58 - i * 0.1 })
  // Amigos
  const resumo = (seq, ac, ate = dia(new Date())) => ({ sequencia: seq, acertos30: ac, ultimos7: ['ok', 'ok', 'fora', 'ok', 'ok', 'vazio', 'ok'], ate })
  docs.set(`perfis/${UID}`, { nome: 'Bruno Teste', foto: '', codigo: 'ABCD2345' })
  docs.set(`perfis/${UID}/compartilhado/dieta`, resumo(5, 21))
  docs.set('perfis/amigo-1', { nome: 'Marina Souza', foto: '', codigo: 'MRNA2345' })
  docs.set('perfis/amigo-1/compartilhado/dieta', resumo(12, 26))
  const mes = dia(new Date()).slice(0, 7)
  docs.set(`perfis/amigo-1/compartilhado/mes-${mes}`, { dias: Object.fromEntries(Array.from({ length: Number(dia(new Date()).slice(8)) }, (_, i) => [String(i + 1).padStart(2, '0'), i % 6 === 2 ? 340 : i % 8 === 5 ? -1150 : 'ok']).filter(([d]) => d !== '04')) })
  docs.set('perfis/amigo-2', { nome: 'João Pedro de Oliveira', foto: '', codigo: 'JPDR2345' })
  docs.set(`amizades/${UID}_amigo-1`, { membros: [UID, 'amigo-1'].sort(), solicitante: UID, status: 'aceita' })
  docs.set(`amizades/${UID}_amigo-2`, { membros: [UID, 'amigo-2'].sort(), solicitante: 'amigo-2', status: 'pendente' })
  docs.set('codigos_amizade/MRNA2345', { uid: 'amigo-1' })
}

const pathOf = (base, ...parts) => [base?.path, ...parts].filter(Boolean).join('/')
export const doc = (base, ...p) => ({ path: pathOf(base, ...p) })
export const collection = (base, ...p) => ({ path: pathOf(base, ...p) })
export const where = (field, op, value) => ({ type: 'where', field, op, value })
export const orderBy = (field, direction) => ({ type: 'order', field, direction })
export const limit = value => ({ type: 'limit', value })
export const query = (ref, ...constraints) => ({ ...ref, constraints })
const snapshot = (path, data) => ({ id: path.split('/').at(-1), exists: () => data !== undefined, data: () => clone(data), ref: { path } })
const comparar = (a, b) => (a instanceof Date || b instanceof Date) ? +a - +b : a < b ? -1 : a > b ? 1 : 0
export async function getDoc(ref) { await delay(25); return snapshot(ref.path, docs.get(ref.path)) }
export async function getDocs(ref) {
  await delay(40)
  let list = [...docs].filter(([path]) => path.startsWith(ref.path + '/') && path.split('/').length === ref.path.split('/').length + 1)
  for (const c of ref.constraints || []) {
    if (c.type === 'where') list = list.filter(([, d]) => c.op === '==' ? d[c.field] === c.value : c.op === 'array-contains' ? (d[c.field] || []).includes(c.value) : c.op === '>=' ? comparar(d[c.field], c.value) >= 0 : comparar(d[c.field], c.value) <= 0)
    if (c.type === 'order') list.sort((a, b) => comparar(a[1][c.field], b[1][c.field]) * (c.direction === 'desc' ? -1 : 1))
    if (c.type === 'limit') list = list.slice(0, c.value)
  }
  const found = list.map(([path, data]) => snapshot(path, data))
  return { docs: found, empty: !found.length, size: found.length, forEach: fn => found.forEach(fn) }
}
const subs = new Map()
function notify(path) { for (const fn of subs.get(path) || []) fn(snapshot(path, docs.get(path))) }
export async function setDoc(ref, data) { await delay(300); docs.set(ref.path, clone(data)); notify(ref.path) }
export async function addDoc(ref, data) { const t = { path: ref.path + '/' + crypto.randomUUID() }; await setDoc(t, data); return t }
export async function updateDoc(ref, data) { return setDoc(ref, { ...docs.get(ref.path), ...data }) }
export async function deleteDoc(ref) { docs.delete(ref.path); notify(ref.path) }
export const serverTimestamp = () => new Date()
export const writeBatch = () => { const ops = []; return { set: (r, d) => ops.push([r, d]), commit: () => Promise.all(ops.map(([r, d]) => setDoc(r, d))) } }
export function onSnapshot(ref, fn) { const l = subs.get(ref.path) || new Set(); subs.set(ref.path, l); l.add(fn); queueMicrotask(() => { if (l.has(fn)) fn(snapshot(ref.path, docs.get(ref.path))) }); return () => l.delete(fn) }
let fila = Promise.resolve()
export function runTransaction(_, cb) { const r = fila.then(async () => { const w = []; const v = await cb({ get: getDoc, set: (ref, d) => w.push([ref, d]) }); for (const [ref, d] of w) await setDoc(ref, d); return v }); fila = r.catch(() => {}); return r }
// Firestore SDK (persistência) não é usado aqui.
export const initializeFirestore = () => db
export const getFirestore = () => db
export const persistentLocalCache = () => ({})

const listeners = new Set()
export function onAuthStateChanged(_, cb) { listeners.add(cb); queueMicrotask(() => cb(auth.currentUser)); return () => listeners.delete(cb) }
export async function signInAnonymously() { throw Object.assign(new Error('desativado'), { code: 'auth/admin-restricted-operation' }) }
export async function signOut() { auth.currentUser = null; for (const cb of listeners) cb(null) }
export const getRedirectResult = async () => null
const falha = async () => { await delay(400); throw Object.assign(new Error('fixture'), { code: 'auth/invalid-credential' }) }
export const signInWithEmailAndPassword = falha
export const createUserWithEmailAndPassword = falha
export const sendPasswordResetEmail = async () => {}
export const signInWithPopup = falha
export const signInWithRedirect = falha
export const getAuth = () => auth
export class GoogleAuthProvider { setCustomParameters() {} }
export async function calcularMacrosIA(texto) { await delay(2200); return { nome: texto, kcal: 640, proteinas: 38, carboidratos: 62, gorduras: 24, fibras: 6 } }
