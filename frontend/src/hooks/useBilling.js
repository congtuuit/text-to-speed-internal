import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../config'

/**
 * Fetches the current user's billing info (plan + usage).
 * Returns { billing, loading, refresh }.
 */
export function useBilling(authToken) {
  const [billing, setBilling] = useState(null)
  const [loading, setLoading] = useState(false)

  const refresh = () => {
    if (!authToken) return
    setLoading(true)
    fetch(`${API_BASE_URL}/api/billing/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then(r => r.json())
      .then(d => setBilling(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    refresh()
  }, [authToken])

  return { billing, loading, refresh }
}
