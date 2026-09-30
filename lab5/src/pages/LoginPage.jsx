import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../services/apiClient.js'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { username, password })
      localStorage.setItem('token', data.access_token)
      // Volvemos a la ruta protegida que nos mando aqui (PrivateRoute), o al inicio
      navigate(location.state?.from?.pathname || '/', { replace: true })
    } catch {
      setError('Credenciales inválidas o servidor no disponible')
      setLoading(false)
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2 style={{ marginTop: 0 }}>Login</h2>
      {location.state?.from && (
        <p className="muted">Inicia sesión para continuar a {location.state.from.pathname}.</p>
      )}
      <div className="grid cols-2">
        <div>
          <label htmlFor="login-user">Usuario</label>
          <input
            id="login-user"
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="login-password">Contraseña</label>
          <input
            id="login-password"
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn primary" style={{ marginTop: 12 }} disabled={loading}>
        {loading ? 'Ingresando...' : 'Ingresar'}
      </button>
    </form>
  )
}
