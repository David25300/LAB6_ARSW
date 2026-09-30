import { Navigate, useLocation } from 'react-router-dom'

// Sin JWT en localStorage no se entra: se redirige a /login recordando a donde se queria ir.
// Si el token vence, el interceptor de apiClient lo borra al recibir un 401.
export default function PrivateRoute({ children }) {
  const location = useLocation()
  if (!localStorage.getItem('token')) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return children
}
