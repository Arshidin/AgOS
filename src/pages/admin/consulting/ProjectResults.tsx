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
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-4">
      <p className="text-sm text-[var(--color-text-muted)]">{label}</p>
      <p className="mt-1 font-mono text-xl font-semibold text-[var(--color-text-primary)]">
        {value} {suffix && <span className="text-sm font-normal text-[var(--color-text-muted)]">{suffix}</span>}
      </p>
    </div>
  )
}

function MonthlyTable({ data, groups }: { data: any; groups: string[] }) {
  if (!data) return null
  const firstGroup = groups[0]
  const months = Math.min(24, firstGroup ? (data[firstGroup]?.length || 0) : 0)
  if (months === 0) return <p className="text-sm text-[var(--color-text-muted)]">Нет данных</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            <th className="sticky left-0 bg-[var(--color-surface-card)] px-2 py-1.5 text-left font-medium text-[var(--color-text-muted)]">Группа</th>
            {Array.from({ length: months }, (_, i) => (
              <th key={i} className="px-2 py-1.5 text-right font-medium text-[var(--color-text-muted)]">М{i + 1}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map(g => (
            <tr key={g} className="border-b border-[var(--color-border)]/50">
              <td className="sticky left-0 bg-[var(--color-surface-card)] px-2 py-1 text-[var(--color-text-secondary)]">{g}</td>
              {data[g]?.slice(0, months).map((v: number, i: number) => (
                <td key={i} className={`px-2 py-1 text-right ${v < 0 ? 'text-red-400' : 'text-[var(--color-text-primary)]'}`}>
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
      // Load project
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

      // Load latest version if exists
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
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/consulting')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
              {project?.name || 'Проект'}
            </h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              {version ? `Версия ${version.version_number} · ${new Date(version.calculated_at).toLocaleDateString('ru-RU')}` : 'Расчёт не выполнен'}
            </p>
          </div>
        </div>
        <Button
          onClick={() => navigate(`/admin/consulting/${projectId}`, { state: { edit: true } })}
          variant="outline"
          className="gap-2"
        >
          <Calculator className="h-4 w-4" /> Пересчитать
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-[var(--color-surface-base)] p-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-[var(--color-surface-card)] text-[var(--color-text-primary)] shadow-sm'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
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
            <Calculator className="mb-4 h-12 w-12 text-[var(--color-text-muted)]" />
            <p className="text-[var(--color-text-secondary)]">Нажмите "Пересчитать" для запуска расчёта.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary tab */}
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
                  <div><span className="text-[var(--color-text-muted)]">Поголовье:</span> {results.input?.initial_cows}</div>
                  <div><span className="text-[var(--color-text-muted)]">Мощность:</span> {results.input?.reproducer_capacity}</div>
                  <div><span className="text-[var(--color-text-muted)]">Быки:</span> {results.input?.initial_bulls}</div>
                  <div><span className="text-[var(--color-text-muted)]">Отёл:</span> {results.input?.calving_scenario}</div>
                  <div><span className="text-[var(--color-text-muted)]">Пастбища:</span> {results.input?.pasture_area} га</div>
                  <div><span className="text-[var(--color-text-muted)]">Собств.:</span> {(results.input?.equity_share * 100)?.toFixed(0)}%</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Herd tab */}
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

          {/* P&L tab */}
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

          {/* Cash Flow tab */}
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

          {/* CAPEX tab */}
          {activeTab === 'capex' && (
            <div className="space-y-4">
              {['farm', 'pasture', 'equipment', 'tools'].map(block => {
                const data = results.capex?.[block]
                if (!data?.items?.length) return null
                return (
                  <Card key={block}>
                    <CardHeader>
                      <CardTitle className="capitalize">
                        {block === 'farm' ? 'Основная ферма' : block === 'pasture' ? 'Пастбища' : block === 'equipment' ? 'Техника' : 'Инструменты'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <table className="w-full text-sm">
                        <tbody>
                          {data.items.map((item: any, i: number) => (
                            <tr key={i} className="border-b border-[var(--color-border)]/30">
                              <td className="py-1.5 text-[var(--color-text-secondary)]">{item.name || item.code}</td>
                              <td className="py-1.5 text-right font-mono text-[var(--color-text-primary)]">
                                {fmt(item.cost)} тг
                              </td>
                            </tr>
                          ))}
                          <tr className="font-medium">
                            <td className="py-2 text-[var(--color-text-primary)]">Итого</td>
                            <td className="py-2 text-right font-mono text-[var(--color-text-primary)]">
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
