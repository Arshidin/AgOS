import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Calculator } from 'lucide-react'
import { useProjectData, fmt, fmtPct } from './usProjectData'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function toProjectYearAnnual(
  arr: number[] | undefined,
  mode: 'sum' | 'last' = 'sum',
): number[] {
  if (!arr || arr.length === 0) return []
  const years: number[] = []
  for (let yr = 0; yr < 10; yr++) {
    const start = yr * 12
    const end = Math.min((yr + 1) * 12, arr.length)
    if (start >= arr.length) break
    years.push(
      mode === 'sum'
        ? arr.slice(start, end).reduce((a, b) => a + (b ?? 0), 0)
        : (arr[end - 1] ?? 0),
    )
  }
  return years
}

/* ------------------------------------------------------------------ */
/*  KPI Card                                                          */
/* ------------------------------------------------------------------ */

function KpiCard({
  label,
  value,
  suffix,
  border = 'border-l-emerald-500',
}: {
  label: string
  value: string
  suffix?: string
  border?: string
}) {
  return (
    <Card className={`border-l-4 ${border}`}>
      <CardContent className="py-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 font-mono text-2xl font-semibold">
          {value}
          {suffix && (
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              {suffix}
            </span>
          )}
        </p>
      </CardContent>
    </Card>
  )
}

