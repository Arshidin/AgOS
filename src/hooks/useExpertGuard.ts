/**
 * Hook: checks expert role from AuthContext (0 RPC calls).
 * Used inside M-series pages for inner expert-only gate.
 */
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useEffect } from 'react'
import { toast } from 'sonner'

export function useExpertGuard(): { isExpert: boolean; checking: boolean } {
  const { isExpert, isAdmin, isContextLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isContextLoading && !isExpert && !isAdmin) {
      toast.error('Только для экспертов')
      navigate('/admin')
    }
  }, [isExpert, isAdmin, isContextLoading, navigate])

  return { isExpert: isExpert || isAdmin, checking: isContextLoading }
}
