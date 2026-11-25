import { useState } from 'react'
import { signOut } from 'firebase/auth'
import { AlertTriangle, Loader, Sparkles, Trash } from 'lucide-react'
import { auth } from '../../firebase'
import { useContaAtual } from '../../context/ContaContext'
import { excluirConta } from '../../utils/contaStore'
import { precisaEntrarDeNovo } from '../../utils/planos'

const PALAVRA = 'EXCLUIR'

function textoLimite(limite) {
  return limite == null ? 'sem limite' : `até ${limite}`
}

// Plano atual e uso da IA no mês.
export default function ContaPlano({ user }) {
  const { plano, uso, abrirLogin } = useContaAtual()
  return (
    <section className="settings-plan card-premium" aria-labelledby="plano-heading">
      <div className="settings-account-avatar"><Sparkles size={18} /></div>
      <div className="min-w-0 flex-1">
        <h2 id="plano-heading" className="text-sm font-semibold text-white">Plano {plano.nome}</h2>
        <p className="mt-1 text-xs leading-relaxed text-neutral-500">{plano.descricao}</p>
        <dl className="settings-plan-uso">
          <div><dt>Análises de IA este mês</dt><dd className="num">{uso.mes}</dd></div>
          <div><dt>Limite por dia</dt><dd>{textoLimite(plano.limites.iaPorDia)}</dd></div>
        </dl>
        {user.isAnonymous && <p className="settings-plan-aviso">Visitante não usa a análise por IA nem amigos. Seus registros vão junto para a conta nova.</p>}
        {user.isAnonymous && abrirLogin && <button type="button" onClick={abrirLogin} className="settings-action settings-action-primary mt-2">Criar conta ou entrar</button>}
      </div>
    </section>
  )
}

// Exclusão da conta e de todos os dados (LGPD). Fica por último, depois de exportar.
export function ExcluirConta({ user }) {
  const [aberto, setAberto] = useState(false)
  const [confirmacao, setConfirmacao] = useState('')
  const [etapa, setEtapa] = useState(null)
  const [erro, setErro] = useState(null)
  const excluindo = etapa !== null
  const pedirLogin = precisaEntrarDeNovo(user)

  const confirmar = async () => {
    if (confirmacao.trim().toUpperCase() !== PALAVRA || excluindo) return
    setErro(null)
    try {
      await excluirConta(user, setEtapa)
      // O App volta para o login quando a conta deixa de existir.
    } catch (err) {
      setEtapa(null)
      setErro(err?.code === 'auth/requires-recent-login'
        ? 'Seus dados já foram apagados. Para encerrar a conta, saia, entre de novo e toque em "Excluir conta" outra vez.'
        : `Não foi possível concluir a exclusão: ${err?.message || 'erro desconhecido'}. Tente de novo.`)
    }
  }

  return (
      <section className="settings-delete card-premium" aria-labelledby="excluir-heading">
        <div className="min-w-0">
          <h2 id="excluir-heading" className="text-sm font-semibold text-white">Excluir conta</h2>
          <p className="mt-1 text-xs leading-relaxed text-neutral-500">Apaga para sempre treinos, dieta, medidas, perfil de amigos e o seu login. Exporte seus dados antes, se quiser guardar uma cópia.</p>
        </div>
        {!aberto ? (
          <button type="button" onClick={() => setAberto(true)} className="settings-action settings-action-danger self-start"><Trash size={14} /> Excluir conta</button>
        ) : pedirLogin ? (
          <div className="settings-delete-confirm">
            <p><AlertTriangle size={14} aria-hidden="true" /> Por segurança, o Google só permite excluir uma conta logo depois de entrar. Saia, entre de novo e volte aqui.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => signOut(auth)} className="settings-action settings-action-primary">Sair e entrar de novo</button>
              <button type="button" onClick={() => setAberto(false)} className="settings-action settings-action-muted">Cancelar</button>
            </div>
          </div>
        ) : (
          <div className="settings-delete-confirm">
            <label htmlFor="confirmar-exclusao">Para confirmar, digite <strong>{PALAVRA}</strong></label>
            <input id="confirmar-exclusao" type="text" autoComplete="off" value={confirmacao} disabled={excluindo}
              onChange={e => setConfirmacao(e.target.value)} />
            {erro && <p className="settings-delete-erro" role="alert">{erro}</p>}
            {etapa && <p role="status" aria-live="polite"><Loader size={13} className="animate-spin" aria-hidden="true" /> {etapa}</p>}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={confirmar} disabled={confirmacao.trim().toUpperCase() !== PALAVRA || excluindo} className="settings-action settings-action-danger">
                {excluindo ? 'Excluindo...' : 'Excluir tudo para sempre'}
              </button>
              <button type="button" onClick={() => { setAberto(false); setConfirmacao(''); setErro(null) }} disabled={excluindo} className="settings-action settings-action-muted">Cancelar</button>
            </div>
          </div>
        )}
      </section>
  )
}
