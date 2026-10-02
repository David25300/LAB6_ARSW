import { useCallback, useEffect, useRef, useState } from 'react'
import { ConnectionStatus } from '../realtime/realtimeTypes.js'
import { createTransport } from '../realtime/transports.js'

export function useRealtimeBlueprint({
  technology,
  token,
  author,
  name,
  onUpdate,
  onResync,
  transportFactory = createTransport,
}) {
  const [transport, setTransport] = useState(null)
  const [status, setStatus] = useState(ConnectionStatus.OFFLINE)
  const [error, setError] = useState(null)
  const callbacks = useRef({ onUpdate, onResync })

  useEffect(() => {
    callbacks.current = { onUpdate, onResync }
  })

  useEffect(() => {
    const instance = transportFactory(technology, { token })
    let active = true
    let connectedBefore = false

    instance.connect({
      onStatus: (next) => {
        if (!active) return
        if (next === ConnectionStatus.CONNECTED) {
          if (connectedBefore && instance.authoritative) callbacks.current.onResync?.()
          connectedBefore = true
          setError(null)
        }
        setStatus(next)
      },
      onError: (message) => {
        if (active) setError(message)
      },
    })
    setTransport(instance)

    return () => {
      active = false
      instance.disconnect()
      setTransport(null)
      setStatus(ConnectionStatus.OFFLINE)
      setError(null)
    }
  }, [technology, token, transportFactory])

  useEffect(() => {
    if (!transport || status !== ConnectionStatus.CONNECTED || !author || !name) return undefined
    return transport.watch(author, name, (update) => callbacks.current.onUpdate?.(update))
  }, [transport, status, author, name])

  const publishPoint = useCallback(
    (point) => Boolean(transport && author && name && transport.publish(author, name, point)),
    [transport, author, name],
  )

  return { status, error, publishPoint }
}
