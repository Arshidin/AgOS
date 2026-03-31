/**
 * M06 — KPI эксперта
 * Dok 6 Slice 6a: /admin/expert/kpi
 * Data: expert_profiles + aggregated vet_cases.
 */
import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export function ExpertKpi() {
  const { userContext } = useAuth()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userContext?.user_id) return
    supabase.from('expert_profiles').select('total_consultations, avg_response_minutes')
      .eq('user_id', userContext.user_id).single()
      .then(({ data }) => { setStats(data); setLoading(false) })
  }, [userContext?.user_id])

  if (loading) return <div className="p-6"><Skeleton className="h-8 w-32 mb-4" /><Skeleton className="h-32 w-full" /></div>

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Мои показатели</h1>
      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="p-5 text-center">
          <div className="text-3xl font-bold">{stats?.total_consultations || 0}</div>
          <div className="text-sm text-muted-foreground">Консультаций</div>
        </CardContent></Card>
        <Card><CardContent className="p-5 text-center">
          <div className="text-3xl font-bold">{stats?.avg_response_minutes || '—'}</div>
          <div className="text-sm text-muted-foreground">Ср. время ответа (мин)</div>
        </CardContent></Card>
      </div>
    </div>
  )
}
