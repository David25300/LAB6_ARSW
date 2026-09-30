import { useEffect, useRef } from 'react'

export default function BlueprintCanvas({ points = [], width = 520, height = 360, onAddPoint }) {
  const ref = useRef(null)

  // El canvas se escala con CSS (width: 100%), asi que el click se pasa a coordenadas internas
  const handleClick = (e) => {
    if (e.detail === 0) {
      onAddPoint({ x: Math.round(width / 2), y: Math.round(height / 2) })
      return
    }
    const rect = ref.current.getBoundingClientRect()
    onAddPoint({
      x: Math.round(((e.clientX - rect.left) * width) / rect.width),
      y: Math.round(((e.clientY - rect.top) * height) / rect.height),
    })
  }

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#0b1220'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = 'rgba(148,163,184,0.15)'
    ctx.lineWidth = 1
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }
    if (points.length > 1) {
      ctx.strokeStyle = '#93c5fd'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(points[0].x, points[0].y)
      for (let i = 1; i < points.length; i++) {
        const p = points[i]
        ctx.lineTo(p.x, p.y)
      }
      ctx.stroke()
    }
    ctx.fillStyle = '#fbbf24'
    for (const p of points) {
      ctx.beginPath()
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [points])

  const canvas = (
    <canvas
      id="blueprint-canvas"
      ref={ref}
      width={width}
      height={height}
      style={{
        display: 'block',
        background: '#0b1220',
        border: '1px solid #334155',
        borderRadius: 12,
        width: '100%',
        maxWidth: width,
      }}
    />
  )

  if (!onAddPoint) return canvas

  return (
    <button
      type="button"
      className="canvas-input"
      style={{ maxWidth: width }}
      aria-label="Agregar un punto al plano"
      onClick={handleClick}
    >
      {canvas}
    </button>
  )
}
