import { createContext, useContext } from 'react'
import { PLANOS, PLANO_PADRAO } from '../utils/planos'

// Plano e uso da conta atual, lidos uma vez no App.
export const ContaContext = createContext({ plano: PLANOS[PLANO_PADRAO], uso: { mes: 0, hoje: 0 } })

export function useContaAtual() {
  return useContext(ContaContext)
}
