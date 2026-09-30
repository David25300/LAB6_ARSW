import axios from 'axios'

const api = axios.create({
  // El backend (Lab 4) expone /auth/login y /api/v1/blueprints, por eso la base NO lleva /api
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  timeout: 8000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      // Token vencido o invalido: lo borramos para que PrivateRoute mande de nuevo a /login
      localStorage.removeItem('token')
      err.message = 'No autorizado: inicia sesión para continuar.'
    } else if (err.response?.data?.message) {
      // El backend envuelve los errores en ApiResponse { code, message, data }:
      // usamos su mensaje para que la UI muestre algo entendible
      err.message = err.response.data.message
    }
    return Promise.reject(err)
  },
)

export default api
