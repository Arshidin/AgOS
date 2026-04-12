/**
 * M06 — KPI эксперта
 * Dok 6 Slice 6a: /admin/expert/kpi
 * RPC: rpc_get_expert_kpi
 */
import { BarChart3 } from 'lucide-react'
import { useSetTopbar } from '@/components/layout/TopbarContext'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import { useExpertGuard } from '@/hooks/useExpertGuard'
import { useRpc } from '@/hooks/useRpc'

interface ExpertKpiData {
  total_consultations: number
  avg_response_minutes: number | null
}

export function ExpertKpi() {
  const { isExpert, checking: expertChecking } = useExpertGuard()
  const { organization } = useAuth()
  useSetTopbar({ title: 'Показатели эксперта', titleIcon: <BarChart3 size={15} /> })

  const { data: stats, isLoading: loading } = useRpc<ExpertKpiData>(
    'rpc_get_expert_kpi',
    { p_organization_id: organization?.id },
    { enabled: !!organization?.id && isExpert }
  )

  if (expertChecking) return <div className="page">Проверка доступа...</div>
  if (!isExpert) return null
  if (loading) return <div className="page"><Skeleton className="h-8 w-32 mb-4" /><Skeleton className="h-32 w-full" /></div>

  return (
    <div className="page space-y-6">
      <h1 className="text-2xl font-semibold">Мои показатели</h1>
      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="p-5 text-center">
          <div className="text-3xl font-bold">{stats?.total_consultations ?? 0}</div>
          <div className="text-sm text-muted-foreground">Консультаций</div>
        </CardContent></Card>
        <Card><CardContent className="p-5 text-center">
          <div className="text-3xl font-bold">{stats?.avg_response_minutes ?? '—'}</div>
          <div className="text-sm text-muted-foreground">Ср. время ответа (мин)</div>
        </CardContent></Card>
      </div>
    </div>
  )
}
