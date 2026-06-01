import { useState } from 'react'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../../firebase'
import { Apple, Loader } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState(null)

  const trySignInOrCreate = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
      return true
    } catch (err) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          await createUserWithEmailAndPassword(auth, email, password)
          return true
        } catch (regErr) {
          throw new Error(regErr.message)
        }
      } else {
        throw new Error(err.message)
      }
    }
  }

  const fazerLogin = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    setLoading(true); setErro(null)
    try {
      await trySignInOrCreate(email.trim(), password)
    } catch (err) {
      setErro(`Erro: ${err.message}`)
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#050505] px-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <Apple size={32} className="text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">AkrGym</h1>
          <p className="text-neutral-500 text-sm">Faça login para continuar</p>
        </div>

        {erro && (
          <div className="bg-red-500/10 backdrop-blur-md border border-red-500/20 rounded-2xl p-3 text-red-400 text-xs">{erro}</div>
        )}

        <form onSubmit={fazerLogin} className="space-y-3">
          <input type="email" placeholder="E-mail" value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-neutral-900/50 backdrop-blur-md border border-white/5 text-white placeholder-neutral-600 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all" />
          <input type="password" placeholder="Senha" value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-neutral-900/50 backdrop-blur-md border border-white/5 text-white placeholder-neutral-600 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all" />
          <button type="submit" disabled={loading || !email.trim() || !password.trim()}
            className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-bold py-4 rounded-xl text-sm transition-all active:scale-[0.97] hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(52,211,153,0.15)] flex items-center justify-center gap-2">
            {loading ? <><Loader size={18} className="animate-spin" /> Entrando...</> : 'Entrar / Cadastrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
