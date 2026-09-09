import { initializeApp } from 'firebase/app'
import { initializeFirestore, persistentLocalCache, getFirestore } from 'firebase/firestore'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { initializeAppCheck, ReCaptchaEnterpriseProvider, CustomProvider } from 'firebase/app-check'

const firebaseConfig = {
  apiKey: 'AIzaSyAWbQiEKYrAFEgjjcYvSpxXD9dcwslqLgk',
  authDomain: 'akrgym.firebaseapp.com',
  projectId: 'akrgym',
  storageBucket: 'akrgym.firebasestorage.app',
  messagingSenderId: '272661727889',
  appId: '1:272661727889:web:532c4b51c35afa28d64d30',
  measurementId: 'G-3B3R4JL7TH',
}

const app = initializeApp(firebaseConfig)

// App Check é opcional durante o desenvolvimento até que o site key seja
// configurado no ambiente. Em produção, a função de IA exige esse token.
let appCheck = null
const appCheckSiteKey = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY || import.meta.env.VITE_RECAPTCHA_SITE_KEY
// Acesso por chave evita que um token de debug local seja embutido por engano
// em um bundle de produção quando alguém executa `vite build` com `.env.local`.
const appCheckDebugToken = import.meta.env.DEV
  ? import.meta.env['VITE_FIREBASE_APPCHECK_DEBUG']
  : undefined
// No localhost, o Firebase App Check usa o fluxo oficial de token de debug.
// O token é exibido uma vez no console do navegador e precisa ser cadastrado
// no Firebase Console. Em produção, esse caminho nunca é ativado.
const usarDebugAppCheck = Boolean(import.meta.env.DEV) && appCheckDebugToken !== 'false'

if (usarDebugAppCheck && typeof globalThis !== 'undefined') {
  globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = appCheckDebugToken && appCheckDebugToken !== 'true' ? appCheckDebugToken : true
}

if (appCheckSiteKey) {
  try {
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    })
  } catch (error) {
    if (import.meta.env.DEV) console.warn('App Check não pôde ser inicializado:', error.message)
  }
} else if (usarDebugAppCheck) {
  // Com o token de debug, o SDK troca o token diretamente pelo endpoint do
  // App Check; o provider customizado serve apenas para satisfazer a API de
  // inicialização quando o site key não está disponível no ambiente local.
  try {
    appCheck = initializeAppCheck(app, {
      provider: new CustomProvider({
        getToken: async () => ({ token: '', expireTimeMillis: Date.now() + 60_000 }),
      }),
      isTokenAutoRefreshEnabled: true,
    })
  } catch (error) {
    if (import.meta.env.DEV) console.warn('App Check de debug não pôde ser inicializado:', error.message)
  }
}

let db
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ cacheSizeBytes: 104857600 }),
  })
} catch (e) {
  if (import.meta.env.DEV) console.warn('Cache persistente não disponível, usando fallback:', e.message)
  db = getFirestore(app)
}

export { appCheck, db }
export const auth = getAuth(app)
export const provider = new GoogleAuthProvider()
provider.setCustomParameters({ prompt: 'select_account consent' })
