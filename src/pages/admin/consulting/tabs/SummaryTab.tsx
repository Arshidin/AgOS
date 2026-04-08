import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Calculator } from 'lucide-react'
import { useProjectData, fmt, fmtPct } from './usProjectData'

function KpiCard({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
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

export function SummaryTab() {
  const { results, version, loading } = useProjectData()

  if (loading) return <Skeleton className="h-48 w-full rounded-xl" />

  if (!version) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-12">
          <Calculator className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Перейдите на вкладку "Параметры" и запустите расчёт.</p>
        </CardContent>
      </Card>
    )
  }

  const wacc = results.wacc || {}
  const input = results.input || {}
  const capex = results.capex || {}
  const pnl = results.pnl || {}
  const cf = results.cashflow || {}

  // Year 10 net profit (annual sum)
  const netProfitY10 = pnl.net_profit?.slice(108, 120)?.reduce((a: number, b: number) => a + b, 0) || 0
  // Cash balance at month 120
  const cashFinal = cf.cash_balance?.[119] || cf.cash_balance?.[cf.cash_balance?.length - 1] || 0
  // Total revenue 10 years
  const totalRevenue10 = results.revenue?.total_revenue?.reduce((a: number, b: number) => a + b, 0) || 0

  return (
    <div className="page space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="NPV" value={fmt(wacc.npv, 0)} suffix="тыс. тг" />
        <KpiCard label="IRR" value={wacc.irr ? `${(wacc.irr * 100).toFixed(1)}%` : '—'} />
        <KpiCard label="WACC" value={fmtPct(wacc.wacc)} />
        <KpiCard label="Payback" value={wacc.payback_years ? `${wacc.payback_years}` : '—'} suffix="лет" />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="CAPEX итого" value={fmt((capex.grand_total || 0) / 1000, 0)} suffix="тыс. тг" />
        <KpiCard label="Стоимость скота" value={fmt(input.livestock_purchase_cost, 0)} suffix="тыс. тг" />
        <KpiCard label="Чистая прибыль (год 10)" value={fmt(netProfitY10, 0)} suffix="тыс. тг" />
        <KpiCard label="Денежные средства (год 10)" value={fmt(cashFinal, 0)} suffix="тыс. тг" />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <KpiCard label="Выручка за 10 лет" value={fmt(totalRevenue10, 0)} suffix="тыс. тг" />
        <KpiCard label="Собств. участие" value={`${((input.equity_share || 0) * 100).toFixed(0)}%`} />
        <KpiCard label="Горизонт" value="10" suffix="лет (120 мес)" />
      </div>

      {/* Parameters */}
      <Card>
        <CardHeader><CardTitle>Параметры проекта</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
          <div><span className="text-muted-foreground">Поголовье:</span> {input.initial_cows || '—'} голов</div>
          <div><span className="text-muted-foreground">Мощность:</span> {input.reproducer_capacity || '—'} голов</div>
          <div><span className="text-muted-foreground">Быки:</span> {input.initial_bulls || '—'} голов</div>
          <div><span className="text-muted-foreground">Отёл:</span> {input.calving_scenario || '—'}</div>
          <div><span className="text-muted-foreground">Пастбища:</span> {fmt(input.pasture_area, 0)} га</div>
          <div><span className="text-muted-foreground">Дата старта:</span> {input.project_start_date || '—'}</div>
        </CardContent>
      </Card>
    </div>
  )
}
