// Conta do usuário no Firestore: plano, uso da IA e exclusão.
//
//   users/{uid}/conta/assinatura   plano em vigor — só o servidor grava (regras bloqueiam o app)
//   users/{uid}/uso_ia/{YYYY-MM}   { total, porDia: { DD: n } } — contador mensal de análises
import { useEffect, useState } from 'react'
import { deleteUser } from 'firebase/auth'
import {
  collection, deleteDoc, doc, getDocs, increment, onSnapshot, serverTimestamp, setDoc, writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'
import { PLANOS, PLANO_PADRAO, chavesDeUso, lerUso, planoEmVigor } from './planos.js'
import { carregarPerfil, desativarPerfil } from './socialStore.js'

const assinaturaRef = uid => doc(db, 'users', uid, 'conta', 'assinatura')
const usoRef = (uid, mes) => doc(db, 'users', uid, 'uso_ia', mes)

// Plano e uso do mês, ao vivo. Sem documento (ou sem permissão), vale o Grátis.
export function useConta(uid) {
  const [estado, setEstado] = useState({ uid: null, plano: PLANOS[PLANO_PADRAO], uso: { mes: 0, hoje: 0 } })
  useEffect(() => {
    if (!uid) return undefined
    const { mes } = chavesDeUso()
    const paraPadrao = () => setEstado(atual => ({ ...atual, uid, plano: PLANOS[PLANO_PADRAO] }))
    const pararAssinatura = onSnapshot(assinaturaRef(uid),
      snap => setEstado(atual => ({ ...atual, uid, plano: planoEmVigor(snap.exists() ? snap.data() : null) })),
      paraPadrao)
    const pararUso = onSnapshot(usoRef(uid, mes),
      snap => setEstado(atual => ({ ...atual, uid, uso: lerUso(snap.exists() ? snap.data() : null) })),
      () => {})
    return () => { pararAssinatura(); pararUso() }
  }, [uid])
  // Dados de outro usuário (troca de conta) não valem até o novo carregar.
  return estado.uid === uid ? estado : { uid, plano: PLANOS[PLANO_PADRAO], uso: { mes: 0, hoje: 0 } }
}

// Conta uma análise feita. Falhar aqui nunca atrapalha a análise.
export async function registrarUsoIA(uid) {
  if (!uid) return
  const { mes, dia } = chavesDeUso()
  try {
    await setDoc(usoRef(uid, mes), { total: increment(1), porDia: { [dia]: increment(1) }, atualizadoEm: serverTimestamp() }, { merge: true })
  } catch { /* O contador é informativo por enquanto. */ }
}

async function apagarColecao(referencia) {
  const snap = await getDocs(referencia)
  for (let i = 0; i < snap.docs.length; i += 400) {
    const lote = writeBatch(db)
    snap.docs.slice(i, i + 400).forEach(item => lote.delete(item.ref))
    await lote.commit()
  }
}

/**
 * Apaga todos os dados da pessoa e a própria conta (direito de exclusão da LGPD).
 * Ordem: amigos e perfil, histórico, diário, medidas, uso, configuração, login.
 */
export async function excluirConta(user, aoAvancar = () => {}) {
  const uid = user.uid
  aoAvancar('Removendo perfil e amigos...')
  const perfil = user.isAnonymous ? null : await carregarPerfil(uid).catch(() => null)
  if (perfil) await desativarPerfil(uid, perfil.codigo)
  aoAvancar('Apagando treinos, dieta e medidas...')
  for (const nome of ['historico_treinos', 'diario_dieta', 'historico_corporal', 'uso_ia']) {
    await apagarColecao(collection(db, 'users', uid, nome))
  }
  await deleteDoc(doc(db, 'users', uid, 'config', 'data'))
  try {
    Object.keys(localStorage).filter(chave => chave.includes(uid) || chave === 'akrgym-app').forEach(chave => localStorage.removeItem(chave))
  } catch { /* Sem armazenamento local, nada a limpar. */ }
  aoAvancar('Encerrando a conta...')
  await deleteUser(user)
}
