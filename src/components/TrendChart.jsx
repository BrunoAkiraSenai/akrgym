import { useRef, useEffect } from 'react'

export default function TrendChart({ data, width = 280, height = 200, cor = '#10b981' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || data.length < 2) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = width + 'px'
    canvas.style.height = height + 'px'
    ctx.scale(dpr, dpr)

    const pad = { top: 16, right: 12, bottom: 32, left: 44 }
    const plotW = width - pad.left - pad.right
    const plotH = height - pad.top - pad.bottom
    const valores = data.map(d => d.valor)
    const max = Math.ceil(Math.max(...valores) / 5) * 5 || 5
    const min = Math.floor(Math.min(...valores) / 5) * 5 || 0
    const amp = max - min || 1

    ctx.clearRect(0, 0, width, height)

    // Grid lines
    const steps = 4
    for (let i = 0; i <= steps; i++) {
      const v = min + (i / steps) * amp
      const y = pad.top + plotH - ((v - min) / amp) * plotH
      ctx.strokeStyle = '#1a1a1a'
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(width - pad.right, y); ctx.stroke()
      ctx.fillStyle = '#525252'
      ctx.font = '10px Inter, sans-serif'
      ctx.textAlign = 'end'
      ctx.fillText(Math.round(v).toString(), pad.left - 6, y + 3)
    }

    // Line
    const points = data.map((d, i) => ({
      x: pad.left + (i / (data.length - 1)) * plotW,
      y: pad.top + plotH - ((d.valor - min) / amp) * plotH,
    }))

    ctx.strokeStyle = cor
    ctx.lineWidth = 2.5
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.shadowColor = cor + '66'
    ctx.shadowBlur = 6
    ctx.beginPath()
    points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
    ctx.stroke()
    ctx.shadowBlur = 0

    // Dots
    points.forEach(p => {
      ctx.fillStyle = '#050505'
      ctx.strokeStyle = cor
      ctx.lineWidth = 2.5
      ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    })

    // Date labels
    points.forEach((p, i) => {
      ctx.fillStyle = '#525252'
      ctx.font = '8px Inter, sans-serif'
      ctx.textAlign = 'center'
      const d = data[i].data instanceof Date ? data[i].data : new Date(data[i].data)
      ctx.fillText(d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), p.x, height - 6)
    })
  }, [data, width, height, cor])

  return <canvas ref={canvasRef} style={{ width, height, touchAction: 'manipulation' }} />
}
