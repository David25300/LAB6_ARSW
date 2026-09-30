import { describe, it, expect, vi, beforeEach } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import reducer, {
  fetchAll,
  fetchByAuthor,
  fetchBlueprint,
  createBlueprint,
  updateBlueprint,
  removeBlueprint,
  selectAuthors,
  selectTop5,
} from '../src/features/blueprints/blueprintsSlice.js'
import service from '../src/services/blueprintsService.js'

vi.mock('../src/services/blueprintsService.js', () => ({
  default: {
    getAll: vi.fn(),
    getByAuthor: vi.fn(),
    getByAuthorAndName: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}))

const pts = (n) => Array.from({ length: n }, (_, i) => ({ x: i, y: i }))
const house = { author: 'john', name: 'house', points: pts(1) }
const garage = { author: 'john', name: 'garage', points: pts(3) }
const initial = reducer(undefined, { type: '@@INIT' })
const withJohn = { ...initial, byAuthor: { john: [house, garage] } }

describe('blueprints slice (reducers puros)', () => {
  it('should initialize correctly', () => {
    expect(initial.byAuthor).toEqual({})
    expect(initial.current).toBeNull()
    expect(initial.rollback).toEqual({})
    expect(initial.status).toEqual({
      all: 'idle',
      byAuthor: 'idle',
      current: 'idle',
      create: 'idle',
      update: 'idle',
      remove: 'idle',
    })
  })

  it('fetchAll.fulfilled agrupa el catálogo por autor', () => {
    const ana = { author: 'ana', name: 'x', points: [] }
    const s = reducer(initial, fetchAll.fulfilled([house, ana, garage], 'req'))
    expect(s.byAuthor).toEqual({ john: [house, garage], ana: [ana] })
    expect(s.status.all).toBe('succeeded')
  })

  it('fetchAll no pisa un autor que ya se cargó (esa respuesta es más reciente)', () => {
    const ana = { author: 'ana', name: 'x', points: [] }
    const loaded = { ...initial, byAuthor: { john: [house] } }
    const s = reducer(loaded, fetchAll.fulfilled([house, garage, ana], 'req'))
    expect(s.byAuthor).toEqual({ john: [house], ana: [ana] })
  })

  it('fetchByAuthor.pending marca loading y limpia el error previo', () => {
    const prev = { ...initial, error: { ...initial.error, byAuthor: 'boom' } }
    const s = reducer(prev, fetchByAuthor.pending('req', 'john'))
    expect(s.status.byAuthor).toBe('loading')
    expect(s.error.byAuthor).toBeNull()
  })

  it('fetchByAuthor.fulfilled guarda los planos bajo su autor', () => {
    const s = reducer(initial, fetchByAuthor.fulfilled({ author: 'john', items: [house] }, 'req'))
    expect(s.status.byAuthor).toBe('succeeded')
    expect(s.byAuthor.john).toEqual([house])
  })

  it('fetchByAuthor.fulfilled con algo que no es arreglo deja la lista vacía', () => {
    const s = reducer(initial, fetchByAuthor.fulfilled({ author: 'john', items: null }, 'req'))
    expect(s.byAuthor.john).toEqual([])
  })

  it('un rechazo solo afecta el status/error de su propio thunk', () => {
    const s = reducer(initial, fetchBlueprint.rejected(new Error('Network Error'), 'req', {}))
    expect(s.status.current).toBe('failed')
    expect(s.error.current).toBe('Network Error')
    expect(s.status.byAuthor).toBe('idle')
    expect(s.error.byAuthor).toBeNull()
  })

  it('fetchBlueprint.fulfilled deja el plano como actual', () => {
    const s = reducer(initial, fetchBlueprint.fulfilled(house, 'req', {}))
    expect(s.current).toEqual(house)
    expect(s.status.current).toBe('succeeded')
  })

  it('createBlueprint.fulfilled agrega el plano a la lista de su autor (y la crea si no existe)', () => {
    const nuevo = { author: 'ana', name: 'new', points: [] }
    let s = reducer(withJohn, createBlueprint.fulfilled({ ...garage, name: 'shed' }, 'r1', {}))
    expect(s.byAuthor.john.map((bp) => bp.name)).toEqual(['house', 'garage', 'shed'])
    s = reducer(s, createBlueprint.fulfilled(nuevo, 'r2', nuevo))
    expect(s.byAuthor.ana).toEqual([nuevo])
  })
})

describe('PUT optimista (updateBlueprint)', () => {
  const arg = { author: 'john', name: 'house', points: pts(4) }
  const opened = { ...withJohn, current: house }

  it('pending aplica el cambio de una vez en la lista y en el plano actual', () => {
    const s = reducer(opened, updateBlueprint.pending('r1', arg))
    expect(s.byAuthor.john[0].points).toHaveLength(4)
    expect(s.current.points).toHaveLength(4)
    expect(s.rollback.r1).toEqual(house)
  })

  it('rejected revierte a los puntos anteriores', () => {
    let s = reducer(opened, updateBlueprint.pending('r1', arg))
    s = reducer(s, updateBlueprint.rejected(new Error('No autorizado'), 'r1', arg))
    expect(s.byAuthor.john[0]).toEqual(house)
    expect(s.current).toEqual(house)
    expect(s.error.update).toBe('No autorizado')
    expect(s.rollback).toEqual({})
  })

  it('fulfilled confirma con lo que devolvió el backend', () => {
    let s = reducer(opened, updateBlueprint.pending('r1', arg))
    s = reducer(s, updateBlueprint.fulfilled({ ...arg, points: pts(2) }, 'r1', arg))
    expect(s.byAuthor.john[0].points).toHaveLength(2)
    expect(s.status.update).toBe('succeeded')
    expect(s.rollback).toEqual({})
  })
})

describe('DELETE optimista (removeBlueprint)', () => {
  const arg = { author: 'john', name: 'house' }

  it('pending lo quita de la lista y del plano actual', () => {
    const s = reducer({ ...withJohn, current: house }, removeBlueprint.pending('r1', arg))
    expect(s.byAuthor.john).toEqual([garage])
    expect(s.current).toBeNull()
  })

  it('rejected lo devuelve a su posición original', () => {
    let s = reducer({ ...withJohn, current: house }, removeBlueprint.pending('r1', arg))
    s = reducer(s, removeBlueprint.rejected(new Error('Network Error'), 'r1', arg))
    expect(s.byAuthor.john).toEqual([house, garage])
    expect(s.current).toEqual(house)
    expect(s.error.remove).toBe('Network Error')
  })

  it('no toca el plano actual si era otro', () => {
    let s = reducer({ ...withJohn, current: garage }, removeBlueprint.pending('r1', arg))
    expect(s.current).toEqual(garage)
    s = reducer(s, removeBlueprint.rejected(new Error('x'), 'r1', arg))
    expect(s.current).toEqual(garage)
  })
})

describe('selectores memoizados', () => {
  const big = { author: 'ana', name: 'big', points: pts(9) }
  const state = (byAuthor) => ({ blueprints: { ...initial, byAuthor } })

  it('selectAuthors deriva los autores con planos', () => {
    expect(selectAuthors(state({ john: [house], ana: [big], empty: [] }))).toEqual(['john', 'ana'])
  })

  it('selectTop5 ordena por cantidad de puntos y se queda con 5', () => {
    const many = Array.from({ length: 6 }, (_, i) => ({
      author: 'x',
      name: `bp${i}`,
      points: pts(i),
    }))
    const top = selectTop5(state({ x: many, ana: [big] }))
    expect(top.map((bp) => bp.name)).toEqual(['big', 'bp5', 'bp4', 'bp3', 'bp2'])
  })

  it('devuelve la misma referencia si byAuthor no cambió (memoización)', () => {
    const s = state({ john: [house, garage] })
    expect(selectTop5(s)).toBe(selectTop5({ blueprints: { ...s.blueprints, current: house } }))
  })
})

describe('blueprints thunks con un store real', () => {
  const makeStore = () => configureStore({ reducer: { blueprints: reducer } })

  beforeEach(() => vi.resetAllMocks())

  it('fetchAll llena el catálogo y los autores derivados', async () => {
    service.getAll.mockResolvedValue([house, garage, { author: 'ana', name: 'a', points: [] }])
    const store = makeStore()
    await store.dispatch(fetchAll())
    expect(selectAuthors(store.getState())).toEqual(['john', 'ana'])
  })

  it('fetchByAuthor llama al servicio y guarda el resultado', async () => {
    service.getByAuthor.mockResolvedValue([house])
    const store = makeStore()
    await store.dispatch(fetchByAuthor('john'))
    expect(service.getByAuthor).toHaveBeenCalledWith('john')
    expect(store.getState().blueprints.byAuthor.john).toEqual([house])
  })

  it('si el servicio falla el error queda en el estado', async () => {
    service.getByAuthorAndName.mockRejectedValue(new Error('No autorizado'))
    const store = makeStore()
    await store.dispatch(fetchBlueprint({ author: 'john', name: 'house' }))
    const s = store.getState().blueprints
    expect(s.status.current).toBe('failed')
    expect(s.error.current).toBe('No autorizado')
    expect(s.current).toBeNull()
  })

  it('createBlueprint envía el payload al servicio', async () => {
    service.create.mockResolvedValue(house)
    const store = makeStore()
    const result = await store.dispatch(createBlueprint(house)).unwrap()
    expect(service.create).toHaveBeenCalledWith(house)
    expect(result).toEqual(house)
  })

  it('updateBlueprint y removeBlueprint llaman a update/remove del servicio', async () => {
    service.update.mockResolvedValue({ ...house, points: pts(2) })
    service.remove.mockResolvedValue()
    const store = makeStore()
    await store.dispatch(updateBlueprint({ author: 'john', name: 'house', points: pts(2) }))
    await store.dispatch(removeBlueprint({ author: 'john', name: 'house' }))
    expect(service.update).toHaveBeenCalledWith('john', 'house', pts(2))
    expect(service.remove).toHaveBeenCalledWith('john', 'house')
  })
})
