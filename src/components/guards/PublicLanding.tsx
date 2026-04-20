import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import Landing from '@/pages/public/Landing'

export function PublicLanding() {
  const { session, loading } = useAuth()

  if (loading) {
    return null
  }

  if (session) {
    return <Navigate to="/cabinet" replace />
  }

  return <Landing />
}
