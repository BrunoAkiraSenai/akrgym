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

  const title = 'Descanso concluído'
  const options = {
    body: exerciseName ? `Hora da próxima série de ${exerciseName}.` : 'Hora da próxima série.',
    tag: 'akrgym-descanso-concluido',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
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