function SecondaryKpiCard({
  label,
  value,
  suffix,
}: {
  label: string
  value: string
  suffix?: string
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 font-mono text-lg font-semibold">
          {value}
          {suffix && (
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              {suffix}
            </span>
          )}
        </p>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function SummaryTab() {
  const { results, version, loading } = useProjectData()

  if (loading) return <Skeleton className="h-48 w-full rounded-xl" />

  if (!version) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-12">
          <Calculator className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">
            Перейдите на вкладку &quot;Параметры&quot; и запустите расчёт.
          </p>
        </CardContent>
      </Card>
    )
  }

  const wacc = results.wacc || {}
  const input = results.input || {}
  const capex = results.capex || {}
  const pnl = results.pnl || {}
  const cf = results.cashflow || {}

  /* derived values */
  const netProfitY10 =
    pnl.net_profit?.slice(108, 120)?.reduce((a: number, b: number) => a + b, 0) || 0
  const cashFinal =
    cf.cash_balance?.[119] || cf.cash_balance?.[cf.cash_balance?.length - 1] || 0
  const totalRevenue10 =
    results.revenue?.total_revenue?.reduce((a: number, b: number) => a + b, 0) || 0

  /* ---- chart data: monthly cash balance ---- */
  const cashBalanceData = (cf.cash_balance as number[] | undefined)?.map(
    (val: number, idx: number) => ({
      month: idx + 1,
      balance: val ?? 0,
    }),
  ) ?? []

  /* ---- chart data: annual revenue vs net profit ---- */
  const annualRevenue = toProjectYearAnnual(results.revenue?.total_revenue, 'sum')
  const annualProfit = toProjectYearAnnual(pnl.net_profit, 'sum')
  const annualData = Array.from({ length: Math.max(annualRevenue.length, annualProfit.length) }, (_, i) => ({
    year: `Y${i + 1}`,
    revenue: annualRevenue[i] ?? 0,
    profit: annualProfit[i] ?? 0,
  }))

  return (
    <div className="space-y-6 pt-4">
      {/* ========== TOP ROW: Primary KPI cards ========== */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="NPV"
          value={fmt(wacc.npv, 0)}
          suffix="тыс. тг"
          border={
            (wacc.npv ?? 0) >= 0
              ? 'border-l-emerald-500'
              : 'border-l-red-500'
          }
        />
        <KpiCard
          label="IRR"
          value={wacc.irr ? `${(wacc.irr * 100).toFixed(1)}%` : '\u2014'}
          border="border-l-amber-500"
        />
        <KpiCard
          label="Payback"
          value={wacc.payback_years ? `${wacc.payback_years}` : '\u2014'}
          suffix="лет"
          border="border-l-violet-500"
        />
        <KpiCard
          label="WACC"
          value={fmtPct(wacc.wacc)}
          border="border-l-blue-500"
        />
      </div>

      {/* ========== MIDDLE: Charts ========== */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* --- Cash Balance Area Chart --- */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Денежный баланс (помесячно)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashBalanceData}>
                  <defs>
                    <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="hsl(var(--chart-2))"
                        stopOpacity={0.2}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(var(--chart-2))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) =>
                      v % 12 === 0 ? `Год ${v / 12}` : ''
                    }
                    interval={0}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) =>
                      v >= 1_000_000
                        ? `${(v / 1_000_000).toFixed(0)}M`
                        : v >= 1_000
                          ? `${(v / 1_000).toFixed(0)}K`
                          : `${v}`
                    }
                    width={55}
                  />
                  <Tooltip
                    formatter={(v: number) => [fmt(v, 0) + ' тыс. тг', 'Баланс']}
                    labelFormatter={(l: number) => `Месяц ${l}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="hsl(var(--chart-2))"
                    fill="url(#cashGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* --- Revenue vs Net Profit Bar Chart --- */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Выручка и чистая прибыль (по годам)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={annualData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) =>
                      v >= 1_000_000
                        ? `${(v / 1_000_000).toFixed(0)}M`
                        : v >= 1_000
                          ? `${(v / 1_000).toFixed(0)}K`
                          : `${v}`
                    }
                    width={55}
                  />
                  <Tooltip
                    formatter={(v: number, name: string) => [
                      fmt(v, 0) + ' тыс. тг',
                      name === 'revenue' ? 'Выручка' : 'Чистая прибыль',
                    ]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    formatter={(value: string) =>
                      value === 'revenue' ? 'Выручка' : 'Чистая прибыль'
                    }
                  />
                  <Bar
                    dataKey="revenue"
                    name="Выручка"
                    fill="hsl(var(--chart-1))"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="profit"
                    name="Чистая прибыль"
                    fill="hsl(var(--chart-3))"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========== Secondary KPI cards ========== */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <SecondaryKpiCard
          label="CAPEX итого"
          value={fmt((capex.grand_total || 0) / 1000, 0)}
          suffix="тыс. тг"
        />
        <SecondaryKpiCard
          label="Стоимость скота"
          value={fmt(input.livestock_purchase_cost, 0)}
          suffix="тыс. тг"
        />
        <SecondaryKpiCard
          label="Выручка за 10 лет"
          value={fmt(totalRevenue10, 0)}
          suffix="тыс. тг"
        />
        <SecondaryKpiCard
          label="Деньги (год 10)"
          value={fmt(cashFinal, 0)}
          suffix="тыс. тг"
        />
        <SecondaryKpiCard
          label="Чистая прибыль Y10"
          value={fmt(netProfitY10, 0)}
          suffix="тыс. тг"
        />
        <SecondaryKpiCard
          label="Собств. участие"
          value={`${((input.equity_share || 0) * 100).toFixed(0)}%`}
        />
      </div>

      {/* ========== Parameters card ========== */}
      <Card>
        <CardHeader>
          <CardTitle>Параметры проекта</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
          <div>
            <span className="text-muted-foreground">Поголовье:</span>{' '}
            {input.initial_cows || '\u2014'} голов
          </div>
          <div>
            <span className="text-muted-foreground">Мощность:</span>{' '}
            {input.reproducer_capacity || '\u2014'} голов
          </div>
          <div>
            <span className="text-muted-foreground">Быки:</span>{' '}
            {input.initial_bulls || '\u2014'} голов
          </div>
          <div>
            <span className="text-muted-foreground">Отёл:</span>{' '}
            {input.calving_scenario || '\u2014'}
          </div>
          <div>
            <span className="text-muted-foreground">Пастбища:</span>{' '}
            {fmt(input.pasture_area, 0)} га
          </div>
          <div>
            <span className="text-muted-foreground">Дата старта:</span>{' '}
            {input.project_start_date || '\u2014'}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
