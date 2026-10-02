import { useEffect, useRef } from 'react'

const LINE_COLOR = '#2563eb'
const POINT_COLOR = '#f59e0b'
const LINE_WIDTH = 2
const POINT_RADIUS = 4

function drawPolyline(context, points) {
  if (points.length < 2) return
  context.strokeStyle = LINE_COLOR
  context.lineWidth = LINE_WIDTH
  context.beginPath()
  points.forEach(({ x, y }, index) => (index === 0 ? context.moveTo(x, y) : context.lineTo(x, y)))
  context.stroke()
}

function drawVertices(context, points) {
  context.fillStyle = POINT_COLOR
  points.forEach(({ x, y }) => {
    context.beginPath()
    context.arc(x, y, POINT_RADIUS, 0, Math.PI * 2)
    context.fill()
  })
}

export default function BlueprintCanvas({
  points = [],
  width = 600,
  height = 400,
  onAddPoint,
  disabled = false,
}) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const context = canvasRef.current?.getContext('2d')
    if (!context) return
    context.clearRect(0, 0, width, height)
    drawPolyline(context, points)
    drawVertices(context, points)
  }, [points, width, height])

  function handleClick(event) {
    if (disabled || !onAddPoint) return
    const bounds = canvasRef.current.getBoundingClientRect()
    onAddPoint({
      x: Math.round(((event.clientX - bounds.left) * width) / bounds.width),
      y: Math.round(((event.clientY - bounds.top) * height) / bounds.height),
    })
  }

  return (
    <canvas
      ref={canvasRef}
      className={disabled ? 'canvas canvas--disabled' : 'canvas'}
      width={width}
      height={height}
      onClick={handleClick}
      aria-label="Lienzo del plano"
      aria-disabled={disabled}
    />
  )
}
