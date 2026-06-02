import { useState } from 'react'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth'
import { auth, db, provider } from '../../firebase'
import { writeBatch, collection, getDocs, getDoc, doc } from 'firebase/firestore'
import { Apple, Loader } from 'lucide-react'

function traduzirErro(code) {
  const erros = {
    'auth/invalid-credential':               'E-mail ou senha incorretos.',
    'auth/user-not-found':                   'Nenhuma conta encontrada com este e-mail.',
    'auth/wrong-password':                   'Senha incorreta.',
    'auth/email-already-in-use':             'Este e-mail já está cadastrado. Tente entrar.',
    'auth/invalid-email':                    'E-mail inválido.',
    'auth/weak-password':                    'A senha deve ter pelo menos 6 caracteres.',
    'auth/too-many-requests':                'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
    'auth/network-request-failed':           'Sem conexão. Verifique sua internet.',
    'auth/popup-blocked':                    'Popup bloqueado pelo navegador. Permita popups e tente novamente.',
    'auth/cancelled-popup-request':          'Login cancelado.',
    'auth/account-exists-with-different-credential': 'Este e-mail já está cadastrado com outro método. Tente entrar com Google ou e-mail e senha.',
  }
  return erros[code] || 'Ocorreu um erro. Tente novamente.'
}

async function migrateAnonymousData(anonymousUid, newUid) {
  const collections = ['historico_treinos', 'diario_dieta', 'historico_corporal']
  const operations = []
  for (const col of collections) {
    const snap = await getDocs(collection(db, 'users', anonymousUid, col))
    snap.forEach(d => operations.push({ ref: doc(db, 'users', newUid, col, d.id), data: d.data() }))
  }
  const configSnap = await getDoc(doc(db, 'users', anonymousUid, 'config', 'data'))
  if (configSnap.exists()) {
    operations.push({ ref: doc(db, 'users', newUid, 'config', 'data'), data: configSnap.data() })
  }
  const CHUNK = 400
  for (let i = 0; i < operations.length; i += CHUNK) {
    const batch = writeBatch(db)
    operations.slice(i, i + CHUNK).forEach(op => batch.set(op.ref, op.data))
    await batch.commit()
  }
}

export default function Login() {
  const [modo, setModo] = useState('entrar')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState(null)

  const trocarModo = () => {
    setModo(modo === 'entrar' ? 'cadastrar' : 'entrar')
    setPassword('')
    setConfirmarSenha('')
    setErro(null)
  }

  const handleEntrar = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    setLoading(true); setErro(null)
    try {
      const anonymousUid = auth.currentUser?.isAnonymous ? auth.currentUser.uid : null
      const result = await signInWithEmailAndPassword(auth, email.trim(), password)
      if (anonymousUid && result.user.uid !== anonymousUid) {
        await migrateAnonymousData(anonymousUid, result.user.uid)
      }
    } catch (err) {
      setErro(traduzirErro(err.code))
    }
    setLoading(false)
  }

  const handleCadastrar = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim() || !confirmarSenha.trim()) return
    setErro(null)
    if (password.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres')
      return
    }
    if (password !== confirmarSenha) {
      setErro('As senhas não coincidem')
      return
    }
    setLoading(true)
    try {
      const anonymousUid = auth.currentUser?.isAnonymous ? auth.currentUser.uid : null
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password)
      if (anonymousUid && result.user.uid !== anonymousUid) {
        await migrateAnonymousData(anonymousUid, result.user.uid)
      }
    } catch (err) {
      setErro(traduzirErro(err.code))
    }
    setLoading(false)
  }

  const signInWithGoogle = async () => {
    setLoading(true); setErro(null)
    try {
      const anonymousUid = auth.currentUser?.isAnonymous ? auth.currentUser.uid : null
      const result = await signInWithPopup(auth, provider)
      if (anonymousUid && result.user.uid !== anonymousUid) {
        await migrateAnonymousData(anonymousUid, result.user.uid)
      }
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') return
      setErro(traduzirErro(err.code))
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
          <p className="text-neutral-500 text-sm">
            {modo === 'entrar' ? 'Entre na sua conta' : 'Crie sua conta'}
          </p>
        </div>

        {erro && (
          <div className="bg-red-500/10 backdrop-blur-md border border-red-500/20 rounded-2xl p-3 text-red-400 text-xs">{erro}</div>
        )}

        <button onClick={signInWithGoogle} disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 rounded-2xl py-3 text-white font-medium hover:bg-white/10 active:scale-[0.97] transition-all disabled:opacity-30">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuar com Google
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5" /></div>
          <div className="relative flex justify-center"><span className="bg-[#050505] px-3 text-[10px] text-neutral-600">ou</span></div>
        </div>

        {modo === 'entrar' ? (
          <form onSubmit={handleEntrar} className="space-y-3">
            <input type="email" placeholder="E-mail" value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-neutral-900/50 backdrop-blur-md border border-white/5 text-white placeholder-neutral-600 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all" />
            <input type="password" placeholder="Senha" value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-neutral-900/50 backdrop-blur-md border border-white/5 text-white placeholder-neutral-600 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all" />
            <button type="submit" disabled={loading || !email.trim() || !password.trim()}
              className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-bold py-4 rounded-xl text-sm transition-all active:scale-[0.97] hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(52,211,153,0.15)] flex items-center justify-center gap-2">
              {loading ? <><Loader size={18} className="animate-spin" /> Entrando...</> : 'Entrar'}
            </button>
            <p className="text-center text-sm text-white/50">
              Não tem conta?{' '}
              <button type="button" onClick={trocarModo}
                className="text-emerald-400 font-medium hover:text-emerald-300 transition-all">
                Criar conta
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleCadastrar} className="space-y-3">
            <input type="email" placeholder="E-mail" value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-neutral-900/50 backdrop-blur-md border border-white/5 text-white placeholder-neutral-600 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all" />
            <input type="password" placeholder="Senha" value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-neutral-900/50 backdrop-blur-md border border-white/5 text-white placeholder-neutral-600 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all" />
            <input type="password" placeholder="Confirmar senha" value={confirmarSenha}
              onChange={e => setConfirmarSenha(e.target.value)}
              className="w-full bg-neutral-900/50 backdrop-blur-md border border-white/5 text-white placeholder-neutral-600 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all" />
            <button type="submit" disabled={loading || !email.trim() || !password.trim() || !confirmarSenha.trim()}
              className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-bold py-4 rounded-xl text-sm transition-all active:scale-[0.97] hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(52,211,153,0.15)] flex items-center justify-center gap-2">
              {loading ? <><Loader size={18} className="animate-spin" /> Criando conta...</> : 'Criar conta'}
            </button>
            <p className="text-center text-sm text-white/50">
              Já tem conta?{' '}
              <button type="button" onClick={trocarModo}
                className="text-emerald-400 font-medium hover:text-emerald-300 transition-all">
                Entrar
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
