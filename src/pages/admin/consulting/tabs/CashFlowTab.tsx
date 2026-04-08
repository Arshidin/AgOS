import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useProjectData, fmt } from './usProjectData'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

function toAnnual(arr: number[] | undefined): number[] {
  if (!arr || arr.length === 0) return []
  const years: number[] = []
  for (let yr = 0; yr < 10; yr++) {
    const start = yr * 12
    const end = Math.min((yr + 1) * 12, arr.length)
    if (start >= arr.length) break
    years.push(arr.slice(start, end).reduce((a, b) => a + b, 0))
  }
  return years
}

function lastOfYear(arr: number[] | undefined): number[] {
  if (!arr || arr.length === 0) return []
  const years: number[] = []
  for (let yr = 0; yr < 10; yr++) {
    const end = Math.min((yr + 1) * 12, arr.length)
    if (yr * 12 >= arr.length) break
    years.push(arr[end - 1] ?? 0)
  }
  return years
}

export function CashFlowTab() {
  const { results, version, loading } = useProjectData()
  if (loading) return <Skeleton className="h-48 w-full rounded-xl" />
  if (!version) return <p className="page text-muted-foreground">Нет данных. Запустите расчёт.</p>

  const cf = results.cashflow || {}
  const years = Math.min(10, Math.ceil((cf.cash_balance?.length || 0) / 12))
  if (years === 0) return <p className="page text-muted-foreground">Нет данных Cash Flow.</p>

  const chartData = (cf.cash_balance || []).map((v: number, i: number) => ({
    month: i + 1,
    label: (i + 1) % 12 === 0 ? `Г${Math.floor(i / 12) + 1}` : '',
    value: v ?? 0,
  }))

  const rows = [
    { label: 'Операционная деятельность', values: toAnnual(cf.cf_operations), bold: true },
    { label: 'Инвестиционная деятельность', values: toAnnual(cf.cf_investing), bold: true },
    { label: 'Финансовая деятельность', values: toAnnual(cf.cf_financing), bold: true },
    { label: '', separator: true },
    { label: 'Денежные средства к.п.', values: lastOfYear(cf.cash_balance), bold: true },
  ]

  return (
    <div className="page space-y-4">
      {/* Cash balance area chart */}
      <Card>
        <CardHeader><CardTitle>Динамика денежных средств</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                tickLine={false}
                interval={11}
                className="fill-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)} тыс.`}
                className="fill-muted-foreground"
                width={80}
              />
              <Tooltip
                formatter={(value: number) => [`${fmt(value, 0)} тг`, 'Баланс']}
                labelFormatter={(_, payload) => {
                  if (payload?.[0]) return `Месяц ${payload[0].payload.month}`
                  return ''
                }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <ReferenceLine y={0} stroke="#888" strokeDasharray="4 4" />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                fill="url(#cashGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Existing cash flow table */}
      <Card>
        <CardHeader><CardTitle>Движение денежных средств (тыс. тг)</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="border-b">
                <th className="sticky left-0 bg-card px-3 py-2 text-left font-medium text-muted-foreground min-w-[250px]">Показатель</th>
                {Array.from({ length: years }, (_, i) => (
                  <th key={i} className="px-3 py-2 text-right font-medium text-muted-foreground min-w-[100px]">Год {i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                if ('separator' in row && row.separator) {
                  return <tr key={idx}><td colSpan={years + 1} className="py-1 border-t-2"></td></tr>
                }
                const r = row as { label: string; values: number[]; bold?: boolean }
                return (
                  <tr key={idx} className={`border-b border-border/30 ${r.bold ? 'bg-muted/30' : ''}`}>
                    <td className={`sticky left-0 bg-card px-3 py-2 ${r.bold ? 'font-semibold' : 'text-muted-foreground'}`}>
                      {r.label}
                    </td>
                    {r.values.slice(0, years).map((v, i) => (
                      <td key={i} className={`px-3 py-2 text-right ${v < 0 ? 'text-red-400' : ''} ${r.bold ? 'font-semibold' : ''}`}>
                        {fmt(v, 0)}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Valuation metrics */}
      {results.wacc && (
        <Card>
          <CardHeader><CardTitle>Оценка проекта</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">NPV</p>
              <p className="font-mono text-lg font-semibold">{fmt(results.wacc.npv, 0)} тыс.</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">IRR</p>
              <p className="font-mono text-lg font-semibold">
                {results.wacc.irr ? `${(results.wacc.irr * 100).toFixed(1)}%` : '—'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">WACC</p>
              <p className="font-mono text-lg font-semibold">{(results.wacc.wacc * 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payback</p>
              <p className="font-mono text-lg font-semibold">{results.wacc.payback_years || '—'} лет</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
