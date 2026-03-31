/**
 * FIX S-2: RequireExpert guard for M-series screens.
 * Checks fn_is_expert() OR fn_is_admin() (admins can also access expert screens).
 */
import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

export function RequireExpert() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    if (loading) return
    if (!session) { navigate('/login'); return }

    Promise.all([
      supabase.rpc('fn_is_expert'),
      supabase.rpc('fn_is_admin'),
    ]).then(([expertRes, adminRes]) => {
      if (expertRes.data || adminRes.data) {
        setAllowed(true)
      } else {
        toast.error('Доступ только для экспертов')
        navigate('/cabinet')
      }
      setChecking(false)
    })
  }, [session, loading, navigate])

  if (loading || checking) return null
  return allowed ? <Outlet /> : null
}
