import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useProjectData, fmt } from './usProjectData'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

function toAnnual(arr: number[] | undefined, mode: 'sum' | 'last' = 'sum'): number[] {
  if (!arr || arr.length === 0) return []
  const years: number[] = []
  for (let yr = 0; yr < 10; yr++) {
    const start = yr * 12
    const end = Math.min((yr + 1) * 12, arr.length)
    if (start >= arr.length) break
    if (mode === 'sum') {
      years.push(arr.slice(start, end).reduce((a, b) => a + (b ?? 0), 0))
    } else {
      years.push(arr[end - 1] ?? 0)
    }
  }
  return years
}

interface PnlRow {
  label: string
  values: number[]
  bold?: boolean
  indent?: boolean
  separator?: boolean
}

export function PnlTab() {
  const { results, version, loading } = useProjectData()
  if (loading) return <Skeleton className="h-48 w-full rounded-xl" />
  if (!version) return <p className="page text-muted-foreground">Нет данных. Запустите расчёт.</p>

  const pnl = results.pnl || {}
  const revenue = results.revenue || {}
  const opex = results.opex || {}
  const loans = results.loans || {}

  const years = Math.min(10, Math.ceil((pnl.net_profit?.length || 0) / 12))
  if (years === 0) return <p className="page text-muted-foreground">Нет данных P&L.</p>

  // ============================================================
  // CHART DATA
  // ============================================================
  const annualRevenue = toAnnual(revenue.total_revenue)
  const annualCosts = toAnnual(opex.total_cogs)
  const annualNetProfit = toAnnual(pnl.net_profit)

  const chartData = Array.from({ length: years }, (_, i) => ({
    year: `Год ${i + 1}`,
    revenue: annualRevenue[i] ?? 0,
    costs: -(Math.abs(annualCosts[i] ?? 0)),
    netProfit: annualNetProfit[i] ?? 0,
  }))

  // ============================================================
  // TABLE ROWS
  // ============================================================
  const rows: PnlRow[] = [
    { label: 'Выручка от продажи КРС', values: toAnnual(revenue.livestock_revenue) },
    { label: 'Субсидии', values: toAnnual(revenue.subsidies) },
    { label: 'Итого выручка', values: toAnnual(revenue.total_revenue), bold: true },
    { label: '', values: [], separator: true },
    { label: 'Расходы на корма', values: toAnnual(opex.feed_cost), indent: true },
    { label: 'Себестоимость (репродуктор)', values: toAnnual(opex.cogs_reproducer), indent: true },
    { label: 'Себестоимость (доращивание)', values: toAnnual(opex.cogs_fattening), indent: true },
    { label: 'Итого себестоимость', values: toAnnual(opex.total_cogs), bold: true },
    { label: '', values: [], separator: true },
    { label: 'Валовая прибыль', values: toAnnual(pnl.gross_profit), bold: true },
    { label: 'Административные расходы', values: toAnnual(pnl.admin_expenses), indent: true },
    { label: 'EBITDA', values: toAnnual(pnl.ebitda), bold: true },
    { label: '', values: [], separator: true },
    { label: 'Амортизация', values: toAnnual(pnl.depreciation_monthly ? Array(120).fill(-pnl.depreciation_monthly) : []) },
    { label: 'EBIT', values: toAnnual(pnl.ebit), bold: true },
    { label: 'Процентные расходы', values: toAnnual(pnl.finance_costs || loans.total_interest?.map((v: number) => -v)) },
    { label: 'Прибыль до налогов', values: toAnnual(pnl.profit_before_tax) },
    { label: 'КПН (20%)', values: toAnnual(pnl.cit) },
    { label: 'Чистая прибыль', values: toAnnual(pnl.net_profit), bold: true },
  ]

  return (
    <div className="page space-y-4">
      {/* Revenue / Costs / Profit chart */}
      <Card>
        <CardHeader>
          <CardTitle>Выручка, расходы и прибыль</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} tickLine={false} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} className="text-muted-foreground" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: 12,
                }}
                formatter={(value: number) => fmt(value, 0)}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="revenue" name="Выручка" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="costs" name="Расходы" fill="var(--chart-4)" radius={[0, 0, 4, 4]} />
              <Line
                type="monotone"
                dataKey="netProfit"
                name="Чистая прибыль"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* P&L table */}
      <Card>
        <CardHeader><CardTitle>Отчёт о прибылях и убытках (тыс. тг)</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="border-b">
                <th className="sticky left-0 bg-card px-3 py-2 text-left font-medium text-muted-foreground min-w-[200px]">Показатель</th>
                {Array.from({ length: years }, (_, i) => (
                  <th key={i} className="px-3 py-2 text-right font-medium text-muted-foreground min-w-[100px]">Год {i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                if (row.separator) {
                  return <tr key={idx}><td colSpan={years + 1} className="py-1"></td></tr>
                }
                return (
                  <tr key={idx} className={`border-b border-border/30 ${row.bold ? 'bg-muted/30' : ''}`}>
                    <td className={`sticky left-0 bg-card px-3 py-2 ${row.bold ? 'font-semibold' : 'text-muted-foreground'} ${row.indent ? 'pl-6' : ''}`}>
                      {row.label}
                    </td>
                    {(row.values || []).slice(0, years).map((v, i) => (
                      <td key={i} className={`px-3 py-2 text-right ${v < 0 ? 'text-red-400' : ''} ${row.bold ? 'font-semibold' : ''}`}>
                        {fmt(v, 0)}
                      </td>
                    ))}
                    {/* Pad missing years */}
                    {Array.from({ length: Math.max(0, years - (row.values?.length || 0)) }, (_, i) => (
                      <td key={`pad-${i}`} className="px-3 py-2 text-right text-muted-foreground">---</td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
