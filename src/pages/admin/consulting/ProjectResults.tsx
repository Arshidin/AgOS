/**
 * ProjectResults — results display with 5 tabs
 * Route: /admin/consulting/:projectId
 * RPC: rpc_get_consulting_project, rpc_get_consulting_version
 */
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Calculator, TrendingUp, BarChart3, DollarSign, Wallet } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/ui/page-header'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

type TabId = 'summary' | 'herd' | 'pnl' | 'cashflow' | 'capex'

const TABS: { id: TabId; label: string; icon: typeof Calculator }[] = [
  { id: 'summary', label: 'Сводка', icon: TrendingUp },
  { id: 'herd', label: 'Оборот стада', icon: BarChart3 },
  { id: 'pnl', label: 'P&L', icon: DollarSign },
  { id: 'cashflow', label: 'Cash Flow', icon: Wallet },
  { id: 'capex', label: 'CAPEX', icon: Calculator },
]

function fmt(n: number | null | undefined, decimals = 0): string {
  if (n === null || n === undefined || isNaN(n)) return '—'
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: decimals }).format(n)
}

function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '—'
  return `${(n * 100).toFixed(1)}%`
}

function SummaryCard({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 font-mono text-xl font-semibold">
          {value} {suffix && <span className="text-sm font-normal text-muted-foreground">{suffix}</span>}
        </p>
      </CardContent>
    </Card>
  )
}

