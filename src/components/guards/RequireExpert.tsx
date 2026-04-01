/**
 * Guard: allows experts OR admins to access /admin/* routes.
 * Reads from AuthContext (loaded once at login). Zero RPC calls.
 */
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'

export function RequireExpert() {
  const { session, loading, isContextLoading, isAdmin, isExpert } = useAuth()

  if (loading || isContextLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />
  if (!isAdmin && !isExpert) return <Navigate to="/cabinet" replace />

  return <Outlet />
}
