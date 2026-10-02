import { useEffect, useState } from 'react'
import { getToken, onTokenChange } from '../lib/session.js'

export function useSessionToken() {
  const [token, setToken] = useState(getToken)

  useEffect(() => onTokenChange(setToken), [])

  return token
}
