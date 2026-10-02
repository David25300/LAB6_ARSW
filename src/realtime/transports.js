import { IO_BASE, STOMP_BASE } from '../config.js'
import { createNoneTransport } from './noneTransport.js'
import { createSocketIoTransport } from './socketIoTransport.js'
import { createStompTransport } from './stompTransport.js'

export const Technology = Object.freeze({
  NONE: 'none',
  SOCKET_IO: 'socketio',
  STOMP: 'stomp',
})

export const TECHNOLOGY_OPTIONS = [
  { id: Technology.NONE, label: 'None' },
  { id: Technology.SOCKET_IO, label: 'Socket.IO' },
  { id: Technology.STOMP, label: 'STOMP' },
]

const factories = {
  [Technology.NONE]: () => createNoneTransport(),
  [Technology.SOCKET_IO]: () => createSocketIoTransport({ baseUrl: IO_BASE }),
  [Technology.STOMP]: ({ token }) => createStompTransport({ baseUrl: STOMP_BASE, token }),
}

export function createTransport(technology, options = {}) {
  const factory = factories[technology]
  if (!factory) throw new Error(`Tecnología de tiempo real desconocida: ${technology}`)
  return factory(options)
}
