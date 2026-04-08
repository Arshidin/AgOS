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

  return (
    <div className="page space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <KpiCard label="NPV" value={fmt(results.wacc?.npv)} suffix="тыс. тг" />
        <KpiCard label="IRR" value={fmtPct(results.wacc?.irr)} />
        <KpiCard label="WACC" value={fmtPct(results.wacc?.wacc)} />
        <KpiCard label="Payback" value={fmt(results.wacc?.payback_years)} suffix="лет" />
        <KpiCard label="CAPEX итого" value={fmt(results.capex?.grand_total)} suffix="тг" />
        <KpiCard label="Стоимость скота" value={fmt(results.input?.livestock_purchase_cost)} suffix="тыс. тг" />
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
  )
}
