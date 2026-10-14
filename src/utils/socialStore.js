// Acesso ao Firestore do recurso de amigos.
//
//   perfis/{uid}                       nome, foto, codigo (identidade)
//   perfis/{uid}/compartilhado/dieta   resumo dos dias de dieta (só amigos leem)
//   perfis/{uid}/compartilhado/mes-YYYY-MM   calendário do mês (só amigos leem)
//   codigos_amizade/{codigo}           { uid } — permite achar alguém pelo código
//   amizades/{uidA_uidB}               pedido pendente ou amizade aceita
import {
  collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'
import {
  JANELA_DIAS, calendarioMes, calendarioValido, codigoAmizadeValido, dataLocalId, deslocarDia, deslocarMes,
  gerarCodigoAmizade, idAmizade, limparNomePerfil, mesId, resumoDieta, resumoValido,
} from './social.js'

const perfilRef = uid => doc(db, 'perfis', uid)
const resumoRef = uid => doc(db, 'perfis', uid, 'compartilhado', 'dieta')
const calendarioRef = (uid, mes) => doc(db, 'perfis', uid, 'compartilhado', `mes-${mes}`)
const MESES_HISTORICO = 6
const CHAVE_HISTORICO = uid => `akrgym-social-calendario-v1-${uid}`
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

  // Uma leitura cobre o resumo (30 dias) e o calendário do mês atual e do anterior.
  const [ano, mes] = hojeId.split('-').map(Number)
  const anterior = deslocarMes(ano, mes, -1)
  const inicioResumo = deslocarDia(hojeId, -JANELA_DIAS)
  const inicioCalendario = `${mesId(anterior.ano, anterior.mes)}-01`
  const dias = await lerDiario(uid, inicioResumo < inicioCalendario ? inicioResumo : inicioCalendario, hojeId)

  const resumo = resumoDieta(dias, plano, metaKcal, hojeId)
  const chave = JSON.stringify(resumo)
  if (chave !== estado.ultimo) {
    await publicarResumo(uid, resumo)
    estado.ultimo = chave
  }

  estado.meses ||= {}
  try {
    for (const alvo of [anterior, { ano, mes }]) {
      await publicarCalendario(uid, estado, alvo, calendarioMes(dias, plano, metaKcal, alvo.ano, alvo.mes, hojeId))
    }
  } catch { /* O resumo já foi publicado; o calendário tenta de novo na próxima vez. */ }
  return resumo
}

async function lerDiario(uid, inicio, fim) {
  const snap = await getDocs(query(
    collection(db, 'users', uid, 'diario_dieta'),
    where('data', '>=', inicio),
    where('data', '<=', fim),
  ))
  return Object.fromEntries(snap.docs.map(item => [item.id, item.data()]))
}

async function publicarCalendario(uid, estado, { ano, mes }, dias) {
  const id = mesId(ano, mes)
  const chave = JSON.stringify(dias)
  if (estado.meses[id] === chave) return
  await setDoc(calendarioRef(uid, id), { dias, atualizadoEm: serverTimestamp() })
  estado.meses[id] = chave
}

/**
 * Publica os meses anteriores uma única vez por aparelho, para o amigo
 * conseguir voltar no calendário. Os dois meses mais recentes já são mantidos
 * por sincronizarResumoDieta.
 */
export async function publicarHistoricoCalendario(uid, plano, metaKcal, hojeId = dataLocalId()) {
  try { if (localStorage.getItem(CHAVE_HISTORICO(uid)) === hojeId.slice(0, 7)) return } catch { /* Sem armazenamento, publica de novo. */ }
  const [ano, mes] = hojeId.split('-').map(Number)
  const alvos = Array.from({ length: MESES_HISTORICO - 2 }, (_, i) => deslocarMes(ano, mes, -(i + 2)))
  const maisAntigo = alvos.at(-1), maisRecente = alvos[0]
  const dias = await lerDiario(uid, `${mesId(maisAntigo.ano, maisAntigo.mes)}-01`, `${mesId(maisRecente.ano, maisRecente.mes)}-31`)
  const estado = estadoSync.get(uid) || {}
  estado.meses ||= {}
  estadoSync.set(uid, estado)
  for (const alvo of alvos) {
    const calendario = calendarioMes(dias, plano, metaKcal, alvo.ano, alvo.mes, hojeId)
    // Mês sem nenhum registro não precisa de documento.
    if (Object.keys(calendario).length) await publicarCalendario(uid, estado, alvo, calendario)
  }
  try { localStorage.setItem(CHAVE_HISTORICO(uid), hojeId.slice(0, 7)) } catch { /* Opcional. */ }
}

// `null` = a pessoa ainda não publicou esse mês.
export async function carregarCalendarioAmigo(uid, ano, mes) {
  const snap = await getDoc(calendarioRef(uid, mesId(ano, mes)))
  if (!snap.exists()) return null
  const dias = snap.data().dias
  return calendarioValido(dias) ? dias : {}
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
  // Resumo e todos os meses de calendário publicados.
  const compartilhado = await getDocs(collection(db, 'perfis', uid, 'compartilhado'))
  await Promise.all(compartilhado.docs.map(item => deleteDoc(item.ref)))
  try { localStorage.removeItem(CHAVE_HISTORICO(uid)) } catch { /* Opcional. */ }
  await deleteDoc(perfilRef(uid))
  if (codigoAmizadeValido(codigo)) await deleteDoc(codigoRef(codigo))
  marcarPerfilAtivo(uid, false)
}
