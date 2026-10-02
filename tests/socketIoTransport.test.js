import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConnectionStatus, UpdateMode } from '../src/realtime/realtimeTypes.js'
import { createSocketIoTransport } from '../src/realtime/socketIoTransport.js'
import { createFakeSocket, silenceConsole } from './fakes.js'

describe('socketIoTransport', () => {
  let socket
  let transport
  const onStatus = vi.fn()
  const onError = vi.fn()

  beforeEach(() => {
    silenceConsole()
    onStatus.mockReset()
    onError.mockReset()
    socket = createFakeSocket()
    transport = createSocketIoTransport({ baseUrl: 'http://io', socketFactory: () => socket })
    transport.connect({ onStatus, onError })
  })

  it('reports the connection lifecycle', () => {
    expect(onStatus).toHaveBeenLastCalledWith(ConnectionStatus.CONNECTING)

    socket.trigger('connect')
    expect(onStatus).toHaveBeenLastCalledWith(ConnectionStatus.CONNECTED)

    socket.trigger('disconnect', 'transport close')
    expect(onStatus).toHaveBeenLastCalledWith(ConnectionStatus.RECONNECTING)
  })

  it('joins the blueprint room and appends updates for that blueprint only', () => {
    const onUpdate = vi.fn()
    const update = { author: 'john', name: 'house', points: [{ x: 3, y: 3 }] }

    transport.watch('john', 'house', onUpdate)
    socket.trigger('blueprint-update', update)
    socket.trigger('blueprint-update', { ...update, name: 'garage' })

    expect(socket.emit).toHaveBeenCalledWith('join-room', 'blueprints.john.house')
    expect(onUpdate).toHaveBeenCalledTimes(1)
    expect(onUpdate).toHaveBeenCalledWith({ ...update, mode: UpdateMode.APPEND })
  })

  it('emits draw events to the room while connected', () => {
    expect(transport.publish('john', 'house', { x: 1, y: 1 })).toBe(false)

    socket.connected = true

    expect(transport.publish('john', 'house', { x: 1, y: 1 })).toBe(true)
    expect(socket.emit).toHaveBeenCalledWith('draw-event', {
      room: 'blueprints.john.house',
      author: 'john',
      name: 'house',
      point: { x: 1, y: 1 },
    })
  })

  it('stops listening when the blueprint is no longer watched', () => {
    const onUpdate = vi.fn()
    const stopWatching = transport.watch('john', 'house', onUpdate)

    stopWatching()
    socket.trigger('blueprint-update', { author: 'john', name: 'house', points: [] })

    expect(onUpdate).not.toHaveBeenCalled()
  })
})
