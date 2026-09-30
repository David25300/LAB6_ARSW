import { describe, it, expect, beforeEach } from 'vitest'
import { AxiosError } from 'axios'
import api from '../src/services/apiClient.js'

// Adapter falso: responde sin red pero pasando por los interceptores reales
const respond =
  (status, data = null) =>
  (config) => {
    const response = { data, status, statusText: '', headers: {}, config }
    if (status < 400) return Promise.resolve(response)
    return Promise.reject(
      new AxiosError(
        `Request failed with status code ${status}`,
        'ERR_BAD_RESPONSE',
        config,
        null,
        response,
      ),
    )
  }

describe('apiClient (axios + interceptores JWT)', () => {
  beforeEach(() => localStorage.clear())

  it('agrega Authorization: Bearer <token> cuando hay sesión', async () => {
    localStorage.setItem('token', 'abc.def.ghi')
    const res = await api.get('/api/v1/blueprints', { adapter: respond(200) })
    expect(res.config.headers.Authorization).toBe('Bearer abc.def.ghi')
  })

  it('no manda Authorization sin token', async () => {
    const res = await api.get('/api/v1/blueprints', { adapter: respond(200) })
    expect(res.config.headers.Authorization).toBeUndefined()
  })

  it('un 401 borra el token y deja un mensaje entendible', async () => {
    localStorage.setItem('token', 'vencido')
    await expect(api.get('/api/v1/blueprints', { adapter: respond(401) })).rejects.toThrow(
      'No autorizado',
    )
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('usa el mensaje del ApiResponse del backend en otros errores', async () => {
    const body = { code: 400, message: 'Blueprint already exists', data: null }
    await expect(
      api.post('/api/v1/blueprints', {}, { adapter: respond(400, body) }),
    ).rejects.toThrow('Blueprint already exists')
  })
})
