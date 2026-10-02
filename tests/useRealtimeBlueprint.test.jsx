import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useRealtimeBlueprint } from '../src/hooks/useRealtimeBlueprint.js'
import { ConnectionStatus, UpdateMode } from '../src/realtime/realtimeTypes.js'
import { createFakeTransport } from './fakes.js'

function renderRealtime(props) {
  const transport = createFakeTransport()
  const transportFactory = vi.fn(() => transport)
  const hook = renderHook((current) => useRealtimeBlueprint({ transportFactory, ...current }), {
    initialProps: { technology: 'stomp', token: 't', author: 'john', name: 'house', ...props },
  })
  return { ...hook, transport, transportFactory }
}

describe('useRealtimeBlueprint', () => {
  it('connects with the selected technology and watches the open blueprint', () => {
    const onUpdate = vi.fn()
    const { result, transport, transportFactory } = renderRealtime({ onUpdate })
    const update = { author: 'john', name: 'house', points: [], mode: UpdateMode.REPLACE }

    act(() => transport.emit(update))

    expect(transportFactory).toHaveBeenCalledWith('stomp', { token: 't' })
    expect(result.current.status).toBe(ConnectionStatus.CONNECTED)
    expect(transport.watch).toHaveBeenCalledWith('john', 'house', expect.any(Function))
    expect(onUpdate).toHaveBeenCalledWith(update)
  })

  it('publishes points for the open blueprint', () => {
    const { result, transport } = renderRealtime()

    result.current.publishPoint({ x: 4, y: 5 })

    expect(transport.publish).toHaveBeenCalledWith('john', 'house', { x: 4, y: 5 })
  })

  it('does not watch anything while no saved blueprint is open', () => {
    const { result, transport } = renderRealtime({ author: null, name: null })

    expect(transport.watch).not.toHaveBeenCalled()
    expect(result.current.publishPoint({ x: 1, y: 1 })).toBe(false)
  })

  it('switches the watched blueprint without reconnecting', () => {
    const { rerender, transport, transportFactory } = renderRealtime()

    rerender({ technology: 'stomp', token: 't', author: 'john', name: 'garage' })

    expect(transportFactory).toHaveBeenCalledTimes(1)
    expect([...transport.watchers].map(({ name }) => name)).toEqual(['garage'])
  })

  it('resynchronises after reconnecting to an authoritative server', () => {
    const onResync = vi.fn()
    const { transport } = renderRealtime({ onResync })

    act(() => transport.handlers.onStatus(ConnectionStatus.RECONNECTING))
    act(() => transport.handlers.onStatus(ConnectionStatus.CONNECTED))

    expect(onResync).toHaveBeenCalledTimes(1)
  })

  it('disconnects when the technology changes or the component unmounts', () => {
    const { rerender, unmount, transport } = renderRealtime()

    rerender({ technology: 'none', token: 't', author: 'john', name: 'house' })
    expect(transport.disconnect).toHaveBeenCalledTimes(1)

    unmount()
    expect(transport.disconnect).toHaveBeenCalledTimes(2)
  })
})
