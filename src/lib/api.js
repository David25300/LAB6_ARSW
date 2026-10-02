import { API_BASE } from '../config.js'
import { clearToken, getToken, setToken } from './session.js'

export const HTTP_UNREACHABLE = 0
export const HTTP_UNAUTHORIZED = 401
export const HTTP_NOT_FOUND = 404

const BLUEPRINTS_PATH = '/api/v1/blueprints'

export class ApiError extends Error {
  constructor(message, status = HTTP_UNREACHABLE) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const authorPath = (author) => `${BLUEPRINTS_PATH}/${encodeURIComponent(author)}`
const blueprintPath = (author, name) => `${authorPath(author)}/${encodeURIComponent(name)}`

async function request(path, { method = 'GET', body, authenticated = true } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (authenticated && token) headers.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(`No se pudo conectar con el backend (${API_BASE}).`)
  }

  const json = await response.json().catch(() => null)
  if (response.ok) return json
  if (response.status === HTTP_UNAUTHORIZED && authenticated) {
    clearToken()
    throw new ApiError('Tu sesión expiró: inicia sesión de nuevo.', HTTP_UNAUTHORIZED)
  }
  throw new ApiError(
    json?.message ?? json?.error ?? `Error HTTP ${response.status}`,
    response.status,
  )
}

export async function login(username, password) {
  try {
    const { access_token: accessToken } = await request('/auth/login', {
      method: 'POST',
      body: { username, password },
      authenticated: false,
    })
    setToken(accessToken)
  } catch (error) {
    if (error.status === HTTP_UNAUTHORIZED) {
      throw new ApiError('Usuario o contraseña incorrectos.', HTTP_UNAUTHORIZED)
    }
    throw error
  }
}

export const logout = clearToken

export async function listByAuthor(author) {
  try {
    const { data } = await request(authorPath(author))
    return data ?? []
  } catch (error) {
    if (error.status === HTTP_NOT_FOUND) return []
    throw error
  }
}

export async function getBlueprint({ author, name }) {
  const { data } = await request(blueprintPath(author, name))
  return data
}

export async function createBlueprint({ author, name, points }) {
  const { data } = await request(BLUEPRINTS_PATH, {
    method: 'POST',
    body: { author, name, points },
  })
  return data
}

export async function updateBlueprint({ author, name, points }) {
  const { data } = await request(blueprintPath(author, name), { method: 'PUT', body: { points } })
  return data
}

export async function deleteBlueprint({ author, name }) {
  await request(blueprintPath(author, name), { method: 'DELETE' })
}