function MonthlyTable({ data, groups }: { data: any; groups: string[] }) {
  if (!data) return null
  const firstGroup = groups[0]
  const months = Math.min(24, firstGroup ? (data[firstGroup]?.length || 0) : 0)
  if (months === 0) return <p className="text-sm text-muted-foreground">Нет данных</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="border-b">
            <th className="sticky left-0 bg-card px-2 py-1.5 text-left font-medium text-muted-foreground">Группа</th>
            {Array.from({ length: months }, (_, i) => (
              <th key={i} className="px-2 py-1.5 text-right font-medium text-muted-foreground">М{i + 1}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map(g => (
            <tr key={g} className="border-b border-border/50">
              <td className="sticky left-0 bg-card px-2 py-1 text-muted-foreground">{g}</td>
              {data[g]?.slice(0, months).map((v: number, i: number) => (
                <td key={i} className={`px-2 py-1 text-right ${v < 0 ? 'text-red-400' : ''}`}>
                  {fmt(v, 1)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ProjectResults() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { organization } = useAuth()
  const [project, setProject] = useState<any>(null)
  const [version, setVersion] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('summary')

  const orgId = organization?.id

  useEffect(() => {
    if (!orgId || !projectId) return
    const load = async () => {
      setLoading(true)
      const { data: proj, error: projErr } = await supabase.rpc('rpc_get_consulting_project', {
        p_organization_id: orgId,
        p_project_id: projectId,
      })
      if (projErr) {
        toast.error('Ошибка загрузки проекта')
        navigate('/admin/consulting')
        return
      }
      setProject(proj)

      if (proj?.versions?.length > 0) {
        const latestId = proj.versions[0].id
        const { data: ver } = await supabase.rpc('rpc_get_consulting_version', {
          p_organization_id: orgId,
          p_version_id: latestId,
        })
        setVersion(ver)
      }
      setLoading(false)
    }
    load()
  }, [orgId, projectId])

  const results = version?.results || {}

  if (loading) {
    return (
      <div className="page space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  const subtitle = version
    ? `Версия ${version.version_number} · ${new Date(version.calculated_at).toLocaleDateString('ru-RU')}`
    : 'Расчёт не выполнен'

  return (
    <div className="page space-y-6">
      <PageHeader
        title={project?.name || 'Проект'}
        description={subtitle}
        actions={
          <Button
            onClick={() => navigate(`/admin/consulting/${projectId}`, { state: { edit: true } })}
            variant="outline"
            size="sm"
          >
            <Calculator className="mr-2 h-4 w-4" /> Пересчитать
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-lg bg-muted/50 p-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {!version ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Calculator className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Нажмите "Пересчитать" для запуска расчёта.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {activeTab === 'summary' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <SummaryCard label="NPV" value={fmt(results.wacc?.npv)} suffix="тыс. тг" />
                <SummaryCard label="IRR" value={fmtPct(results.wacc?.irr)} />
                <SummaryCard label="WACC" value={fmtPct(results.wacc?.wacc)} />
                <SummaryCard label="Payback" value={fmt(results.wacc?.payback_years)} suffix="лет" />
                <SummaryCard label="CAPEX итого" value={fmt(results.capex?.grand_total)} suffix="тг" />
                <SummaryCard label="Стоимость скота" value={fmt(results.input?.livestock_purchase_cost)} suffix="тыс. тг" />
              </div>
              <Card>
                <CardHeader><CardTitle>Параметры</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
                  <div><span className="text-muted-foreground">Поголовье:</span> {results.input?.initial_cows}</div>
                  <div><span className="text-muted-foreground">Мощность:</span> {results.input?.reproducer_capacity}</div>
                  <div><span className="text-muted-foreground">Быки:</span> {results.input?.initial_bulls}</div>
                  <div><span className="text-muted-foreground">Отёл:</span> {results.input?.calving_scenario}</div>
                  <div><span className="text-muted-foreground">Пастбища:</span> {results.input?.pasture_area} га</div>
                  <div><span className="text-muted-foreground">Собств.:</span> {(results.input?.equity_share * 100)?.toFixed(0)}%</div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'herd' && (
            <Card>
              <CardHeader><CardTitle>Оборот стада (помесячно)</CardTitle></CardHeader>
              <CardContent>
                <MonthlyTable
                  data={{
                    'Коровы': results.herd?.cows?.eop,
                    'Быки': results.herd?.bulls?.eop,
                    'Телята': results.herd?.calves?.eop,
                    'Тёлки': results.herd?.heifers?.eop,
                    'Бычки': results.herd?.steers?.eop,
                    'ИТОГО': results.herd?.total_avg_livestock,
                  }}
                  groups={['Коровы', 'Быки', 'Телята', 'Тёлки', 'Бычки', 'ИТОГО']}
                />
              </CardContent>
            </Card>
          )}

          {activeTab === 'pnl' && (
            <Card>
              <CardHeader><CardTitle>Отчёт о прибылях и убытках</CardTitle></CardHeader>
              <CardContent>
                <MonthlyTable
                  data={{
                    'Выручка': results.revenue?.total_revenue,
                    'Себестоимость': results.opex?.total_cogs,
                    'Вал. прибыль': results.pnl?.gross_profit,
                    'EBITDA': results.pnl?.ebitda,
                    'Чист. прибыль': results.pnl?.net_profit,
                  }}
                  groups={['Выручка', 'Себестоимость', 'Вал. прибыль', 'EBITDA', 'Чист. прибыль']}
                />
              </CardContent>
            </Card>
          )}

          {activeTab === 'cashflow' && (
            <Card>
              <CardHeader><CardTitle>Движение денежных средств</CardTitle></CardHeader>
              <CardContent>
                <MonthlyTable
                  data={{
                    'Операционная': results.cashflow?.cf_operations,
                    'Инвестиционная': results.cashflow?.cf_investing,
                    'Финансовая': results.cashflow?.cf_financing,
                    'Баланс ДС': results.cashflow?.cash_balance,
                  }}
                  groups={['Операционная', 'Инвестиционная', 'Финансовая', 'Баланс ДС']}
                />
              </CardContent>
            </Card>
          )}

          {activeTab === 'capex' && (
            <div className="space-y-4">
              {['farm', 'pasture', 'equipment', 'tools'].map(block => {
                const data = results.capex?.[block]
                if (!data?.items?.length) return null
                return (
                  <Card key={block}>
                    <CardHeader>
                      <CardTitle>
                        {block === 'farm' ? 'Основная ферма' : block === 'pasture' ? 'Пастбища' : block === 'equipment' ? 'Техника' : 'Инструменты'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <table className="w-full text-sm">
                        <tbody>
                          {data.items.map((item: any, i: number) => (
                            <tr key={i} className="border-b border-border/30">
                              <td className="py-1.5 text-muted-foreground">{item.name || item.code}</td>
                              <td className="py-1.5 text-right font-mono">{fmt(item.cost)} тг</td>
                            </tr>
                          ))}
                          <tr className="font-medium">
                            <td className="py-2">Итого</td>
                            <td className="py-2 text-right font-mono">
                              {fmt(data.total || data.items.reduce((s: number, i: any) => s + (i.cost || 0), 0))} тг
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                )
              })}
              <SummaryCard label="CAPEX Итого" value={fmt(results.capex?.grand_total)} suffix="тг" />
            </div>
          )}
        </>
      )}
    </div>
  )
}
