import { useState } from 'react'
import BlueprintCanvas from './BlueprintCanvas.jsx'

const parsePoints = (json) => {
  try {
    const points = JSON.parse(json)
    return Array.isArray(points) ? points : null
  } catch {
    return null
  }
}

// Sirve para crear (POST) y para editar (PUT). Al editar, autor y nombre no se cambian
// porque identifican el plano en la URL del backend.
export default function BlueprintForm({ onSubmit, submitting = false, initial, editing = false }) {
  const [author, setAuthor] = useState(initial?.author ?? '')
  const [name, setName] = useState(initial?.name ?? '')
  const [pointsJSON, setPointsJSON] = useState(
    JSON.stringify(
      initial?.points ?? [
        { x: 10, y: 10 },
        { x: 40, y: 60 },
      ],
    ),
  )
  const [error, setError] = useState(null)
  // El JSON es la fuente de verdad: el lienzo dibuja lo que haya en el textarea
  const points = parsePoints(pointsJSON)

  const setPoints = (next) => {
    setError(null)
    setPointsJSON(JSON.stringify(next))
  }

  const addPoint = (p) => {
    if (!points) {
      setError('Corrige el JSON de puntos antes de dibujar')
      return
    }
    setPoints([...points, p])
  }

  const handle = (e) => {
    e.preventDefault()
    let parsed
    try {
      parsed = JSON.parse(pointsJSON)
    } catch {
      setError('JSON de puntos inválido')
      return
    }
    if (!Array.isArray(parsed)) {
      setError('Los puntos deben ser un arreglo JSON, ej: [{"x":10,"y":10}]')
      return
    }
    setError(null)
    onSubmit({ author, name, points: parsed })
  }

  return (
    <form onSubmit={handle} className="card">
      <h3 style={{ marginTop: 0 }}>{editing ? 'Editar Blueprint' : 'Crear Blueprint'}</h3>
      <div className="grid cols-2">
        <div>
          <label htmlFor="bp-author">Autor</label>
          <input
            id="bp-author"
            className="input"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="juan.perez"
            readOnly={editing}
            required
          />
        </div>
        <div>
          <label htmlFor="bp-name">Nombre</label>
          <input
            id="bp-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="mi-dibujo"
            readOnly={editing}
            required
          />
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <p className="muted" style={{ margin: '0 0 8px' }}>
          Haz clic en el lienzo para agregar puntos ({points ? points.length : 0} puntos).
        </p>
        <BlueprintCanvas points={points ?? []} onAddPoint={addPoint} />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button
            type="button"
            className="btn"
            disabled={!points?.length}
            onClick={() => setPoints(points.slice(0, -1))}
          >
            Deshacer punto
          </button>
          <button
            type="button"
            className="btn"
            disabled={!points?.length}
            onClick={() => setPoints([])}
          >
            Limpiar
          </button>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <label htmlFor="bp-points">Puntos (JSON)</label>
        <textarea
          id="bp-points"
          className="input"
          rows="5"
          value={pointsJSON}
          onChange={(e) => setPointsJSON(e.target.value)}
        />
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <div style={{ marginTop: 12 }}>
        <button type="submit" className="btn primary" disabled={submitting}>
          {submitting ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}
