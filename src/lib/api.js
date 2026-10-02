// Capa REST del front (Lab 6) contra el backend Spring de lab5.
//  - Rutas /api/v1/blueprints/...
//  - El backend envuelve las respuestas en { code, message, data }: aqui se devuelve solo `data`.
//  - JWT: login en /auth/login, el token se guarda en localStorage y se manda en cada peticion.
//  - Todos los errores salen como ApiError con un mensaje legible para la UI.

export const API_BASE = (import.meta.env.VITE_API_BASE ?? 'http://localhost:8080').replace(/\/$/, '')

const TOKEN_KEY = 'token'

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.status = status // 0 = sin respuesta del servidor (red caida, backend apagado, CORS)
  }
}

// ---------- Token y sesion ----------

const listeners = new Set()
const notify = () => listeners.forEach((cb) => cb(isLoggedIn()))

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch (e) {
    console.warn('No se pudo guardar el token', e)
  }
  notify()
}

export function logout() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* sin storage: nada que borrar */
  }
  notify()
}

export const isLoggedIn = () => !!getToken()

/** Avisa cuando cambia la sesion (login, logout o token vencido). Devuelve la funcion para dejar de escuchar. */
export function onAuthChange(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

// ---------- Peticion base ----------

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (auth && token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(`No se pudo conectar con el backend (${API_BASE}). ¿Está corriendo?`, 0)
  }

  const json = await res.json().catch(() => null) // algunas respuestas de error pueden no traer JSON

  if (!res.ok) {
    if (res.status === 401 && auth) {
      logout() // token vencido o invalido: la UI vuelve a pedir login
      throw new ApiError('No autorizado: inicia sesión para continuar.', 401)
    }
    throw new ApiError(json?.message ?? json?.error ?? `Error HTTP ${res.status}`, res.status)
  }
  return json
}

// ---------- Autenticacion ----------

export async function login(username, password) {
  try {
    const json = await request('/auth/login', {
      method: 'POST',
      body: { username, password },
      auth: false,
    })
    setToken(json.access_token)
  } catch (e) {
    if (e.status === 401) throw new ApiError('Usuario o contraseña incorrectos.', 401)
    throw e
  }
}

// ---------- CRUD de planos ----------

/** Planos de un autor: [{ author, name, points }]. Un autor sin planos devuelve []. */
export async function listByAuthor(author) {
  try {
    const json = await request(`/api/v1/blueprints/${encodeURIComponent(author)}`)
    return json.data ?? []
  } catch (e) {
    if (e.status === 404) return []
    throw e
  }
}

/** Un plano: { author, name, points: [{x, y}] }. Lanza ApiError 404 si no existe. */
export async function getBlueprint(author, name) {
  const json = await request(
    `/api/v1/blueprints/${encodeURIComponent(author)}/${encodeURIComponent(name)}`,
  )
  return json.data
}

export async function createBlueprint({ author, name, points = [] }) {
  const json = await request('/api/v1/blueprints', { method: 'POST', body: { author, name, points } })
  return json.data
}

/** Reemplaza TODOS los puntos del plano (Save/Update). */
export async function updateBlueprint(author, name, points) {
  const json = await request(
    `/api/v1/blueprints/${encodeURIComponent(author)}/${encodeURIComponent(name)}`,
    { method: 'PUT', body: { points } },
  )
  return json.data
}

export async function deleteBlueprint(author, name) {
  await request(`/api/v1/blueprints/${encodeURIComponent(author)}/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  })
}
