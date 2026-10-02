import { useEffect, useState } from 'react'
import { isLoggedIn, login, logout, onAuthChange } from '../lib/api.js'

export default function LoginForm() {
  const [logged, setLogged] = useState(isLoggedIn())
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => onAuthChange(setLogged), [])

  async function submit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(username.trim(), password)
      setPassword('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (logged) {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <span>✅ Sesión iniciada</span>
        <button type="button" onClick={logout}>Cerrar sesión</button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
      <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="usuario" aria-label="usuario" />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="contraseña" aria-label="contraseña" />
      <button type="submit" disabled={loading || !username || !password}>
        {loading ? 'Entrando...' : 'Iniciar sesión'}
      </button>
      {error && <span style={{ color: '#b91c1c' }}>{error}</span>}
    </form>
  )
}
