import { memo, useEffect, useRef } from 'react'

// The browser animates this small, isolated SVG. Second ticks only update text;
// they do not restart the arc or create a React render for every animation frame.
function RestTimerRing({ configurado, terminaEm, restante }) {
  const progressRef = useRef(null)

  useEffect(() => {
    const progress = progressRef.current
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let animation
    let reducedMotionTimeout
    let visible = true
    let disposed = false

    const sincronizar = () => {
      if (disposed) return
      animation?.cancel()
      window.clearTimeout(reducedMotionTimeout)
      const faltamMs = terminaEm === null ? restante * 1000 : Math.max(0, terminaEm - Date.now())
      const offset = 100 * (1 - Math.min(1, faltamMs / (configurado * 1000)))
      progress.style.strokeDashoffset = `${offset}px`
      if (terminaEm === null || faltamMs <= 0 || document.hidden || !visible) return
      // Without continuous motion, keep an accurate arc at one update/second.
      if (reducedMotion.matches || typeof progress.animate !== 'function') {
        reducedMotionTimeout = window.setTimeout(sincronizar, faltamMs % 1000 || 1000)
        return
      }
      animation = progress.animate(
        [{ strokeDashoffset: `${offset}px` }, { strokeDashoffset: '100px' }],
        { duration: faltamMs, easing: 'linear', fill: 'forwards' },
      )
    }

    // Scrolling away or locking the screen should not keep painting an arc.
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      sincronizar()
    })
    observer?.observe(progress.ownerSVGElement)
    document.addEventListener('visibilitychange', sincronizar)
    window.addEventListener('focus', sincronizar)
    window.addEventListener('pageshow', sincronizar)
    reducedMotion.addEventListener('change', sincronizar)
    sincronizar()
    return () => {
      disposed = true
      animation?.cancel()
      window.clearTimeout(reducedMotionTimeout)
      observer?.disconnect()
      document.removeEventListener('visibilitychange', sincronizar)
      window.removeEventListener('focus', sincronizar)
      window.removeEventListener('pageshow', sincronizar)
      reducedMotion.removeEventListener('change', sincronizar)
    }
  }, [configurado, terminaEm, restante])

  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <circle className="rest-timer-ring-track" cx="60" cy="60" r="50" pathLength="100" />
      <circle ref={progressRef} className="rest-timer-ring-progress" cx="60" cy="60" r="50" pathLength="100" />
    </svg>
  )
}

export default memo(RestTimerRing)
