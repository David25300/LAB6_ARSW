const TOKEN_KEY = 'token'
const listeners = new Set()

let currentToken = readStoredToken()

export const getToken = () => currentToken

export function setToken(token) {
  currentToken = token
  persist(token)
  listeners.forEach((listener) => listener(token))
}

export function clearToken() {
  setToken(null)
}

export function onTokenChange(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function usernameOf(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(payload)).sub ?? null
  } catch {
    return null
  }
}

function readStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function persist(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch (error) {
    console.warn('[session] el navegador no permite guardar la sesión', error)
  }
}
