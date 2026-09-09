import { useState, useEffect } from 'react'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth'
import { auth, db, provider } from '../../firebase'
import { writeBatch, collection, getDocs, getDoc, doc } from 'firebase/firestore'
import { Apple, Loader } from 'lucide-react'
import { METAS_DIARIAS } from '../../config/dieta'

const LOGIN_LIMIT_STORAGE = 'akrgym-auth-login-limit-v1'
const RESET_LIMIT_STORAGE = 'akrgym-auth-reset-limit-v1'
const LOGIN_MAX_FAILURES = 5
const LOGIN_COOLDOWN_MS = 60_000
const FIREBASE_LOCKOUT_MS = 5 * 60_000
const RESET_COOLDOWN_MS = 60_000

function normalizarEmail(email) {
  return email.trim().toLowerCase()
}

function lerLimites(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key) || '{}')
    return data && typeof data === 'object' ? data : {}
  } catch {
    return {}
  }
}

function salvarLimites(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)) } catch { /* armazenamento pode estar bloqueado */ }
}

function lerBloqueio(key, email) {
  const item = lerLimites(key)[normalizarEmail(email)]
  return Number.isFinite(item?.bloqueadoAte) ? item.bloqueadoAte : 0
}

function registrarFalhaLogin(email, bloqueioMs = LOGIN_COOLDOWN_MS) {
  const chave = normalizarEmail(email)
  const limites = lerLimites(LOGIN_LIMIT_STORAGE)
  const item = limites[chave] || { falhas: 0, bloqueadoAte: 0 }
  const falhas = (Number(item.falhas) || 0) + 1
  limites[chave] = {
    falhas: falhas >= LOGIN_MAX_FAILURES ? 0 : falhas,
    bloqueadoAte: falhas >= LOGIN_MAX_FAILURES ? Date.now() + bloqueioMs : 0,
  }
  salvarLimites(LOGIN_LIMIT_STORAGE, limites)
  return limites[chave].bloqueadoAte
}

function limparFalhasLogin(email) {
  const limites = lerLimites(LOGIN_LIMIT_STORAGE)
  delete limites[normalizarEmail(email)]
  salvarLimites(LOGIN_LIMIT_STORAGE, limites)
}

function registrarBloqueio(key, email, bloqueioMs) {
  const limites = lerLimites(key)
  const bloqueadoAte = Date.now() + bloqueioMs
  limites[normalizarEmail(email)] = { falhas: 0, bloqueadoAte }
  salvarLimites(key, limites)
  return bloqueadoAte
}

function registrarPedidoReset(email) {
  return registrarBloqueio(RESET_LIMIT_STORAGE, email, RESET_COOLDOWN_MS)
}

