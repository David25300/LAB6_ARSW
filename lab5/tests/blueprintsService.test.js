import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import apimock from '../src/services/apimock.js'
import apiclient from '../src/services/blueprintsApiClient.js'
import api from '../src/services/apiClient.js'

vi.mock('../src/services/apiClient.js', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

const bp = { author: 'john', name: 'house', points: [{ x: 1, y: 2 }] }
const ok = (data) => ({ data: { code: 200, message: 'OK', data } })
const httpError = (status) => Object.assign(new Error(`status ${status}`), { response: { status } })

describe('blueprintsService: conmutación con VITE_USE_MOCK', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  const loadWith = async (useMock) => {
    vi.stubEnv('VITE_USE_MOCK', useMock)
    vi.resetModules()
    const { default: service } = await import('../src/services/blueprintsService.js')
    const { default: mock } = await import('../src/services/apimock.js')
    const { default: real } = await import('../src/services/blueprintsApiClient.js')
    return { service, mock, real }
  }

  it('VITE_USE_MOCK=true usa apimock', async () => {
    const { service, mock } = await loadWith('true')
    expect(service).toBe(mock)
  })

  it('VITE_USE_MOCK=false usa el cliente del API real', async () => {
    const { service, real } = await loadWith('false')
    expect(service).toBe(real)
  })

  it('mock y cliente real exponen la misma interfaz', () => {
    const methods = ['create', 'getAll', 'getByAuthor', 'getByAuthorAndName', 'remove', 'update']
    expect(Object.keys(apimock).sort()).toEqual(methods)
    expect(Object.keys(apiclient).sort()).toEqual(methods)
  })
})

describe('apimock', () => {
  it('getByAuthor filtra por autor y devuelve [] si no hay planos', async () => {
    const items = await apimock.getByAuthor('Sebastian')
    expect(items.length).toBeGreaterThan(0)
    expect(items.every((b) => b.author === 'Sebastian')).toBe(true)
    await expect(apimock.getByAuthor('nadie')).resolves.toEqual([])
  })

  it('getByAuthorAndName lanza 404 si no existe', async () => {
    await expect(apimock.getByAuthorAndName('nadie', 'x')).rejects.toMatchObject({ status: 404 })
  })

  it('create agrega el plano y rechaza duplicados con 409', async () => {
    const nuevo = { author: 'tester', name: 'mock-create', points: [{ x: 1, y: 1 }] }
    await expect(apimock.create(nuevo)).resolves.toEqual(nuevo)
    await expect(apimock.getByAuthorAndName('tester', 'mock-create')).resolves.toEqual(nuevo)
    await expect(apimock.create(nuevo)).rejects.toMatchObject({ status: 409 })
  })

  it('update reemplaza los puntos y remove lo elimina', async () => {
    await apimock.create({ author: 'tester', name: 'crud', points: [] })
    const puntos = [{ x: 5, y: 5 }]
    await expect(apimock.update('tester', 'crud', puntos)).resolves.toEqual({
      author: 'tester',
      name: 'crud',
      points: puntos,
    })
    await expect(apimock.getByAuthorAndName('tester', 'crud')).resolves.toMatchObject({
      points: puntos,
    })
    await apimock.remove('tester', 'crud')
    await expect(apimock.getByAuthorAndName('tester', 'crud')).rejects.toMatchObject({
      status: 404,
    })
  })

  it('update y remove lanzan 404 si el plano no existe', async () => {
    await expect(apimock.update('nadie', 'x', [])).rejects.toMatchObject({ status: 404 })
    await expect(apimock.remove('nadie', 'x')).rejects.toMatchObject({ status: 404 })
  })
})

describe('blueprintsApiClient (API real via axios)', () => {
  beforeEach(() => vi.resetAllMocks())

  it('getAll desenvuelve el ApiResponse del backend', async () => {
    api.get.mockResolvedValue(ok([bp]))
    await expect(apiclient.getAll()).resolves.toEqual([bp])
    expect(api.get).toHaveBeenCalledWith('/api/v1/blueprints')
  })

  it('getByAuthor codifica el autor en la URL', async () => {
    api.get.mockResolvedValue(ok([bp]))
    await expect(apiclient.getByAuthor('juan perez')).resolves.toEqual([bp])
    expect(api.get).toHaveBeenCalledWith('/api/v1/blueprints/juan%20perez')
  })

  it('getByAuthor devuelve [] cuando el backend responde 404 (igual que el mock)', async () => {
    api.get.mockRejectedValue(httpError(404))
    await expect(apiclient.getByAuthor('nadie')).resolves.toEqual([])
  })

  it('getByAuthor propaga los demás errores', async () => {
    api.get.mockRejectedValue(httpError(401))
    await expect(apiclient.getByAuthor('john')).rejects.toThrow('status 401')
  })

  it('getByAuthorAndName pide /{author}/{name}', async () => {
    api.get.mockResolvedValue(ok(bp))
    await expect(apiclient.getByAuthorAndName('john', 'house')).resolves.toEqual(bp)
    expect(api.get).toHaveBeenCalledWith('/api/v1/blueprints/john/house')
  })

  it('create hace POST con el payload', async () => {
    api.post.mockResolvedValue({ data: { code: 201, message: 'Created', data: bp } })
    await expect(apiclient.create(bp)).resolves.toEqual(bp)
    expect(api.post).toHaveBeenCalledWith('/api/v1/blueprints', bp)
  })

  it('update hace PUT /{author}/{name} con los puntos', async () => {
    api.put.mockResolvedValue(ok(bp))
    await expect(apiclient.update('john', 'house', bp.points)).resolves.toEqual(bp)
    expect(api.put).toHaveBeenCalledWith('/api/v1/blueprints/john/house', { points: bp.points })
  })

  it('remove hace DELETE /{author}/{name}', async () => {
    api.delete.mockResolvedValue(ok(null))
    await expect(apiclient.remove('juan perez', 'house')).resolves.toBeUndefined()
    expect(api.delete).toHaveBeenCalledWith('/api/v1/blueprints/juan%20perez/house')
  })
})
