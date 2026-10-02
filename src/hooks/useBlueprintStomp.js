import { useCallback, useEffect, useRef, useState } from 'react'
import { createStompClient, subscribeBlueprint } from '../lib/stompClient.js'
import { API_BASE } from '../lib/api.js'

/**
 * Tiempo real por STOMP para un plano.
 *
 *  - UNA conexion mientras `enabled` sea true (no se reconecta al cambiar autor/plano).
 *  - UNA suscripcion a /topic/blueprints.{author}.{name}; si cambia el plano se re-suscribe
 *    y si la conexion se cae y vuelve, tambien (la suscripcion depende del estado de conexion).
 *
 * status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'
 * onUpdate(upd) recibe { author, name, points } con el plano completo.
 */
export function useBlueprintStomp({ enabled, author, name, onUpdate }) {
  const [status, setStatus] = useState('disconnected')
  const [lastError, setLastError] = useState(null)
  const clientRef = useRef(null)
  const onUpdateRef = useRef(onUpdate)
  const everConnected = useRef(false)

  // siempre el callback mas reciente, sin re-suscribir
  useEffect(() => {
    onUpdateRef.current = onUpdate
  })

  // --- conexion ---
  useEffect(() => {
    if (!enabled) {
      setStatus('disconnected')
      return undefined
    }
    everConnected.current = false
    setStatus('connecting')
    setLastError(null)

    const client = createStompClient(API_BASE)
    client.onConnect = () => {
      everConnected.current = true
      setLastError(null)
      setStatus('connected')
      console.info('[STOMP] conectado')
    }
    client.onWebSocketClose = () => {
      console.warn('[STOMP] conexion cerrada')
      setStatus(everConnected.current ? 'reconnecting' : 'connecting')
    }
    client.onWebSocketError = () => {
      setLastError(`No se pudo conectar con ${API_BASE}. ¿El backend está corriendo?`)
    }
    client.onStompError = (frame) => {
      console.error('[STOMP] error', frame.headers.message)
      setLastError(frame.headers.message ?? 'Error STOMP')
      setStatus('error')
    }
    clientRef.current = client
    client.activate()

    return () => {
      clientRef.current = null
      client.deactivate()
      setStatus('disconnected')
    }
  }, [enabled])

  // --- suscripcion al plano ---
  useEffect(() => {
    if (status !== 'connected' || !author || !name || !clientRef.current) return undefined
    const sub = subscribeBlueprint(clientRef.current, author, name, (upd) => onUpdateRef.current?.(upd))
    console.info(`[STOMP] suscrito a blueprints.${author}.${name}`)
    return () => {
      try {
        sub.unsubscribe()
      } catch {
        /* la conexion ya se cayo: la suscripcion murio con ella */
      }
    }
  }, [status, author, name])

  /** Publica un punto en /app/draw. Devuelve false si no hay conexion. */
  const publishPoint = useCallback(
    (point) => {
      const client = clientRef.current
      if (!client?.connected || !author || !name) return false
      client.publish({ destination: '/app/draw', body: JSON.stringify({ author, name, point }) })
      return true
    },
    [author, name],
  )

  return { status, lastError, publishPoint }
}
