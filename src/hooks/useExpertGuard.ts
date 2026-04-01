/**
 * Hook: checks expert role from AuthContext (0 RPC calls).
 * Used inside M-series pages for inner expert-only gate.
 */
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useEffect } from 'react'
import { toast } from 'sonner'

export function useExpertGuard(): { isExpert: boolean; checking: boolean } {
  const { isExpert, isContextLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isContextLoading && !isExpert) {
      toast.error('Только для экспертов')
      navigate('/expert')
    }
  }, [isExpert, isContextLoading, navigate])

  return { isExpert, checking: isContextLoading }
}
