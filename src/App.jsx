import BlueprintWorkspace from './components/BlueprintWorkspace.jsx'
import LoginForm from './components/LoginForm.jsx'
import { useSessionToken } from './hooks/useSessionToken.js'
import { logout } from './lib/api.js'
import { usernameOf } from './lib/session.js'

export default function App() {
  const token = useSessionToken()

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1>BluePrints en tiempo real</h1>
          <p className="muted">CRUD de planos y colaboración en vivo con Socket.IO o STOMP</p>
        </div>
        {token && (
          <div className="session">
            <span>{usernameOf(token) ?? 'Sesión activa'}</span>
            <button type="button" className="button" onClick={logout}>
              Cerrar sesión
            </button>
          </div>
        )}
      </header>
      {token ? <BlueprintWorkspace token={token} /> : <LoginForm />}
    </div>
  )
}
