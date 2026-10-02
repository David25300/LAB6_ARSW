import { useState } from 'react'
import { login } from '../lib/api.js'

export default function LoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(username.trim(), password)
    } catch (loginError) {
      setError(loginError.message)
      setSubmitting(false)
    }
  }

  return (
    <main className="login">
      <form className="card login__form" onSubmit={handleSubmit} aria-labelledby="login-title">
        <h2 id="login-title">Inicia sesión</h2>
        <label className="field">
          Usuario
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
          />
        </label>
        <label className="field">
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>
        <button
          type="submit"
          className="button button--primary"
          disabled={submitting || !username.trim() || !password}
        >
          {submitting ? 'Entrando…' : 'Entrar'}
        </button>
        {error && (
          <p role="alert" className="feedback feedback--error">
            {error}
          </p>
        )}
      </form>
    </main>
  )
}
