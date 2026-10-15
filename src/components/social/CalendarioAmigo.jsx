import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Avatar from './Avatar'
import { DIET_DAY_STATUS } from '../../utils/dietDiary'
import { dataLocalId, deslocarMes, diasDoCalendario, mesId } from '../../utils/social'
import { carregarCalendarioAmigo, semPermissao } from '../../utils/socialStore'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// Mesmo calendário da aba Estatísticas, só para leitura, com os dados que o
// amigo compartilha: dia dentro da meta ou diferença em kcal.
export default function CalendarioAmigo({ pessoa, onVoltar }) {
  const hoje = dataLocalId()
  const [anoHoje, mesHoje] = hoje.split('-').map(Number)
  const [mesAtual, setMesAtual] = useState({ ano: anoHoje, mes: mesHoje })
  const [estado, setEstado] = useState({ fase: 'carregando', dias: null })
  const cache = useRef(new Map())
  const voltarRef = useRef(null)

  useEffect(() => { voltarRef.current?.focus({ preventScroll: true }) }, [])

  const { ano, mes } = mesAtual
  useEffect(() => {
    const id = mesId(ano, mes)
    if (cache.current.has(id)) {
      setEstado({ fase: 'pronto', dias: cache.current.get(id) })
      return undefined
    }
    let ativo = true
    setEstado({ fase: 'carregando', dias: null })
    carregarCalendarioAmigo(pessoa.uid, ano, mes).then(dias => {
      cache.current.set(id, dias)
      if (ativo) setEstado({ fase: 'pronto', dias })
    }).catch(erro => {
      if (ativo) setEstado({ fase: 'erro', dias: null, mensagem: semPermissao(erro) ? 'Vocês não são mais amigos, ou o calendário ainda não está liberado.' : 'Não foi possível carregar o calendário. Verifique a conexão.' })
    })
    return () => { ativo = false }
  }, [ano, mes, pessoa.uid])

  const podeAvancar = ano < anoHoje || (ano === anoHoje && mes < mesHoje)
  const nomeMes = new Date(ano, mes - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^(\w)/, letra => letra.toUpperCase())
  const primeiroDia = new Date(ano, mes - 1, 1).getDay()
  const dias = diasDoCalendario(estado.dias, ano, mes, hoje)
  // Mês não publicado (ou ainda carregando) não entra nas contas.
  const avaliados = estado.fase === 'pronto' && estado.dias !== null ? dias.filter(dia => !dia.futuro) : []
  const verdes = avaliados.filter(dia => dia.status === DIET_DAY_STATUS.COMPLETE).length
  const vermelhos = avaliados.filter(dia => dia.status === DIET_DAY_STATUS.OUT_OF_PLAN).length
  const amarelos = avaliados.length - verdes - vermelhos
  const parte = quantidade => `${avaliados.length ? (quantidade / avaliados.length) * 100 : 0}%`
  const semPublicacao = estado.fase === 'pronto' && estado.dias === null

  return (
    <div className="flex flex-col gap-3">
      <div className="card-premium social-card">
        <button ref={voltarRef} type="button" className="social-link social-back" onClick={onVoltar}><ChevronLeft size={15} aria-hidden="true" /> Voltar para amigos</button>
        <div className="social-profile">
          <Avatar nome={pessoa.nome} foto={pessoa.foto} grande />
          <div className="social-profile-main">
            <h2 className="social-title">{pessoa.nome}</h2>
            <p className="social-muted">Calendário de dieta compartilhado</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="card-premium p-4 text-center">
          <span className="text-2xl font-bold text-white">{avaliados.length}</span>
          <span className="text-neutral-500 text-xs block mt-0.5">Dias avaliados</span>
        </div>
        <div className="card-premium p-4 text-center">
          <span className="text-2xl font-bold text-emerald-400">{avaliados.length ? Math.round((verdes / avaliados.length) * 100) : 0}%</span>
          <span className="text-neutral-500 text-xs block mt-0.5">Dias dentro da meta</span>
        </div>
      </div>

      <div className="card-premium p-4 space-y-2">
        <div className="flex flex-wrap gap-2 items-center justify-between text-xs">
          <span className="text-emerald-400 font-medium"><span className="diet-legend-dot diet-legend-good" /> {verdes} dias concluídos</span>
          <span className="text-yellow-400 font-medium"><span className="diet-legend-dot diet-legend-warn" /> {amarelos} não preenchidos</span>
          <span className="text-red-400 font-medium"><span className="diet-legend-dot diet-legend-danger" /> {vermelhos} fora da dieta</span>
        </div>
        <div className="h-2 bg-neutral-800 rounded-full overflow-hidden flex">
          <div className="h-full bg-emerald-500/60" style={{ width: parte(verdes) }} />
          <div className="h-full bg-yellow-500/60" style={{ width: parte(amarelos) }} />
          <div className="h-full bg-red-500/60" style={{ width: parte(vermelhos) }} />
        </div>
      </div>

      <div className="card-premium diet-calendar-panel" aria-busy={estado.fase === 'carregando'}>
        <div className="flex items-center justify-between mb-2">
          <button type="button" onClick={() => setMesAtual(deslocarMes(ano, mes, -1))} aria-label="Mês anterior"
            className="border border-white/10 rounded-xl p-2 text-white/60 hover:text-white transition active:scale-[0.97]">
            <ChevronLeft size={16} />
          </button>
          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider" aria-live="polite">{nomeMes}</span>
          <button type="button" onClick={() => podeAvancar && setMesAtual(deslocarMes(ano, mes, 1))} disabled={!podeAvancar} aria-label="Próximo mês"
            className={`border rounded-xl p-2 transition active:scale-[0.97] ${podeAvancar ? 'border-white/10 text-white/60 hover:text-white' : 'border-transparent text-neutral-700 cursor-not-allowed'}`}>
            <ChevronRight size={16} />
          </button>
        </div>

        {estado.fase === 'erro' ? (
          <p className="social-feedback social-feedback-erro" role="alert">{estado.mensagem}</p>
        ) : estado.fase === 'carregando' ? (
          <div className="skeleton skeleton-card" role="status" aria-label="Carregando calendário" />
        ) : semPublicacao ? (
          // Sem publicação não dá para saber se houve registro: nada de pintar o mês de "sem registro".
          <div className="social-empty" role="status">
            <h2>{pessoa.nome} ainda não compartilhou este mês</h2>
            <p>O calendário aparece depois que {pessoa.nome} abrir o app atualizado e entrar em Dieta. Se o app dele estiver instalado, peça para fechar e abrir de novo.</p>
          </div>
        ) : (
          <>
            <div className="diet-calendar-grid">
              {DIAS_SEMANA.map(dia => <div key={dia} className="diet-calendar-weekday">{dia}</div>)}
              {Array.from({ length: primeiroDia }).map((_, indice) => <div key={`vazio-${indice}`} />)}
              {dias.map(({ dia, data, futuro, status, comentario, comentarioCompacto, detalhe }) => (
                <div key={data} className="diet-calendar-day social-calendar-day" data-status={futuro ? 'futuro' : status}
                  aria-current={data === hoje ? 'date' : undefined} role="img" aria-label={`${dia} de ${nomeMes}: ${detalhe}`} title={detalhe}>
                  <span className="diet-calendar-date">{dia}</span>
                  {comentario && <>
                    <span className="diet-calendar-comment diet-calendar-comment-full" aria-hidden="true">{comentario}</span>
                    <span className="diet-calendar-comment diet-calendar-comment-compact" aria-hidden="true">{comentarioCompacto}</span>
                  </>}
                </div>
              ))}
            </div>
          </>
        )}
        <p className="diet-calendar-note">Acima/abaixo indica a diferença para a meta do dia. Refeições e totais de {pessoa.nome} não são compartilhados.</p>
      </div>
    </div>
  )
}
