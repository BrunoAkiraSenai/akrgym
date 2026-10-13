import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, Check, Copy, Flame, Minus, ShieldCheck, Trash, UserPlus, Users, X } from 'lucide-react'
import { useUser } from '../../context/UserContext'
import ConfirmModal from '../ConfirmModal'
import { prepararFotoPerfil } from '../../utils/avatar'
import {
  DIA_SOCIAL, JANELA_DIAS, LIMITE_AMIGOS, NOME_PERFIL_MAX, codigoAmizadeValido, dataLocalId, formatarCodigoAmizade,
  iniciaisPerfil, limparNomePerfil, normalizarCodigoAmizade, ordenarRanking, sequenciaVigente,
} from '../../utils/social'
import {
  aceitarPedido, ativarPerfil, buscarPerfilPorCodigo, carregarPerfil, carregarPessoa, desativarPerfil, enviarPedido,
  listarAmizades, marcarPerfilAtivo, removerAmizade, salvarPerfil, semPermissao, sincronizarResumoDieta,
} from '../../utils/socialStore'

function mensagemDeErro(erro) {
  if (semPermissao(erro)) return 'O recurso de amigos ainda não está liberado no servidor. Tente novamente mais tarde.'
  if (erro?.code === 'unavailable') return 'Sem conexão. Verifique a internet e tente novamente.'
  return erro?.code ? 'Não foi possível concluir agora. Tente novamente.' : (erro?.message || 'Não foi possível concluir agora.')
}

function Avatar({ nome, foto, grande = false }) {
  return (
    <span className={`social-avatar${grande ? ' social-avatar-lg' : ''}`} aria-hidden="true">
      {foto ? <img src={foto} alt="" width={grande ? 72 : 40} height={grande ? 72 : 40} /> : iniciaisPerfil(nome)}
    </span>
  )
}

const ROTULO_DIA = { [DIA_SOCIAL.OK]: 'dentro da meta', [DIA_SOCIAL.FORA]: 'fora da meta', [DIA_SOCIAL.VAZIO]: 'sem registro' }
const ICONE_DIA = { [DIA_SOCIAL.OK]: Check, [DIA_SOCIAL.FORA]: X, [DIA_SOCIAL.VAZIO]: Minus }

function Semana({ ultimos7 }) {
  const contar = status => ultimos7.filter(item => item === status).length
  const descricao = `Últimos 7 dias: ${contar(DIA_SOCIAL.OK)} dentro da meta, ${contar(DIA_SOCIAL.FORA)} fora, ${contar(DIA_SOCIAL.VAZIO)} sem registro`
  return (
    <span className="social-week" role="img" aria-label={descricao}>
      {ultimos7.map((status, indice) => {
        const Icone = ICONE_DIA[status] || Minus
        return <span key={indice} className="social-week-day" data-status={status} title={ROTULO_DIA[status]}><Icone size={11} strokeWidth={3} aria-hidden="true" /></span>
      })}
    </span>
  )
}

function Numeros({ resumo, hoje }) {
  if (!resumo) return <p className="social-muted">Ainda sem dias registrados para mostrar.</p>
  const sequencia = sequenciaVigente(resumo, hoje)
  return (
    <div className="social-numbers">
      <span className="social-streak"><Flame size={14} aria-hidden="true" /> <strong>{sequencia === JANELA_DIAS ? `${JANELA_DIAS}+` : sequencia}</strong> {sequencia === 1 ? 'dia seguido' : 'dias seguidos'}</span>
      <span className="social-muted"><strong>{resumo.acertos30}</strong> de {JANELA_DIAS} dias na meta</span>
      <Semana ultimos7={resumo.ultimos7} />
      {resumo.ate !== hoje && <span className="social-muted">Atualizado em {resumo.ate.slice(8, 10)}/{resumo.ate.slice(5, 7)}</span>}
    </div>
  )
}