function traduzirErro(code) {
  const erros = {
    'auth/invalid-credential':               'E-mail ou senha incorretos.',
    // Mensagem única evita revelar se o e-mail está cadastrado.
    'auth/user-not-found':                   'E-mail ou senha incorretos.',
    'auth/wrong-password':                   'E-mail ou senha incorretos.',
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
    const config = configSnap.data()
    operations.push({
      ref: doc(db, 'users', newUid, 'config', 'data'),
      data: {
        ...config,
        treinos: config.treinos || {},
        refeicoes: Array.isArray(config.refeicoes)
          ? config.refeicoes.map(ref => ({ ...ref, fibras: Number(ref.fibras) || 0 }))
          : [],
        metas: { ...METAS_DIARIAS, ...(config.metas || {}), fibras: Number(config.metas?.fibras ?? METAS_DIARIAS.fibras) || 0 },
      },
    })
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
  const [sucesso, setSucesso] = useState(null)
  const [loginBloqueadoAte, setLoginBloqueadoAte] = useState(0)
  const [resetBloqueadoAte, setResetBloqueadoAte] = useState(0)
  const [agora, setAgora] = useState(() => Date.now())

  const loginRestante = Math.max(0, loginBloqueadoAte - agora)
  const resetRestante = Math.max(0, resetBloqueadoAte - agora)

  useEffect(() => {
    if (loginRestante <= 0 && resetRestante <= 0) return undefined
    const timer = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [loginRestante, resetRestante])

  // Timeout de segurança: nunca fica carregando infinitamente
  useEffect(() => {
    if (!loading) return
    const t = setTimeout(() => setLoading(false), 15000)
    return () => clearTimeout(t)
  }, [loading])

  // Processa resultado do redirect ao montar (app recarrega após login Google via redirect)
  useEffect(() => {
    let mounted = true
    getRedirectResult(auth)
      .then((result) => {
        if (!mounted) return
        if (result?.user) {
          // Login Google via redirect concluído — onAuthStateChanged no App.jsx cuida do resto
        }
      })
      .catch((err) => {
        if (!mounted) return
        if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/operation-not-supported-in-this-environment') {
          setErro(traduzirErro(err.code))
        }
      })
    return () => { mounted = false }
  }, [])

  const trocarModo = () => {
    setModo(modo === 'entrar' ? 'cadastrar' : 'entrar')
    setPassword('')
    setConfirmarSenha('')
    setErro(null)
    setSucesso(null)
  }

  const abrirRecuperacao = () => {
    setModo('recuperar')
    setPassword('')
    setConfirmarSenha('')
    setErro(null)
    setSucesso(null)
  }

  const voltarParaEntrar = () => {
    setModo('entrar')
    setErro(null)
    setSucesso(null)
  }

  const atualizarEmail = (valor) => {
    setEmail(valor)
    setLoginBloqueadoAte(lerBloqueio(LOGIN_LIMIT_STORAGE, valor))
    setResetBloqueadoAte(lerBloqueio(RESET_LIMIT_STORAGE, valor))
  }

  const handleEntrar = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    if (loginRestante > 0) {
      setErro(`Muitas tentativas. Aguarde ${Math.ceil(loginRestante / 1000)} segundos.`)
      return
    }
    setLoading(true); setErro(null)
    try {
      const anonymousUid = auth.currentUser?.isAnonymous ? auth.currentUser.uid : null
      const result = await signInWithEmailAndPassword(auth, email.trim(), password)
      limparFalhasLogin(email)
      setLoginBloqueadoAte(0)
      if (anonymousUid && result.user.uid !== anonymousUid) {
        await migrateAnonymousData(anonymousUid, result.user.uid)
      }
    } catch (err) {
      if (err.code === 'auth/too-many-requests') {
        const bloqueadoAte = registrarBloqueio(LOGIN_LIMIT_STORAGE, email, FIREBASE_LOCKOUT_MS)
        setLoginBloqueadoAte(bloqueadoAte)
      } else if (['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password'].includes(err.code)) {
        const bloqueadoAte = registrarFalhaLogin(email)
        setLoginBloqueadoAte(bloqueadoAte)
      }
      setErro(traduzirErro(err.code))
    }
    setLoading(false)
  }

  const handleRecuperarSenha = async (e) => {
    e.preventDefault()
    const emailNormalizado = normalizarEmail(email)
    if (!emailNormalizado) {
      setErro('Digite seu e-mail para receber o link de recuperação.')
      return
    }
    if (resetRestante > 0) {
      setErro(`Aguarde ${Math.ceil(resetRestante / 1000)} segundos antes de solicitar outro e-mail.`)
      return
    }
    setLoading(true); setErro(null); setSucesso(null)
    try {
      auth.languageCode = 'pt-BR'
      await sendPasswordResetEmail(auth, emailNormalizado)
      const bloqueadoAte = registrarPedidoReset(emailNormalizado)
      setResetBloqueadoAte(bloqueadoAte)
      // Mensagem deliberadamente genérica para não permitir enumeração de contas.
      setSucesso('Se existir uma conta com esse e-mail, enviaremos as instruções para redefinir sua senha.')
    } catch (err) {
      if (err.code === 'auth/too-many-requests') {
        const bloqueadoAte = registrarBloqueio(RESET_LIMIT_STORAGE, emailNormalizado, FIREBASE_LOCKOUT_MS)
        setResetBloqueadoAte(bloqueadoAte)
        setErro('Muitas solicitações. Aguarde alguns minutos antes de tentar novamente.')
      } else if (err.code === 'auth/invalid-email') {
        setErro('Digite um e-mail válido.')
      } else if (err.code === 'auth/user-not-found') {
        // Com proteção contra enumeração, o SDK normalmente não lança este erro.
        const bloqueadoAte = registrarPedidoReset(emailNormalizado)
        setResetBloqueadoAte(bloqueadoAte)
        setSucesso('Se existir uma conta com esse e-mail, enviaremos as instruções para redefinir sua senha.')
      } else {
        setErro('Não foi possível enviar o e-mail agora. Tente novamente mais tarde.')
      }
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
    const anonymousUid = auth.currentUser?.isAnonymous ? auth.currentUser.uid : null
    try {
      let result
      try {
        // Tenta popup primeiro (funciona na web e na maioria dos PWAs)
        result = await signInWithPopup(auth, provider)
      } catch (popupErr) {
        if (popupErr.code === 'auth/popup-blocked' || popupErr.code === 'auth/cannot-create-iframe' || popupErr.code === 'auth/operation-not-supported-in-this-environment') {
          // Fallback: redirect (abre Safari, volta ao app após login)
          await signInWithRedirect(auth, provider)
          return // página redireciona — resultado processado no getRedirectResult
        }
        throw popupErr
      }
      if (result && anonymousUid && result.user.uid !== anonymousUid) {
        await migrateAnonymousData(anonymousUid, result.user.uid)
      }
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') { setLoading(false); return }
      setErro(traduzirErro(err.code))
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#07050c] px-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <Apple size={32} className="text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">AkrGym</h1>
          <p className="text-neutral-500 text-sm">
            {modo === 'entrar' ? 'Entre na sua conta' : modo === 'recuperar' ? 'Recupere o acesso à sua conta' : 'Crie sua conta'}
          </p>
        </div>

        {erro && (
          <div className="bg-red-500/10 backdrop-blur-md border border-red-500/20 rounded-2xl p-3 text-red-400 text-xs">{erro}</div>
        )}
        {sucesso && (
          <div className="bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 rounded-2xl p-3 text-emerald-300 text-xs">{sucesso}</div>
        )}

        {modo !== 'recuperar' && <>
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
            <div className="relative flex justify-center"><span className="bg-[#07050c] px-3 text-[10px] text-neutral-600">ou</span></div>
          </div>
        </>}

        {modo === 'entrar' ? (
          <form onSubmit={handleEntrar} className="space-y-3">
            <input type="email" aria-label="E-mail" placeholder="E-mail" value={email}
              onChange={e => atualizarEmail(e.target.value)}
              className="w-full bg-neutral-900/50 backdrop-blur-md border border-white/5 text-white placeholder-neutral-600 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all" />
            <input type="password" aria-label="Senha" placeholder="Senha" value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-neutral-900/50 backdrop-blur-md border border-white/5 text-white placeholder-neutral-600 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all" />
            <div className="flex justify-end -mt-1">
              <button type="button" onClick={abrirRecuperacao}
                className="text-emerald-400 text-xs font-medium hover:text-emerald-300 transition-all">
                Esqueci minha senha
              </button>
            </div>
            <button type="submit" disabled={loading || loginRestante > 0 || !email.trim() || !password.trim()}
              className="btn-primary w-full py-4 flex items-center justify-center gap-2">
              {loading ? <><Loader size={18} className="animate-spin" /> Entrando...</> : loginRestante > 0 ? `Aguarde ${Math.ceil(loginRestante / 1000)}s` : 'Entrar'}
            </button>
            <p className="text-center text-sm text-white/50">
              Não tem conta?{' '}
              <button type="button" onClick={trocarModo}
                className="text-emerald-400 font-medium hover:text-emerald-300 transition-all">
                Criar conta
              </button>
            </p>
          </form>
        ) : modo === 'recuperar' ? (
          <form onSubmit={handleRecuperarSenha} className="space-y-3">
            <p className="text-sm text-neutral-400 leading-relaxed">
              Informe o e-mail da sua conta. Se ele estiver cadastrado, enviaremos um link seguro para redefinir sua senha.
            </p>
            <input type="email" aria-label="E-mail" placeholder="E-mail" value={email}
              onChange={e => atualizarEmail(e.target.value)} autoComplete="email"
              className="w-full bg-neutral-900/50 backdrop-blur-md border border-white/5 text-white placeholder-neutral-600 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all" />
            <button type="submit" disabled={loading || !email.trim() || resetRestante > 0}
              className="btn-primary w-full py-4 flex items-center justify-center gap-2">
              {loading ? <><Loader size={18} className="animate-spin" /> Enviando...</> : resetRestante > 0 ? `Reenviar em ${Math.ceil(resetRestante / 1000)}s` : 'Enviar link de recuperação'}
            </button>
            <p className="text-center text-sm text-white/50">
              Lembrou a senha?{' '}
              <button type="button" onClick={voltarParaEntrar}
                className="text-emerald-400 font-medium hover:text-emerald-300 transition-all">
                Voltar para entrar
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleCadastrar} className="space-y-3">
            <input type="email" aria-label="E-mail" placeholder="E-mail" value={email}
              onChange={e => atualizarEmail(e.target.value)}
              className="w-full bg-neutral-900/50 backdrop-blur-md border border-white/5 text-white placeholder-neutral-600 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all" />
            <input type="password" aria-label="Senha" placeholder="Senha" value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-neutral-900/50 backdrop-blur-md border border-white/5 text-white placeholder-neutral-600 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all" />
            <input type="password" aria-label="Confirmar senha" placeholder="Confirmar senha" value={confirmarSenha}
              onChange={e => setConfirmarSenha(e.target.value)}
              className="w-full bg-neutral-900/50 backdrop-blur-md border border-white/5 text-white placeholder-neutral-600 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all" />
            <button type="submit" disabled={loading || !email.trim() || !password.trim() || !confirmarSenha.trim()}
              className="btn-primary w-full py-4 flex items-center justify-center gap-2">
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
