import { BlueprintState } from '../hooks/useBlueprintEditor.js'
import { TECHNOLOGY_OPTIONS } from '../realtime/transports.js'
import ConnectionBadge from './ConnectionBadge.jsx'

export default function BlueprintToolbar({
  blueprint,
  busy,
  technology,
  connectionStatus,
  onTechnologyChange,
  onCreate,
  onSave,
  onDelete,
}) {
  const isDraft = blueprint?.state === BlueprintState.DRAFT
  const isSaved = blueprint?.state === BlueprintState.SAVED

  return (
    <div className="toolbar">
      <div className="toolbar__actions" role="group" aria-label="Acciones del plano">
        <button
          type="button"
          className="button button--primary"
          onClick={onCreate}
          disabled={busy || !isDraft}
        >
          Create
        </button>
        <button type="button" className="button" onClick={onSave} disabled={busy || !isSaved}>
          Save/Update
        </button>
        <button
          type="button"
          className="button button--danger"
          onClick={onDelete}
          disabled={busy || !isSaved}
        >
          Delete
        </button>
      </div>
      <div className="toolbar__realtime">
        <label className="field field--inline">
          Tiempo real
          <select value={technology} onChange={(event) => onTechnologyChange(event.target.value)}>
            {TECHNOLOGY_OPTIONS.map(({ id, label }) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <ConnectionBadge status={connectionStatus} />
      </div>
    </div>
  )
}
