import { ConnectionStatus } from './realtimeTypes.js'

const noop = () => {}

export function createNoneTransport() {
  return {
    authoritative: false,
    connect: ({ onStatus }) => onStatus(ConnectionStatus.OFFLINE),
    watch: () => noop,
    publish: () => false,
    disconnect: noop,
  }
}
