import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createBlueprint,
  deleteBlueprint,
  getBlueprint,
  HTTP_NOT_FOUND,
  updateBlueprint,
} from '../lib/api.js'
import { isSameBlueprint } from '../lib/blueprints.js'
import { applyRealtimeUpdate } from '../realtime/applyRealtimeUpdate.js'
import { UpdateMode } from '../realtime/realtimeTypes.js'

export const BlueprintState = Object.freeze({
  DRAFT: 'draft',
  SAVED: 'saved',
})

export const FeedbackKind = Object.freeze({
  INFO: 'info',
  ERROR: 'error',
})

const info = (text) => ({ kind: FeedbackKind.INFO, text })
const failure = (error) => ({ kind: FeedbackKind.ERROR, text: error.message })

const savedBlueprint = ({ author, name, points }) => ({
  author,
  name,
  points: points ?? [],
  state: BlueprintState.SAVED,
  dirty: false,
})

const draftBlueprint = (author, name) => ({
  author,
  name,
  points: [],
  state: BlueprintState.DRAFT,
  dirty: false,
})

export function useBlueprintEditor({ onPersisted } = {}) {
  const [blueprint, setBlueprint] = useState(null)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const blueprintRef = useRef(blueprint)
  const onPersistedRef = useRef(onPersisted)
  const latestOpen = useRef(0)

  useEffect(() => {
    blueprintRef.current = blueprint
    onPersistedRef.current = onPersisted
  })

  const open = useCallback(async (author, name) => {
    const requestId = ++latestOpen.current
    setBusy(true)
    setFeedback(null)
    try {
      const loaded = await getBlueprint({ author, name })
      if (requestId === latestOpen.current) setBlueprint(savedBlueprint(loaded))
    } catch (error) {
      if (requestId !== latestOpen.current) return
      if (error.status === HTTP_NOT_FOUND) {
        setBlueprint(draftBlueprint(author, name))
        setFeedback(info(`"${name}" todavía no existe: dibújalo y pulsa Create para guardarlo.`))
      } else {
        setFeedback(failure(error))
      }
    } finally {
      if (requestId === latestOpen.current) setBusy(false)
    }
  }, [])

  const reload = useCallback(async () => {
    const current = blueprintRef.current
    if (current?.state !== BlueprintState.SAVED || current.dirty) return
    try {
      const loaded = await getBlueprint(current)
      setBlueprint((latest) => (isSameBlueprint(latest, loaded) ? savedBlueprint(loaded) : latest))
    } catch (error) {
      setFeedback(failure(error))
    }
  }, [])

  const addPoint = useCallback((point) => {
    setBlueprint(
      (latest) => latest && { ...latest, points: [...latest.points, point], dirty: true },
    )
  }, [])

  const applyRemoteUpdate = useCallback((update) => {
    setBlueprint((latest) => {
      if (!isSameBlueprint(latest, update)) return latest
      return {
        ...latest,
        points: applyRealtimeUpdate(latest.points, update),
        dirty: update.mode !== UpdateMode.REPLACE,
      }
    })
  }, [])

  const persist = useCallback(async ({ action, nextState, describe }) => {
    const snapshot = blueprintRef.current
    if (!snapshot) return
    setBusy(true)
    setFeedback(null)
    try {
      await action(snapshot)
      setBlueprint((latest) =>
        isSameBlueprint(latest, snapshot) ? nextState(latest, snapshot) : latest,
      )
      setFeedback(info(describe(snapshot)))
      await onPersistedRef.current?.()
    } catch (error) {
      setFeedback(failure(error))
    } finally {
      setBusy(false)
    }
  }, [])

  const create = useCallback(
    () =>
      persist({
        action: createBlueprint,
        nextState: (latest, snapshot) => ({
          ...latest,
          state: BlueprintState.SAVED,
          dirty: latest.points !== snapshot.points,
        }),
        describe: ({ name }) => `Plano "${name}" creado.`,
      }),
    [persist],
  )

  const save = useCallback(
    () =>
      persist({
        action: updateBlueprint,
        nextState: (latest, snapshot) => ({ ...latest, dirty: latest.points !== snapshot.points }),
        describe: ({ name, points }) => `Plano "${name}" guardado con ${points.length} puntos.`,
      }),
    [persist],
  )

  const remove = useCallback(
    () =>
      persist({
        action: deleteBlueprint,
        nextState: ({ author, name }) => draftBlueprint(author, name),
        describe: ({ name }) => `Plano "${name}" eliminado.`,
      }),
    [persist],
  )

  return {
    blueprint,
    busy,
    feedback,
    open,
    reload,
    addPoint,
    applyRemoteUpdate,
    create,
    save,
    remove,
  }
}
