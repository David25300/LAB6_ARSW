import { ConnectionStatus } from '../realtime/realtimeTypes.js'

const LABELS = {
  [ConnectionStatus.OFFLINE]: 'Sin tiempo real',
  [ConnectionStatus.CONNECTING]: 'Conectando…',
  [ConnectionStatus.CONNECTED]: 'Conectado',
  [ConnectionStatus.RECONNECTING]: 'Reconectando…',
  [ConnectionStatus.ERROR]: 'Sin conexión',
}

export default function ConnectionBadge({ status }) {
  return (
    <span className={`badge badge--${status}`} role="status">
      {LABELS[status]}
    </span>
  )
}
