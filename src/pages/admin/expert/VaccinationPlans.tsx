/**
 * M03 — Планы вакцинации
 * Dok 6 Slice 6a: /admin/expert/vaccination
 * RPC: rpc_list_vaccination_plans (READ), rpc_create_vaccination_plan (RPC-29)
 */
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useExpertGuard } from '@/hooks/useExpertGuard'
import { useAuth } from '@/hooks/useAuth'
import { useRpc } from '@/hooks/useRpc'

interface VacPlan {
  id: string; name: string; plan_year: number; status: string
  farm_id: string; organization_id: string; created_at: string
}

const STATUS_LABELS: Record<string, string> = {
  pending_review: 'На проверке', active: 'Активен', completed: 'Завершён', expired: 'Истёк',
}

export function VaccinationPlans() {
  const { isExpert, checking: expertChecking } = useExpertGuard()
  const navigate = useNavigate()
  const { organization } = useAuth()

  const { data: plans = [], isLoading: loading } = useRpc<VacPlan[]>(
    'rpc_list_vaccination_plans',
    { p_organization_id: organization?.id },
    { enabled: !!organization?.id && isExpert }
  )

  if (expertChecking) return <div className="page">Проверка доступа...</div>
  if (!isExpert) return null

  return (
    <div className="page space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Планы вакцинации</h1>
        <Button><Plus className="mr-2 h-4 w-4" />Создать план</Button>
      </div>
      {loading ? <Skeleton className="h-32 w-full" /> : plans.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Нет планов вакцинации</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {plans.map(p => (
            <Card key={p.id} className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate(`/admin/expert/vaccination/${p.id}/record`)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-sm text-muted-foreground">{p.plan_year}</div>
                </div>
                <Badge variant={p.status === 'active' ? 'default' : 'secondary'}>{STATUS_LABELS[p.status] || p.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
