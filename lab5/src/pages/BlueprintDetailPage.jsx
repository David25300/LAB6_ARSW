import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useParams } from 'react-router-dom'
import { fetchBlueprint } from '../features/blueprints/blueprintsSlice.js'
import BlueprintCanvas from '../components/BlueprintCanvas.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'

export default function BlueprintDetailPage() {
  const { author, name } = useParams()
  const dispatch = useDispatch()
  const { current, status, error } = useSelector((s) => s.blueprints)
  // `current` puede ser otro plano abierto antes: solo lo mostramos si coincide con la URL
  const bp = current?.author === author && current?.name === name ? current : null

  useEffect(() => {
    dispatch(fetchBlueprint({ author, name }))
  }, [author, name, dispatch])

  if (status.current === 'failed')
    return (
      <ErrorBanner
        message={`No se pudo cargar el plano: ${error.current}`}
        onRetry={() => dispatch(fetchBlueprint({ author, name }))}
      />
    )

  if (!bp)
    return (
      <div className="card">
        <p className="muted">
          <output>Cargando...</output>
        </p>
      </div>
    )

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>{bp.name}</h2>
      <p>
        <strong>Autor:</strong> {bp.author}
      </p>
      <p>
        <strong>Puntos:</strong> {bp.points?.length || 0}
      </p>
      <BlueprintCanvas points={bp.points || []} />
      <div style={{ marginTop: 12 }}>
        <Link
          className="btn primary"
          to={`/blueprints/${encodeURIComponent(bp.author)}/${encodeURIComponent(bp.name)}/edit`}
        >
          Editar
        </Link>
      </div>
    </div>
  )
}
