const withoutTrailingSlash = (url) => url.replace(/\/$/, '')

const env = import.meta.env

export const API_BASE = withoutTrailingSlash(env.VITE_API_BASE ?? 'http://localhost:8080')
export const STOMP_BASE = withoutTrailingSlash(env.VITE_STOMP_BASE ?? API_BASE)
export const IO_BASE = withoutTrailingSlash(env.VITE_IO_BASE ?? 'http://localhost:3001')
