/**
 * Hook: redirects non-admin users away from admin-only pages.
 * Used inside A-series pages that require fn_is_admin().
 * RequireExpert is the outer gate (expert OR admin).
 * This hook is the inner gate (admin ONLY).
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export function useAdminGuard(): { isAdmin: boolean | null; checking: boolean } {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.rpc('fn_is_admin').then(({ data }) => {
      const admin = !!data
      setIsAdmin(admin)
      setChecking(false)
      if (!admin) {
        toast.error('Только для администраторов')
        navigate('/admin')
      }
    })
  }, [navigate])

  return { isAdmin, checking }
}
