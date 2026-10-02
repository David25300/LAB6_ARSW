import { createSocket } from '../lib/socketIoClient.js'
import { ConnectionStatus, UpdateMode } from './realtimeTypes.js'

const roomOf = (author, name) => `blueprints.${author}.${name}`

export function createSocketIoTransport({ baseUrl, socketFactory = createSocket }) {
  let socket = null

  return {
    authoritative: false,

    connect({ onStatus, onError }) {
      let connectedOnce = false
      socket = socketFactory(baseUrl)
      socket.on('connect', () => {
        connectedOnce = true
        console.info('[Socket.IO] conectado a', baseUrl)
        onStatus(ConnectionStatus.CONNECTED)
      })
      socket.on('disconnect', (reason) => {
        console.warn('[Socket.IO] desconectado:', reason)
        onStatus(ConnectionStatus.RECONNECTING)
      })
      socket.on('connect_error', () => {
        onError(`No se pudo conectar con ${baseUrl}.`)
        onStatus(connectedOnce ? ConnectionStatus.RECONNECTING : ConnectionStatus.CONNECTING)
      })
      onStatus(ConnectionStatus.CONNECTING)
    },

    watch(author, name, onUpdate) {
      const room = roomOf(author, name)
      const handleUpdate = (update) => {
        if (update.author === author && update.name === name) {
          onUpdate({ ...update, mode: UpdateMode.APPEND })
        }
      }
      socket.on('blueprint-update', handleUpdate)
      socket.emit('join-room', room)
      console.info(`[Socket.IO] unido a ${room}`)
      return () => socket.off('blueprint-update', handleUpdate)
    },

    publish(author, name, point) {
      if (!socket?.connected) return false
      socket.emit('draw-event', { room: roomOf(author, name), author, name, point })
      return true
    },

    disconnect() {
      socket?.disconnect()
    },
  }
}
