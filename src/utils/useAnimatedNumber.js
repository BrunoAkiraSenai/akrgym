import { useEffect, useRef, useState } from 'react'

/**
 * useAnimatedNumber — interpola suavemente um valor numérico até o alvo.
 *
 * Comportamento:
 *  - No primeiro render: retorna o alvo imediatamente (sem animação).
 *  - Quando `target` muda: anima de "o que está sendo exibido agora" até o novo alvo.
 *  - Easing: cubic ease-out (1 - (1 - t)^3) — desacelera no final.
 *  - Cleanup: cancela o rAF em unmount ou quando uma nova animação começa.
 *
 * @param {number} target  - valor alvo (pode ser número, inclusive decimal).
 * @param {number} duration - duração em ms (default 600).
 * @returns {number} valor atual exibido (interpolado durante a animação).
 *
 * Uso típico: animar kcal/P/C/G na tabela "Progresso Hoje" da Dieta quando
 * o usuário confirma uma refeição, em vez de saltar abruptamente para o novo valor.
 */
export function useAnimatedNumber(target, duration = 600) {
  const [displayed, setDisplayed] = useState(target)
  const rafRef = useRef(0)

  useEffect(() => {
    cancelAnimationFrame(rafRef.current)
    // Captura o valor que o usuário está vendo AGORA como ponto de partida.
    // (Se o target muda no meio de uma animação anterior, ela continua a partir
    // do ponto visível em vez de pular para o target anterior.)
    const startValue = displayed
    const startTime = performance.now()

    const tick = (now) => {
      const elapsed = now - startTime
      const t = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      const value = startValue + (target - startValue) * eased
      setDisplayed(value)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(rafRef.current)
    // `displayed` é intencionalmente excluído para não reiniciar a animação a cada frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration])

  return displayed
}

export default useAnimatedNumber
