import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import Index from '@/pages/landing/Index'

/**
 * Shows the landing page for unauthenticated visitors.
 * Redirects authenticated users to /cabinet.
 */
export function PublicLanding() {
  const { session, loading } = useAuth()

  if (loading) {
    return null
  }

  if (session) {
    return <Navigate to="/cabinet" replace />
  }

  return <Index />
}
