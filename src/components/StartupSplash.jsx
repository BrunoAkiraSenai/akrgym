import './StartupSplash.css'

export default function StartupSplash({ animated = true, showWaiting = false }) {
  const label = showWaiting ? 'Conectando ao AkrGym' : 'Carregando AkrGym'

  return (
    <div
      className="startup-splash"
      data-animated={animated}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <div className="startup-splash__brand" aria-hidden="true">
        <div className="startup-splash__mark">
          <img src="/pwa-192x192.png" width="192" height="192" alt="" />
        </div>
        <div className="startup-splash__wordmark">AkrGym</div>
        <p className="startup-splash__tagline">Treino, dieta e evolução</p>
      </div>

      {showWaiting && <p className="startup-splash__waiting">Conectando ao seu espaço</p>}
    </div>
  )
}
