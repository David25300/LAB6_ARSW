import { useCallback, useRef, useState } from 'react'
import { listByAuthor } from '../lib/api.js'
import { sortByName } from '../lib/blueprints.js'

export const LoadStatus = Object.freeze({
  IDLE: 'idle',
  LOADING: 'loading',
  FAILED: 'failed',
})

export function useAuthorBlueprints() {
  const [author, setAuthor] = useState('')
  const [items, setItems] = useState([])
  const [status, setStatus] = useState(LoadStatus.IDLE)
  const [error, setError] = useState(null)
  const latestRequest = useRef(0)

  const load = useCallback(async (nextAuthor) => {
    const requestId = ++latestRequest.current
    setAuthor(nextAuthor)
    setStatus(LoadStatus.LOADING)
    setError(null)
    try {
      const blueprints = await listByAuthor(nextAuthor)
      if (requestId !== latestRequest.current) return
      setItems(sortByName(blueprints))
      setStatus(LoadStatus.IDLE)
    } catch (loadError) {
      if (requestId !== latestRequest.current) return
      setItems([])
      setError(loadError.message)
      setStatus(LoadStatus.FAILED)
    }
  }, [])

  const refresh = useCallback(async () => {
    if (author) await load(author)
  }, [author, load])

  const upsert = useCallback(
    ({ author: blueprintAuthor, name, points }) => {
      if (blueprintAuthor !== author) return
      setItems((current) =>
        sortByName([
          ...current.filter((item) => item.name !== name),
          { author: blueprintAuthor, name, points },
        ]),
      )
    },
    [author],
  )

  return { author, items, status, error, load, refresh, upsert }
}
