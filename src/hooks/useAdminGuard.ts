/**
 * Hook: checks admin role from AuthContext (0 RPC calls).
 * Used inside A-series pages for inner admin-only gate.
 */
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useEffect } from 'react'
import { toast } from 'sonner'

export function useAdminGuard(): { isAdmin: boolean; checking: boolean } {
  const { isAdmin, isContextLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isContextLoading && !isAdmin) {
      toast.error('Только для администраторов')
      navigate('/admin')
    }
  }, [isAdmin, isContextLoading, navigate])

  return { isAdmin, checking: isContextLoading }
}
