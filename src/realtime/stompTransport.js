import { createStompClient, subscribeBlueprint } from '../lib/stompClient.js'
import { ConnectionStatus, UpdateMode } from './realtimeTypes.js'

const DRAW_DESTINATION = '/app/draw'
const ERRORS_QUEUE = '/user/queue/errors'

export function createStompTransport({ baseUrl, token, clientFactory = createStompClient }) {
  const client = clientFactory(baseUrl, token)
  let stopped = false

  return {
    authoritative: true,

    connect({ onStatus, onError }) {
      let connectedOnce = false
      client.onConnect = () => {
        connectedOnce = true
        client.subscribe(ERRORS_QUEUE, (message) => onError(JSON.parse(message.body).message))
        console.info('[STOMP] conectado a', baseUrl)
        onStatus(ConnectionStatus.CONNECTED)
      }
      client.onWebSocketClose = () => {
        if (stopped) return
        console.warn('[STOMP] conexión cerrada')
        onStatus(connectedOnce ? ConnectionStatus.RECONNECTING : ConnectionStatus.CONNECTING)
      }
      client.onWebSocketError = () => onError(`No se pudo conectar con ${baseUrl}.`)
      client.onStompError = (frame) => {
        console.error('[STOMP] el servidor rechazó la sesión:', frame.headers.message)
        stopped = true
        client.deactivate()
        onError('El servidor rechazó la conexión en tiempo real. Inicia sesión de nuevo.')
        onStatus(ConnectionStatus.ERROR)
      }
      onStatus(ConnectionStatus.CONNECTING)
      client.activate()
    },

    watch(author, name, onUpdate) {
      const subscription = subscribeBlueprint(client, author, name, (update) =>
        onUpdate({ ...update, mode: UpdateMode.REPLACE }),
      )
      console.info(`[STOMP] suscrito a blueprints.${author}.${name}`)
      return () => {
        if (client.connected) subscription.unsubscribe()
      }
    },

    publish(author, name, point) {
      if (!client.connected) return false
      client.publish({
        destination: DRAW_DESTINATION,
        body: JSON.stringify({ author, name, point }),
      })
      return true
    },

    disconnect() {
      stopped = true
      client.deactivate()
    },
  }
}
