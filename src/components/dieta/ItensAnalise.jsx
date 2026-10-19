import { X } from 'lucide-react'
import { rotuloEstado } from '../../utils/itensIA'

const formatar = v => (Math.round(v * 10) / 10).toLocaleString('pt-BR')

// Como a conta foi feita: um item por linha, com a origem do valor.
// As gramas podem ser corrigidas aqui; o total do formulário acompanha.
export default function ItensAnalise({ itens, onMudarGramas, onRemover }) {
  return (
    <section className="diet-ai-items" aria-label="Itens encontrados na descrição">
      <ul>
        {itens.map((item, indice) => {
          const estado = rotuloEstado(item)
          const campoId = `ia-item-gramas-${indice}`
          return (
            <li key={`${item.nome}-${indice}`} className="diet-ai-item">
              <div className="diet-ai-item-head">
                <strong>{item.referencia || item.nome}</strong>
                <button type="button" onClick={() => onRemover(indice)} className="diet-ai-item-remove" aria-label={`Tirar ${item.nome} da conta`}><X size={14} /></button>
              </div>
              <div className="diet-ai-item-tags">
                <span className={`diet-ai-tag ${item.fonte === 'taco' ? 'diet-ai-tag--taco' : 'diet-ai-tag--estimativa'}`}>{item.fonte === 'taco' ? 'TACO' : 'Estimativa da IA'}</span>
                {estado && <span className={`diet-ai-tag${item.estadoInformado ? '' : ' diet-ai-tag--aviso'}`}>{estado}</span>}
                {item.gramasEstimadas && <span className="diet-ai-tag diet-ai-tag--aviso">peso estimado</span>}
              </div>
              <div className="diet-ai-item-values">
                <label htmlFor={campoId} className="diet-ai-item-grams">
                  <input id={campoId} type="number" inputMode="decimal" min="1" max="5000" value={item.gramas}
                    onChange={e => onMudarGramas(indice, e.target.value)} aria-label={`Gramas de ${item.nome}`} />
                  <span>g</span>
                </label>
                <span className="num">{formatar(item.kcal)} kcal</span>
                <span className="num">P {formatar(item.proteinas)}</span>
                <span className="num">C {formatar(item.carboidratos)}</span>
                <span className="num">G {formatar(item.gorduras)}</span>
              </div>
            </li>
          )
        })}
      </ul>
      <p className="diet-ai-items-note">Valores da TACO (NEPA/UNICAMP, 4ª ed.) quando o alimento está na tabela. Confira o estado (cru, cozido) e as gramas antes de adicionar.</p>
    </section>
  )
}
