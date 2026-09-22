function obterApiNotificacao() {
  if (typeof window === 'undefined' || !('Notification' in window)) return null
  return window.Notification
}

export function notificacoesDisponiveis() {
  return Boolean(obterApiNotificacao())
}

export function obterPermissaoNotificacao() {
  return obterApiNotificacao()?.permission || 'unsupported'
}

export async function solicitarPermissaoNotificacao() {
  const NotificationApi = obterApiNotificacao()
  if (!NotificationApi) return 'unsupported'
  if (NotificationApi.permission !== 'default') return NotificationApi.permission

  try {
    return await NotificationApi.requestPermission()
  } catch {
    return 'denied'
  }
}

export async function notificarDescansoConcluido(exerciseName = '') {
  const NotificationApi = obterApiNotificacao()
  if (NotificationApi && NotificationApi.permission !== 'granted') return false

  const title = 'AkrGym · Descanso concluído'
  const options = {
    body: exerciseName ? `${exerciseName} · hora da próxima série.` : 'Hora da próxima série.',
    tag: 'akrgym-descanso-concluido',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    renotify: true,
    silent: false,
    vibrate: [120, 60, 120],
  }

  if (NotificationApi) {
    try {
      const notification = new NotificationApi(title, options)
      notification.addEventListener?.('click', () => {
        window.focus()
        notification.close?.()
      })
      return true
    } catch {
      // Alguns PWAs móveis expõem a notificação somente pelo Service Worker.
    }
  }

  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification(title, options)
      return true
    } catch {
      // O timer continua funcionando mesmo sem suporte a notificações.
    }
  }

  return false
}
