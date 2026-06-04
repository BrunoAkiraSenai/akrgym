import { initializeApp } from 'firebase/app'
import { initializeFirestore, persistentLocalCache, getFirestore } from 'firebase/firestore'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

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

let db
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ cacheSizeBytes: 104857600 }),
  })
} catch (e) {
  console.warn('Cache persistente não disponível, usando fallback:', e.message)
  db = getFirestore(app)
}

export { db }
export const auth = getAuth(app)
export const provider = new GoogleAuthProvider()
