import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { fetchBlueprint, updateBlueprint } from '../features/blueprints/blueprintsSlice.js'
import BlueprintForm from '../components/BlueprintForm.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'

// Ruta protegida (ver PrivateRoute en App.jsx): el PUT exige JWT en el backend.
export default function EditBlueprintPage() {
  const { author, name } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { current, status, error } = useSelector((s) => s.blueprints)
  const bp = current?.author === author && current?.name === name ? current : null
  // Error del ultimo intento de guardar en ESTA pagina (no uno viejo que quedo en el store)
  const [saveError, setSaveError] = useState(null)

  useEffect(() => {
    dispatch(fetchBlueprint({ author, name }))
  }, [author, name, dispatch])

  const save = async ({ points }) => {
    setSaveError(null)
    try {
      await dispatch(updateBlueprint({ author, name, points })).unwrap()
      navigate(`/blueprints/${encodeURIComponent(author)}/${encodeURIComponent(name)}`)
    } catch (err) {
      // El slice ya revirtio el cambio optimista; el formulario conserva lo dibujado para reintentar
      setSaveError(err.message)
    }
  }

  if (status.current === 'failed' && !bp)
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
    <div className="grid" style={{ gap: 16 }}>
      {saveError && (
        <ErrorBanner
          message={`No se pudo guardar el plano: ${saveError}. Se restauraron los puntos anteriores.`}
        />
      )}
      {/* key: si llega otro plano, el formulario arranca de nuevo con sus datos */}
      <BlueprintForm
        key={`${bp.author}/${bp.name}`}
        initial={bp}
        editing
        onSubmit={save}
        submitting={status.update === 'loading'}
      />
      <Link to={`/blueprints/${encodeURIComponent(author)}/${encodeURIComponent(name)}`}>
        ← Volver al detalle
      </Link>
    </div>
  )
}
