import { initializeApp } from 'firebase/app'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'
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
export const db = getFirestore(app)
export const auth = getAuth(app)
export const provider = new GoogleAuthProvider()

enableIndexedDbPersistence(db).catch(err => {
  if (err.code === 'failed-precondition') {
    console.warn('Persistência offline não disponível (várias abas abertas)')
  } else if (err.code === 'unimplemented') {
    console.warn('Navegador não suporta persistência offline')
  }
})
