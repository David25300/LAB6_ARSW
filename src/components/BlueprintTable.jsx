/** Total de puntos de una lista de planos (README: "total de puntos (reduce)"). */
export const totalPoints = (items) => items.reduce((acc, bp) => acc + (bp.points?.length ?? 0), 0)

const th = { textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #ccc' }
const td = { padding: '6px 8px', borderBottom: '1px solid #eee' }

/**
 * Panel del autor: tabla de planos (nombre, numero de puntos, boton Open) y total de puntos.
 * status: 'idle' | 'loading' | 'failed'
 */
export default function BlueprintTable({ author, items, status, error, currentName, onOpen, onRetry }) {
  return (
    <div>
      <h3 style={{ margin: '8px 0' }}>{author ? `Planos de ${author}` : 'Planos'}</h3>

      {status === 'failed' && (
        <p style={{ color: '#b91c1c', margin: '4px 0' }}>
          ⚠ No se pudieron cargar los planos: {error}{' '}
          <button type="button" onClick={onRetry}>Reintentar</button>
        </p>
      )}
      {status === 'loading' && <p style={{ opacity: 0.7 }}>Cargando planos...</p>}
      {status === 'idle' && !items.length && (
        <p style={{ opacity: 0.7 }}>{author ? 'Este autor no tiene planos.' : 'Escribe un autor y pulsa Get blueprints.'}</p>
      )}

      {!!items.length && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Blueprint name</th>
              <th style={{ ...th, textAlign: 'right' }}>Number of points</th>
              <th style={th} />
            </tr>
          </thead>
          <tbody>
            {items.map((bp) => (
              <tr key={bp.name} style={bp.name === currentName ? { background: '#eff6ff' } : undefined}>
                <td style={td}>{bp.name}</td>
                <td style={{ ...td, textAlign: 'right' }}>{bp.points?.length ?? 0}</td>
                <td style={{ ...td, textAlign: 'right' }}>
                  <button type="button" onClick={() => onOpen(bp.name)}>Open</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p style={{ fontWeight: 700, marginTop: 10 }}>Total user points: {totalPoints(items)}</p>
    </div>
  )
}
