import { vi } from 'vitest'
import { ConnectionStatus } from '../src/realtime/realtimeTypes.js'

export const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
})

export function createFakeTransport({ authoritative = true } = {}) {
  const watchers = new Set()
  const transport = {
    authoritative,
    handlers: null,
    connect: vi.fn((handlers) => {
      transport.handlers = handlers
      handlers.onStatus(ConnectionStatus.CONNECTED)
    }),
    watch: vi.fn((author, name, onUpdate) => {
      const watcher = { author, name, onUpdate }
      watchers.add(watcher)
      return () => watchers.delete(watcher)
    }),
    publish: vi.fn(() => true),
    disconnect: vi.fn(),
    emit: (update) => watchers.forEach((watcher) => watcher.onUpdate(update)),
    watchers,
  }
  return transport
}

export function createFakeStompClient() {
  const client = {
    connected: false,
    subscriptions: [],
    activate: vi.fn(),
    deactivate: vi.fn(),
    publish: vi.fn(),
    subscribe: vi.fn((destination, callback) => {
      const subscription = { destination, callback, unsubscribe: vi.fn() }
      client.subscriptions.push(subscription)
      return subscription
    }),
    deliver: (destination, body) =>
      client.subscriptions
        .filter((subscription) => subscription.destination === destination)
        .forEach((subscription) => subscription.callback({ body: JSON.stringify(body) })),
  }
  return client
}

export function createFakeSocket() {
  const listeners = new Map()
  return {
    connected: false,
    on: vi.fn((event, handler) => listeners.set(event, [...(listeners.get(event) ?? []), handler])),
    off: vi.fn((event, handler) =>
      listeners.set(
        event,
        (listeners.get(event) ?? []).filter((registered) => registered !== handler),
      ),
    ),
    emit: vi.fn(),
    disconnect: vi.fn(),
    trigger: (event, payload) =>
      (listeners.get(event) ?? []).forEach((handler) => handler(payload)),
  }
}

export function silenceConsole() {
  ;['info', 'warn', 'error'].forEach((level) =>
    vi.spyOn(console, level).mockImplementation(() => {}),
  )
}
