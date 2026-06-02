import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { erro: null }
  }

  static getDerivedStateFromError(erro) {
    return { erro }
  }

  componentDidCatch(erro, info) {
    console.warn('ErrorBoundary capturou:', erro, info)
  }

  render() {
    if (this.state.erro) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-[#050505] px-6 text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <AlertTriangle size={28} className="text-red-400" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg tracking-tight">Algo deu errado</h2>
            <p className="text-neutral-500 text-sm mt-1 max-w-xs">
              Ocorreu um erro inesperado. Recarregue a página para continuar.
            </p>
          </div>
          <button onClick={() => window.location.reload()}
            className="btn-primary flex items-center justify-center gap-2 py-3 px-6">
            <RefreshCw size={16} /> Recarregar
          </button>
          {this.props.mostrarDetalhes && (
            <details className="text-left w-full max-w-xs mt-2">
              <summary className="text-neutral-500 text-xs cursor-pointer hover:text-neutral-400">Detalhes técnicos</summary>
              <pre className="text-red-400/70 text-[10px] mt-2 bg-neutral-900/50 p-3 rounded-xl whitespace-pre-wrap break-all border border-white/5">
                {this.state.erro.message}
              </pre>
            </details>
          )}
        </div>
      )
    }
    return this.props.children
  }
}
