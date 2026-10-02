import { UpdateMode } from './realtimeTypes.js'

export function applyRealtimeUpdate(points, update) {
  return update.mode === UpdateMode.REPLACE ? update.points : [...points, ...update.points]
}
