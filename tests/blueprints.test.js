import { describe, expect, it } from 'vitest'
import { isSameBlueprint, sortByName, totalPoints } from '../src/lib/blueprints.js'
import { applyRealtimeUpdate } from '../src/realtime/applyRealtimeUpdate.js'
import { UpdateMode } from '../src/realtime/realtimeTypes.js'

const point = (x, y) => ({ x, y })

describe('blueprint helpers', () => {
  it('adds up the points of every blueprint', () => {
    const blueprints = [{ points: [point(0, 0), point(1, 1)] }, { points: [point(2, 2)] }, {}]

    expect(totalPoints(blueprints)).toBe(3)
    expect(totalPoints([])).toBe(0)
  })

  it('sorts blueprints by name without mutating the input', () => {
    const blueprints = [{ name: 'house' }, { name: 'garage' }]

    expect(sortByName(blueprints).map(({ name }) => name)).toEqual(['garage', 'house'])
    expect(blueprints[0].name).toBe('house')
  })

  it('identifies a blueprint by author and name', () => {
    expect(isSameBlueprint({ author: 'a', name: 'b' }, { author: 'a', name: 'b' })).toBe(true)
    expect(isSameBlueprint({ author: 'a', name: 'b' }, { author: 'a', name: 'c' })).toBe(false)
    expect(isSameBlueprint(null, { author: 'a', name: 'b' })).toBe(false)
  })
})

describe('applyRealtimeUpdate', () => {
  const current = [point(0, 0)]

  it('replaces the points with an authoritative snapshot', () => {
    const update = { mode: UpdateMode.REPLACE, points: [point(0, 0), point(5, 5)] }

    expect(applyRealtimeUpdate(current, update)).toEqual(update.points)
  })

  it('appends the points of an incremental update', () => {
    const update = { mode: UpdateMode.APPEND, points: [point(9, 9)] }

    expect(applyRealtimeUpdate(current, update)).toEqual([point(0, 0), point(9, 9)])
  })
})
