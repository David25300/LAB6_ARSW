import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  getBlueprint,
  HTTP_UNAUTHORIZED,
  HTTP_UNREACHABLE,
  listByAuthor,
  login,
  updateBlueprint,
} from '../src/lib/api.js'
import { clearToken, getToken, setToken, usernameOf } from '../src/lib/session.js'
import { jsonResponse } from './fakes.js'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  clearToken()
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

describe('api', () => {
  it('lists the blueprints of an author sending the bearer token', async () => {
    setToken('abc')
    const blueprints = [{ author: 'john', name: 'house', points: [] }]
    fetchMock.mockResolvedValue(jsonResponse(200, { code: 200, data: blueprints }))

    await expect(listByAuthor('john')).resolves.toEqual(blueprints)

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/api\/v1\/blueprints\/john$/)
    expect(options.headers.Authorization).toBe('Bearer abc')
  })

  it('treats an author without blueprints as an empty list', async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { code: 404, message: 'No blueprints' }))

    await expect(listByAuthor('nobody')).resolves.toEqual([])
  })

  it('closes the session when the backend answers 401', async () => {
    setToken('expired')
    fetchMock.mockResolvedValue(jsonResponse(401, null))

    const error = await getBlueprint({ author: 'john', name: 'house' }).catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(HTTP_UNAUTHORIZED)
    expect(getToken()).toBeNull()
  })

  it('reports an unreachable backend', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    const error = await getBlueprint({ author: 'john', name: 'house' }).catch((e) => e)

    expect(error.status).toBe(HTTP_UNREACHABLE)
  })

  it('replaces the points of a blueprint with PUT', async () => {
    const points = [{ x: 1, y: 2 }]
    fetchMock.mockResolvedValue(
      jsonResponse(200, { data: { author: 'john', name: 'house', points } }),
    )

    await updateBlueprint({ author: 'john', name: 'house', points })

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/api\/v1\/blueprints\/john\/house$/)
    expect(options.method).toBe('PUT')
    expect(JSON.parse(options.body)).toEqual({ points })
  })

  it('stores the token after a successful login', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { access_token: 'new-token' }))

    await login('student', 'student123')

    expect(getToken()).toBe('new-token')
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined()
  })

  it('explains wrong credentials', async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { error: 'invalid_credentials' }))

    await expect(login('student', 'nope')).rejects.toThrow('Usuario o contraseña incorrectos.')
  })
})

describe('session', () => {
  it('reads the user name from the JWT subject', () => {
    const payload = btoa(JSON.stringify({ sub: 'student' })).replace(/=+$/, '')

    expect(usernameOf(`header.${payload}.signature`)).toBe('student')
    expect(usernameOf('not-a-jwt')).toBeNull()
  })
})
