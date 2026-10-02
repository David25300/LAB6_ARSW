import { LoadStatus } from '../hooks/useAuthorBlueprints.js'
import { totalPoints } from '../lib/blueprints.js'

function EmptyState({ author }) {
  return (
    <p className="muted">
      {author ? 'Este autor no tiene planos todavía.' : 'Escribe un autor y pulsa Get blueprints.'}
    </p>
  )
}

export default function BlueprintTable({
  author,
  items,
  status,
  error,
  currentName,
  onOpen,
  onRetry,
}) {
  return (
    <section className="card" aria-labelledby="blueprints-title">
      <h2 id="blueprints-title">{author ? `Planos de ${author}` : 'Planos'}</h2>

      {status === LoadStatus.FAILED && (
        <p role="alert" className="feedback feedback--error">
          No se pudieron cargar los planos: {error}{' '}
          <button type="button" className="button button--link" onClick={onRetry}>
            Reintentar
          </button>
        </p>
      )}
      {status === LoadStatus.LOADING && <p className="muted">Cargando planos…</p>}
      {status === LoadStatus.IDLE && items.length === 0 && <EmptyState author={author} />}

      {items.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Blueprint name</th>
              <th scope="col" className="table__number">
                Number of points
              </th>
              <th scope="col">
                <span className="visually-hidden">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map(({ name, points }) => (
              <tr key={name} className={name === currentName ? 'table__row--current' : undefined}>
                <td>{name}</td>
                <td className="table__number">{points?.length ?? 0}</td>
                <td className="table__number">
                  <button
                    type="button"
                    className="button button--small"
                    onClick={() => onOpen(name)}
                  >
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="total">
        Total user points: <output aria-label="Total de puntos">{totalPoints(items)}</output>
      </p>
    </section>
  )
}
