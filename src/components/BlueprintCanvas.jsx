import { useEffect, useRef } from 'react'

/** Canvas "tonto": dibuja `points` y avisa con onAddPoint({x, y}) en coordenadas del lienzo. */
export default function BlueprintCanvas({ points = [], width = 600, height = 400, onAddPoint, disabled = false }) {
  const ref = useRef(null)

  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, width, height)
    if (points.length > 1) {
      ctx.strokeStyle = '#2563eb'
      ctx.lineWidth = 2
      ctx.beginPath()
      points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
      ctx.stroke()
    }
    // cada punto se marca: con un solo punto no hay segmento y, si no, no se veria nada
    ctx.fillStyle = '#f59e0b'
    points.forEach((p) => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
      ctx.fill()
    })
  }, [points, width, height])

  function handleClick(e) {
    if (disabled || !onAddPoint) return
    const rect = ref.current.getBoundingClientRect()
    onAddPoint({
      x: Math.round(((e.clientX - rect.left) * width) / rect.width),
      y: Math.round(((e.clientY - rect.top) * height) / rect.height),
    })
  }

  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      onClick={handleClick}
      style={{ border: '1px solid #ddd', borderRadius: 12, cursor: disabled ? 'not-allowed' : 'crosshair', maxWidth: '100%' }}
    />
  )
}
