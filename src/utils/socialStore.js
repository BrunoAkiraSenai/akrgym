// Acesso ao Firestore do recurso de amigos.
//
//   perfis/{uid}                       nome, foto, codigo (identidade)
//   perfis/{uid}/compartilhado/dieta   resumo dos dias de dieta (só amigos leem)
//   codigos_amizade/{codigo}           { uid } — permite achar alguém pelo código
//   amizades/{uidA_uidB}               pedido pendente ou amizade aceita
import {
  collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'
import {
  JANELA_DIAS, codigoAmizadeValido, dataLocalId, deslocarDia, gerarCodigoAmizade, idAmizade, limparNomePerfil,
  resumoDieta, resumoValido,
} from './social.js'

const perfilRef = uid => doc(db, 'perfis', uid)
const resumoRef = uid => doc(db, 'perfis', uid, 'compartilhado', 'dieta')
const codigoRef = codigo => doc(db, 'codigos_amizade', codigo)
const amizadeRef = (primeiroUid, segundoUid) => doc(db, 'amizades', idAmizade(primeiroUid, segundoUid))

export const semPermissao = erro => erro?.code === 'permission-denied'

export async function carregarPerfil(uid) {
  const snap = await getDoc(perfilRef(uid))
  return snap.exists() ? snap.data() : null
}

export async function ativarPerfil(uid, nome) {
  const nomeLimpo = limparNomePerfil(nome)
  if (!nomeLimpo) throw new Error('Informe como seus amigos vão ver seu nome.')
  let ultimoErro
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    const codigo = gerarCodigoAmizade()
    const perfil = { nome: nomeLimpo, foto: '', codigo }
    try {
      const batch = writeBatch(db)
      batch.set(codigoRef(codigo), { uid })
      batch.set(perfilRef(uid), { ...perfil, atualizadoEm: serverTimestamp() })
      await batch.commit()
      marcarPerfilAtivo(uid, true)
      return perfil
    } catch (erro) {
      // Código já usado por outra pessoa também chega como falta de permissão.
      ultimoErro = erro
      if (!semPermissao(erro)) throw erro
    }
  }
  throw ultimoErro
}

export async function salvarPerfil(uid, campos) {
  const dados = { atualizadoEm: serverTimestamp() }
  if ('nome' in campos) {
    dados.nome = limparNomePerfil(campos.nome)
    if (!dados.nome) throw new Error('O nome não pode ficar em branco.')
  }
  if ('foto' in campos) dados.foto = campos.foto || ''
  await updateDoc(perfilRef(uid), dados)
  return dados
}

export async function publicarResumo(uid, resumo) {
  if (!resumoValido(resumo)) throw new Error('Resumo de dieta inválido.')
  await setDoc(resumoRef(uid), { ...resumo, atualizadoEm: serverTimestamp() })
}

// Evita consultar o perfil a cada refeição salva.
const estadoSync = new Map()

export function marcarPerfilAtivo(uid, ativo) {
  estadoSync.set(uid, { ativo, ultimo: ativo ? estadoSync.get(uid)?.ultimo : undefined })
}

/**
 * Recalcula e publica o resumo de quem ativou o perfil. Não faz nada (e não
 * custa leitura depois da primeira vez) para quem não usa o recurso.
 */
export async function sincronizarResumoDieta(uid, plano, metaKcal, hojeId = dataLocalId()) {
  const estado = estadoSync.get(uid) || {}
  if (estado.ativo === undefined) {
    try { estado.ativo = (await getDoc(perfilRef(uid))).exists() }
    catch (erro) {
      if (!semPermissao(erro)) throw erro
      estado.ativo = false
    }
    estadoSync.set(uid, estado)
  }
  if (!estado.ativo) return null

  const inicio = deslocarDia(hojeId, -JANELA_DIAS)
  const snap = await getDocs(query(
    collection(db, 'users', uid, 'diario_dieta'),
    where('data', '>=', inicio),
    where('data', '<=', hojeId),
  ))
  const dias = Object.fromEntries(snap.docs.map(item => [item.id, item.data()]))
  const resumo = resumoDieta(dias, plano, metaKcal, hojeId)
  const chave = JSON.stringify(resumo)
  if (chave !== estado.ultimo) {
    await publicarResumo(uid, resumo)
    estado.ultimo = chave
  }
  return resumo
}

export async function buscarPerfilPorCodigo(codigo) {
  if (!codigoAmizadeValido(codigo)) return null
  const mapa = await getDoc(codigoRef(codigo))
  const uid = mapa.exists() ? mapa.data().uid : null
  if (!uid) return null
  const perfil = await carregarPerfil(uid)
  return perfil ? { uid, nome: perfil.nome, foto: perfil.foto || '' } : null
}

export async function enviarPedido(meuUid, outroUid) {
  await setDoc(amizadeRef(meuUid, outroUid), {
    membros: [meuUid, outroUid].sort(),
    solicitante: meuUid,
    status: 'pendente',
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  })
}

export async function aceitarPedido(meuUid, outroUid) {
  await updateDoc(amizadeRef(meuUid, outroUid), { status: 'aceita', atualizadoEm: serverTimestamp() })
}

// Serve para recusar, cancelar um pedido enviado e desfazer a amizade.
export async function removerAmizade(meuUid, outroUid) {
  await deleteDoc(amizadeRef(meuUid, outroUid))
}

export async function listarAmizades(uid) {
  const snap = await getDocs(query(collection(db, 'amizades'), where('membros', 'array-contains', uid)))
  return snap.docs.map(item => {
    const dados = item.data()
    return {
      id: item.id,
      uid: (dados.membros || []).find(membro => membro !== uid),
      status: dados.status === 'aceita' ? 'aceita' : 'pendente',
      enviadoPorMim: dados.solicitante === uid,
    }
  }).filter(item => item.uid)
}

// Perfil de outra pessoa; o resumo de dieta só existe para amizade aceita.
export async function carregarPessoa(uid, comResumo) {
  const [perfil, resumo] = await Promise.all([
    carregarPerfil(uid).catch(() => null),
    comResumo ? getDoc(resumoRef(uid)).then(snap => (snap.exists() ? snap.data() : null)).catch(() => null) : null,
  ])
  return {
    nome: perfil?.nome || 'Perfil desativado',
    foto: perfil?.foto || '',
    perfilAtivo: Boolean(perfil),
    resumo: resumoValido(resumo) ? resumo : null,
  }
}

export async function desativarPerfil(uid, codigo) {
  const amizades = await listarAmizades(uid)
  await Promise.all(amizades.map(amizade => removerAmizade(uid, amizade.uid)))
  await deleteDoc(resumoRef(uid))
  await deleteDoc(perfilRef(uid))
  if (codigoAmizadeValido(codigo)) await deleteDoc(codigoRef(codigo))
  marcarPerfilAtivo(uid, false)
}