export default function AmigosDieta({ refs, metaKcal, baseReady }) {
  const user = useUser()
  const uid = user.uid
  const hoje = dataLocalId()
  const [fase, setFase] = useState('carregando')
  const [perfil, setPerfil] = useState(null)
  const [meuResumo, setMeuResumo] = useState(null)
  const [amizades, setAmizades] = useState([])
  const [aviso, setAviso] = useState(null)
  const [ocupado, setOcupado] = useState('')
  const [nomeNovo, setNomeNovo] = useState(() => limparNomePerfil(user.displayName || ''))
  const [nomeEditado, setNomeEditado] = useState(null)
  const [codigoBusca, setCodigoBusca] = useState('')
  const [encontrado, setEncontrado] = useState(null)
  const [codigoCopiado, setCodigoCopiado] = useState(false)
  const [confirmacao, setConfirmacao] = useState(null)
  const sequencia = useRef(0)
  const planoRef = useRef({ refs, metaKcal })
  useEffect(() => { planoRef.current = { refs, metaKcal } }, [refs, metaKcal])
  useEffect(() => () => { sequencia.current++ }, [])

  const carregar = useCallback(async () => {
    const atual = ++sequencia.current
    const vigente = () => atual === sequencia.current
    try {
      const dados = await carregarPerfil(uid)
      if (!vigente()) return
      if (!dados) { marcarPerfilAtivo(uid, false); setPerfil(null); setFase('sem-perfil'); return }
      marcarPerfilAtivo(uid, true)
      const [resumo, lista] = await Promise.all([
        sincronizarResumoDieta(uid, planoRef.current.refs, planoRef.current.metaKcal).catch(() => null),
        listarAmizades(uid),
      ])
      const pessoas = await Promise.all(lista.map(async amizade => ({ ...amizade, ...(await carregarPessoa(amizade.uid, amizade.status === 'aceita')) })))
      if (!vigente()) return
      setPerfil(dados); setMeuResumo(resumo); setAmizades(pessoas); setFase('ativo')
    } catch (erro) {
      if (!vigente()) return
      setAviso({ tipo: 'erro', texto: mensagemDeErro(erro) })
      setFase('erro')
    }
  }, [uid])

  // O resumo depende do plano; espera a base da Dieta antes de calcular.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (baseReady && !user.isAnonymous) carregar() }, [baseReady, carregar, user.isAnonymous])

  // Uma ação por vez, com o erro sempre visível para a pessoa.
  const executar = async (chave, acao, sucesso) => {
    if (ocupado) return false
    setOcupado(chave); setAviso(null)
    try {
      await acao()
      if (sucesso) setAviso({ tipo: 'sucesso', texto: sucesso })
      return true
    } catch (erro) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(erro) })
      return false
    } finally {
      setOcupado('')
    }
  }

  const ativar = () => executar('ativar', async () => {
    await ativarPerfil(uid, nomeNovo)
    await carregar()
  }, 'Perfil ativado. Compartilhe seu código para adicionar amigos.')

  const salvarNome = () => executar('nome', async () => {
    const dados = await salvarPerfil(uid, { nome: nomeEditado })
    setPerfil(atual => ({ ...atual, nome: dados.nome }))
    setNomeEditado(null)
  }, 'Nome atualizado.')

  const trocarFoto = evento => {
    const arquivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!arquivo) return
    executar('foto', async () => {
      const foto = await prepararFotoPerfil(arquivo)
      await salvarPerfil(uid, { foto })
      setPerfil(atual => ({ ...atual, foto }))
    }, 'Foto atualizada.')
  }

  const removerFoto = () => executar('foto', async () => {
    await salvarPerfil(uid, { foto: '' })
    setPerfil(atual => ({ ...atual, foto: '' }))
  }, 'Foto removida.')

  const copiarCodigo = async () => {
    try {
      await navigator.clipboard.writeText(perfil.codigo)
      setCodigoCopiado(true)
      setTimeout(() => setCodigoCopiado(false), 2400)
    } catch {
      setAviso({ tipo: 'erro', texto: 'Não foi possível copiar. Anote o código mostrado na tela.' })
    }
  }

  const buscar = () => {
    const codigo = normalizarCodigoAmizade(codigoBusca)
    setEncontrado(null)
    if (!codigoAmizadeValido(codigo)) { setAviso({ tipo: 'erro', texto: 'O código tem 8 letras e números. Confira e tente de novo.' }); return }
    if (codigo === perfil.codigo) { setAviso({ tipo: 'erro', texto: 'Esse é o seu próprio código.' }); return }
    executar('buscar', async () => {
      const pessoa = await buscarPerfilPorCodigo(codigo)
      if (!pessoa) throw new Error('Não encontramos ninguém com esse código.')
      const existente = amizades.find(amizade => amizade.uid === pessoa.uid)
      if (existente?.status === 'aceita') throw new Error(`Você e ${pessoa.nome} já são amigos.`)
      if (existente?.enviadoPorMim) throw new Error(`Você já enviou um pedido para ${pessoa.nome}.`)
      setEncontrado({ ...pessoa, pedidoRecebido: Boolean(existente) })
    })
  }

  const confirmarPedido = () => {
    const pessoa = encontrado
    if (amizades.length >= LIMITE_AMIGOS) { setAviso({ tipo: 'erro', texto: `O limite é de ${LIMITE_AMIGOS} amigos e pedidos.` }); return }
    executar('pedido', async () => {
      if (pessoa.pedidoRecebido) await aceitarPedido(uid, pessoa.uid)
      else {
        try { await enviarPedido(uid, pessoa.uid) }
        catch (erro) { throw semPermissao(erro) ? new Error('Já existe um pedido entre vocês. Confira a lista de pedidos.') : erro }
      }
      setEncontrado(null); setCodigoBusca('')
      await carregar()
    }, pessoa.pedidoRecebido ? `Agora você e ${pessoa.nome} são amigos.` : `Pedido enviado para ${pessoa.nome}.`)
  }

  const aceitar = pessoa => executar(`aceitar:${pessoa.uid}`, async () => { await aceitarPedido(uid, pessoa.uid); await carregar() }, `Agora você e ${pessoa.nome} são amigos.`)
  const remover = (pessoa, mensagem) => executar(`remover:${pessoa.uid}`, async () => { await removerAmizade(uid, pessoa.uid); await carregar() }, mensagem)

  const desativar = () => executar('desativar', async () => {
    await desativarPerfil(uid, perfil.codigo)
    setPerfil(null); setAmizades([]); setMeuResumo(null); setFase('sem-perfil')
  }, 'Perfil desativado. Seus amigos não veem mais seus dias de dieta.')

  const feedback = aviso && (
    <p className={`social-feedback social-feedback-${aviso.tipo}`} role={aviso.tipo === 'erro' ? 'alert' : 'status'}>{aviso.texto}</p>
  )

  if (user.isAnonymous) {
    return (
      <div className="card-premium social-empty">
        <Users size={26} aria-hidden="true" />
        <h2>Amigos precisam de uma conta</h2>
        <p>Entre com e-mail ou Google em Configurar para criar seu perfil e adicionar amigos.</p>
      </div>
    )
  }

  if (fase === 'carregando') return <div className="space-y-2" role="status" aria-label="Carregando amigos"><div className="skeleton skeleton-card" /><div className="skeleton skeleton-card" /></div>

  if (fase === 'erro') {
    return (
      <div className="card-premium social-empty">
        {feedback}
        <button type="button" className="btn-secondary" onClick={() => { setFase('carregando'); setAviso(null); carregar() }}>Tentar novamente</button>
      </div>
    )
  }

  if (fase === 'sem-perfil') {
    return (
      <div className="card-premium social-card">
        <span className="section-label"><Users size={13} aria-hidden="true" /> Amigos</span>
        <h2 className="social-title">Compare seus dias de dieta com amigos</h2>
        <p className="social-text">Ative seu perfil para trocar códigos com amigos e ver quem está mantendo a sequência.</p>
        <p className="social-privacy"><ShieldCheck size={15} aria-hidden="true" /> <span>Seus amigos veem só seu nome, sua foto e quantos dias você ficou dentro da meta. Refeições, calorias, treinos e medidas continuam privados.</span></p>
        <label className="social-field">
          <span>Como seus amigos vão ver você</span>
          <input type="text" maxLength={NOME_PERFIL_MAX} autoComplete="nickname" placeholder="Seu nome ou apelido" value={nomeNovo} onChange={evento => setNomeNovo(evento.target.value)} />
        </label>
        {feedback}
        <button type="button" className="btn-primary w-full py-3" onClick={ativar} disabled={Boolean(ocupado) || !limparNomePerfil(nomeNovo)}>
          {ocupado === 'ativar' ? 'Ativando...' : 'Ativar meu perfil'}
        </button>
      </div>
    )
  }

  const recebidos = amizades.filter(amizade => amizade.status === 'pendente' && !amizade.enviadoPorMim)
  const enviados = amizades.filter(amizade => amizade.status === 'pendente' && amizade.enviadoPorMim)
  const amigos = amizades.filter(amizade => amizade.status === 'aceita')
  const ranking = ordenarRanking([{ uid, nome: perfil.nome, foto: perfil.foto, resumo: meuResumo, eu: true }, ...amigos], hoje)

  return (
    <>
      <div className="card-premium social-card">
        <span className="section-label"><Users size={13} aria-hidden="true" /> Seu perfil</span>
        <div className="social-profile">
          <div className="social-photo">
            <Avatar nome={perfil.nome} foto={perfil.foto} grande />
            <label className="social-photo-button" title="Trocar foto">
              <Camera size={15} aria-hidden="true" />
              <span className="sr-only">Trocar foto do perfil</span>
              <input type="file" accept="image/*" onChange={trocarFoto} disabled={Boolean(ocupado)} />
            </label>
          </div>
          <div className="social-profile-main">
            {nomeEditado === null ? (
              <p className="social-name">{perfil.nome} <button type="button" className="social-link" onClick={() => setNomeEditado(perfil.nome)}>Editar nome</button></p>
            ) : (
              <div className="social-inline-form">
                <label className="social-field"><span>Nome</span><input type="text" maxLength={NOME_PERFIL_MAX} value={nomeEditado} onChange={evento => setNomeEditado(evento.target.value)} /></label>
                <button type="button" className="btn-secondary" onClick={salvarNome} disabled={Boolean(ocupado) || !limparNomePerfil(nomeEditado) || limparNomePerfil(nomeEditado) === perfil.nome}>Salvar</button>
                <button type="button" className="social-link" onClick={() => setNomeEditado(null)}>Cancelar</button>
              </div>
            )}
            {perfil.foto && <button type="button" className="social-link" onClick={removerFoto} disabled={Boolean(ocupado)}>Remover foto</button>}
            {ocupado === 'foto' && <span className="social-muted" role="status">Salvando foto...</span>}
          </div>
        </div>
        <div className="social-code">
          <div><span className="social-muted">Seu código de amizade</span><strong>{formatarCodigoAmizade(perfil.codigo)}</strong></div>
          <button type="button" className="btn-secondary" onClick={copiarCodigo}>{codigoCopiado ? <><Check size={15} aria-hidden="true" /> Copiado</> : <><Copy size={15} aria-hidden="true" /> Copiar</>}</button>
        </div>
        <span className="sr-only" role="status">{codigoCopiado ? 'Código copiado.' : ''}</span>
      </div>

      <div className="card-premium social-card">
        <span className="section-label"><UserPlus size={13} aria-hidden="true" /> Adicionar amigo</span>
        <div className="social-inline-form">
          <label className="social-field social-field-grow">
            <span>Código do amigo</span>
            <input type="text" inputMode="text" autoCapitalize="characters" autoComplete="off" spellCheck={false} maxLength={12} placeholder="ABCD-2345"
              value={codigoBusca} onChange={evento => { setCodigoBusca(evento.target.value.toUpperCase()); setEncontrado(null) }}
              onKeyDown={evento => { if (evento.key === 'Enter') buscar() }} />
          </label>
          <button type="button" className="btn-secondary" onClick={buscar} disabled={Boolean(ocupado) || !codigoBusca.trim()}>{ocupado === 'buscar' ? 'Buscando...' : 'Buscar'}</button>
        </div>
        {encontrado && (
          <div className="social-row social-found">
            <Avatar nome={encontrado.nome} foto={encontrado.foto} />
            <div className="social-row-main"><strong>{encontrado.nome}</strong><span className="social-muted">{encontrado.pedidoRecebido ? 'Já te enviou um pedido' : 'Perfil encontrado'}</span></div>
            <button type="button" className="btn-primary social-action" onClick={confirmarPedido} disabled={Boolean(ocupado)}>{encontrado.pedidoRecebido ? 'Aceitar' : 'Enviar pedido'}</button>
          </div>
        )}
        {feedback}
      </div>

      {(recebidos.length > 0 || enviados.length > 0) && (
        <div className="card-premium social-card">
          <span className="section-label">Pedidos</span>
          <ul className="social-list">
            {recebidos.map(pessoa => (
              <li key={pessoa.uid} className="social-row">
                <Avatar nome={pessoa.nome} foto={pessoa.foto} />
                <div className="social-row-main"><strong>{pessoa.nome}</strong><span className="social-muted">Quer ser seu amigo</span></div>
                <div className="social-row-actions">
                  <button type="button" className="btn-primary social-action" onClick={() => aceitar(pessoa)} disabled={Boolean(ocupado)}>Aceitar</button>
                  <button type="button" className="btn-secondary social-action" onClick={() => remover(pessoa, 'Pedido recusado.')} disabled={Boolean(ocupado)}>Recusar</button>
                </div>
              </li>
            ))}
            {enviados.map(pessoa => (
              <li key={pessoa.uid} className="social-row">
                <Avatar nome={pessoa.nome} foto={pessoa.foto} />
                <div className="social-row-main"><strong>{pessoa.nome}</strong><span className="social-muted">Aguardando resposta</span></div>
                <button type="button" className="btn-secondary social-action" onClick={() => remover(pessoa, 'Pedido cancelado.')} disabled={Boolean(ocupado)}>Cancelar</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card-premium social-card">
        <span className="section-label"><Flame size={13} aria-hidden="true" /> Dias na meta</span>
        <ol className="social-list">
          {ranking.map((pessoa, indice) => (
            <li key={pessoa.uid} className={`social-row social-rank${pessoa.eu ? ' social-rank-me' : ''}`}>
              <span className="social-position" aria-label={`${indice + 1}º lugar`}>{indice + 1}</span>
              <Avatar nome={pessoa.nome} foto={pessoa.foto} />
              <div className="social-row-main">
                <strong>{pessoa.nome}{pessoa.eu && <span className="social-you"> Você</span>}</strong>
                <Numeros resumo={pessoa.resumo} hoje={hoje} />
              </div>
              {!pessoa.eu && (
                <button type="button" className="social-remove" aria-label={`Desfazer amizade com ${pessoa.nome}`} title="Desfazer amizade" disabled={Boolean(ocupado)}
                  onClick={() => setConfirmacao({ title: 'Desfazer amizade?', message: `Você e ${pessoa.nome} deixam de ver os dias de dieta um do outro.`, onConfirm: () => remover(pessoa, 'Amizade desfeita.') })}>
                  <Trash size={15} aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ol>
        {amigos.length === 0 && <p className="social-muted">Você ainda não tem amigos aqui. Envie seu código para alguém ou digite o código de um amigo acima.</p>}
        <p className="social-note">A sequência conta dias seguidos dentro da meta de calorias. Hoje só entra depois que você registra o que comeu.</p>
      </div>

      <button type="button" className="social-link social-deactivate" disabled={Boolean(ocupado)}
        onClick={() => setConfirmacao({ title: 'Desativar perfil?', message: 'Seu perfil, seu código e suas amizades são apagados. Seu diário, treinos e medidas não são afetados.', onConfirm: desativar })}>
        Desativar meu perfil de amigos
      </button>

      <ConfirmModal
        isOpen={confirmacao !== null}
        title={confirmacao?.title}
        message={confirmacao?.message}
        onConfirm={() => { const acao = confirmacao?.onConfirm; setConfirmacao(null); acao?.() }}
        onCancel={() => setConfirmacao(null)}
      />
    </>
  )
}
