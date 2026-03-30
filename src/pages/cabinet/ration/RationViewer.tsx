/**
 * F17 — Просмотр рациона (Ration Viewer)
 * Dok 6 Slice 3: /cabinet/ration
 * RPC: rpc_get_current_ration (RPC-24) — D-S3-2 farm-level return
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calculator, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import { useRpc } from '@/hooks/useRpc'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface RationItem {
  feed_item_id: string
  feed_item_code: string
  quantity_kg_per_day: number
  effective_price_per_kg: number
  cost_per_day: number
}

interface RationVersion {
  version_id: string
  version_number: number
  items: RationItem[]
  results: {
    total_cost_per_day: number
    total_cost_per_month: number
    total_dm_kg: number
    nutrient_values: Record<string, number>
    nutrient_requirements: Record<string, number>
    nutrients_met: Record<string, boolean>
    deficiencies: string[]
    solver_status: string
  }
  calculated_by: string
  created_at: string
}

interface RationData {
  ration_id: string
  herd_group_id: string | null
  animal_category_code: string
  animal_category_name_ru: string
  breed_name_ru: string | null
  avg_weight_kg: number
  head_count: number
  objective: string
  status: string
  current_version: RationVersion | null
  version_count: number
}

const OBJECTIVE_LABELS: Record<string, string> = {
  maintenance: 'Поддержание', growth: 'Рост', finishing: 'Откорм',
  breeding: 'Случка', gestation: 'Стельность', lactation: 'Лактация',
}

export function RationViewer() {
  const navigate = useNavigate()
  const { organization, farm } = useAuth()
  const [calculating, setCalculating] = useState(false)

  const { data: rations, isLoading, refetch } = useRpc<RationData[]>(
    'rpc_get_current_ration',
    { p_organization_id: organization?.id, p_farm_id: farm?.id },
    { enabled: !!organization?.id && !!farm?.id },
  )

  async function handleCalculate() {
    if (!organization?.id || !farm?.id) return
    setCalculating(true)
    try {
      // Get first herd group for demo calculation
      const { data: summary } = await supabase.rpc('rpc_get_farm_summary', {
        p_organization_id: organization.id,
        p_farm_id: farm.id,
      })
      const groups = summary?.herd_groups || []
      if (groups.length === 0) {
        toast.error('Сначала добавьте группы скота')
        return
      }

      const group = groups[0]
      const { error } = await supabase.functions.invoke('calculate-ration', {
        body: {
          organization_id: organization.id,
          farm_id: farm.id,
          herd_group_id: group.id,
          animal_category_id: group.animal_category_id,
          breed_id: group.breed_id,
          avg_weight_kg: group.avg_weight_kg || 300,
          head_count: group.head_count || 1,
        },
      })
      if (error) throw error
      toast.success('Рацион рассчитан')
      refetch()
    } catch (err: any) {
      toast.error(err.message || 'Ошибка расчёта')
    } finally {
      setCalculating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  const activeRations = rations || []

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Рацион кормления</h1>
        <Button onClick={handleCalculate} disabled={calculating}>
          {calculating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Calculator className="mr-2 h-4 w-4" />
          )}
          Рассчитать рацион
        </Button>
      </div>

      {activeRations.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">
              Добавьте группы и корма для расчёта рациона
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate('/cabinet/herd')}>
                Группы
              </Button>
              <Button variant="outline" onClick={() => navigate('/cabinet/feed')}>
                Корма
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {activeRations.map((ration) => (
            <Card key={ration.ration_id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {ration.animal_category_name_ru}
                    {ration.breed_name_ru && (
                      <span className="text-muted-foreground font-normal text-sm ml-2">
                        {ration.breed_name_ru}
                      </span>
                    )}
                  </CardTitle>
                  <Badge variant={ration.status === 'active' ? 'default' : 'secondary'}>
                    {ration.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {ration.head_count} гол. · {ration.avg_weight_kg} кг · {OBJECTIVE_LABELS[ration.objective] || ration.objective}
                </p>
              </CardHeader>
              <CardContent>
                {ration.current_version ? (
                  <div className="space-y-4">
                    {/* Feed table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="pb-2">Корм</th>
                            <th className="pb-2 text-right">кг/день</th>
                            <th className="pb-2 text-right">₸/день</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ration.current_version.items.map((item, i) => (
                            <tr key={i} className="border-b border-border/50">
                              <td className="py-2">{item.feed_item_code}</td>
                              <td className="py-2 text-right">{item.quantity_kg_per_day}</td>
                              <td className="py-2 text-right">{item.cost_per_day} ₸</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="font-medium">
                            <td className="pt-2">Итого</td>
                            <td className="pt-2 text-right">
                              {ration.current_version.results.total_dm_kg} кг СВ
                            </td>
                            <td className="pt-2 text-right">
                              {ration.current_version.results.total_cost_per_day} ₸
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Nutrient status */}
                    {ration.current_version.results.deficiencies?.length > 0 && (
                      <div className="rounded-md bg-destructive/10 p-3 text-sm">
                        <span className="font-medium">Дефицит: </span>
                        {ration.current_version.results.deficiencies.join(', ')}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        v{ration.current_version.version_number}
                      </Badge>
                      <span>
                        {new Date(ration.current_version.created_at).toLocaleDateString('ru-RU')}
                      </span>
                      <span>·</span>
                      <span>{ration.current_version.results.solver_status}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Нет рассчитанных версий</p>
                )}
              </CardContent>
            </Card>
          ))}

          <Button variant="outline" className="w-full" onClick={() => navigate('/cabinet/ration/budget')}>
            Бюджет кормления →
          </Button>
        </div>
      )}
    </div>
  )
}
