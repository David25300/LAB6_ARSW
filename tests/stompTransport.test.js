import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStompClient } from '../src/lib/stompClient.js'
import { ConnectionStatus, UpdateMode } from '../src/realtime/realtimeTypes.js'
import { createStompTransport } from '../src/realtime/stompTransport.js'
import { createFakeStompClient, silenceConsole } from './fakes.js'

describe('createStompClient', () => {
  it('connects to the WebSocket endpoint sending the JWT in the CONNECT frame', () => {
    const client = createStompClient('http://localhost:8080', 'abc')

    expect(client.brokerURL).toBe('ws://localhost:8080/ws-blueprints')
    expect(client.connectHeaders).toEqual({ Authorization: 'Bearer abc' })
  })
})

describe('stompTransport', () => {
  let client
  let transport
  const onStatus = vi.fn()
  const onError = vi.fn()

  beforeEach(() => {
    silenceConsole()
    onStatus.mockReset()
    onError.mockReset()
    client = createFakeStompClient()
    transport = createStompTransport({
      baseUrl: 'http://api',
      token: 't',
      clientFactory: () => client,
    })
    transport.connect({ onStatus, onError })
  })

  const establish = () => {
    client.connected = true
    client.onConnect()
  }

  it('reports the connection lifecycle', () => {
    expect(client.activate).toHaveBeenCalled()
    expect(onStatus).toHaveBeenLastCalledWith(ConnectionStatus.CONNECTING)

    establish()
    expect(onStatus).toHaveBeenLastCalledWith(ConnectionStatus.CONNECTED)

    client.connected = false
    client.onWebSocketClose()
    expect(onStatus).toHaveBeenLastCalledWith(ConnectionStatus.RECONNECTING)
  })

  it('delivers the snapshots of the watched blueprint as replace updates', () => {
    establish()
    const onUpdate = vi.fn()
    const snapshot = { author: 'john', name: 'house', points: [{ x: 1, y: 1 }] }

    transport.watch('john', 'house', onUpdate)
    client.deliver('/topic/blueprints.john.house', snapshot)

    expect(onUpdate).toHaveBeenCalledWith({ ...snapshot, mode: UpdateMode.REPLACE })
  })

  it('publishes draw events only while connected', () => {
    expect(transport.publish('john', 'house', { x: 1, y: 2 })).toBe(false)

    establish()

    expect(transport.publish('john', 'house', { x: 1, y: 2 })).toBe(true)
    expect(client.publish).toHaveBeenCalledWith({
      destination: '/app/draw',
      body: JSON.stringify({ author: 'john', name: 'house', point: { x: 1, y: 2 } }),
    })
  })

  it('forwards the errors the server sends to this session', () => {
    establish()

    client.deliver('/user/queue/errors', { message: 'Blueprint not found: john/ghost' })

    expect(onError).toHaveBeenCalledWith('Blueprint not found: john/ghost')
  })

  it('stops retrying when the server rejects the session', () => {
    client.onStompError({ headers: { message: 'Missing bearer token' } })
    client.onWebSocketClose()

    expect(client.deactivate).toHaveBeenCalled()
    expect(onStatus).toHaveBeenLastCalledWith(ConnectionStatus.ERROR)
  })

  it('unsubscribes when the blueprint is no longer watched', () => {
    establish()
    const stopWatching = transport.watch('john', 'house', vi.fn())

    stopWatching()

    const topic = client.subscriptions.find(
      ({ destination }) => destination === '/topic/blueprints.john.house',
    )
    expect(topic.unsubscribe).toHaveBeenCalled()
  })
})
