import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp } from 'lucide-react'
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

type ViewMode = 'annual' | 'monthly'

/* ------------------------------------------------------------------ */
/*  Row types                                                          */
/* ------------------------------------------------------------------ */
type RowKind = 'section' | 'data' | 'total' | 'separator'

interface TableRow {
  label: string
  values: number[]
  kind: RowKind
  indent?: boolean
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function safeArr(arr: number[] | undefined): number[] {
  return arr ?? []
}

function toCalendarYear(
  arr: number[] | undefined,
  calYears: number[] | undefined,
  mode: 'first' | 'last' | 'sum' | 'avg',
): number[] {
  if (!arr || !calYears || arr.length === 0) return []
  const yearMap = new Map<number, number[]>()
  const yearOrder: number[] = []
  for (let i = 0; i < Math.min(arr.length, calYears.length); i++) {
    const y = calYears[i] ?? 0
    if (!yearMap.has(y)) {
      yearMap.set(y, [])
      yearOrder.push(y)
    }
    yearMap.get(y)!.push(arr[i] ?? 0)
  }
  return yearOrder.map(y => {
    const vals = yearMap.get(y)!
    switch (mode) {
      case 'first': return vals[0] ?? 0
      case 'last':  return vals[vals.length - 1] ?? 0
      case 'sum':   return vals.reduce((a, b) => a + b, 0)
      case 'avg':   return vals.reduce((a, b) => a + b, 0) / vals.length
    }
  })
}

function getYearLabels(calYears: number[] | undefined): number[] {
  if (!calYears) return []
  const seen = new Set<number>()
  const result: number[] = []
  for (const y of calYears) {
    if (!seen.has(y)) { seen.add(y); result.push(y) }
  }
  return result
}

function makeConstArr(scalar: number, n: number): number[] {
  return Array.from({ length: n }, () => scalar)
}

/* ------------------------------------------------------------------ */
/*  Build P&L rows                                                     */
/* ------------------------------------------------------------------ */
interface PnlData {
  // Revenue
  livestock_revenue: number[]
  rev_heifers: number[]
  rev_cows_culled: number[]
  rev_bulls_culled: number[]
  rev_steers: number[]
  subsidies: number[]
  sub_purchase: number[]
  sub_breeding: number[]
  sub_bulls: number[]
  total_revenue: number[]
  // COGS
  cogs_reproducer: number[]
  feed_cost_repro: number[]
  feed_cost_fatt: number[]
  cost_vet: number[]
  cost_rfid: number[]
  cost_tags: number[]
  cost_insurance: number[]
  cost_payroll: number[]
  cost_current: number[]
  cost_other: number[]
  cogs_fattening: number[]
  total_cogs: number[]
  // P&L
  gross_profit: number[]
  admin_expenses: number[]  // total (land_tax + admin_payroll) — used for EBITDA
  admin_payroll: number[]   // admin staff payroll detail
  land_tax: number[]        // land tax detail
  ebitda: number[]
  depr_equipment: number[]
  depr_buildings: number[]
  ebit: number[]
  finance_costs: number[]
  profit_before_tax: number[]
  cit: number[]
  net_profit: number[]
}

function buildRows(d: PnlData): TableRow[] {
  const sec = (label: string): TableRow => ({ label, values: [], kind: 'section' })
  const row = (label: string, values: number[], indent = false): TableRow =>
    ({ label, values, kind: 'data', indent })
  const tot = (label: string, values: number[]): TableRow =>
    ({ label, values, kind: 'total' })
  const sep: TableRow = { label: '', values: [], kind: 'separator' }

  return [
    // Revenue section
    sec('ВЫРУЧКА'),
    tot('Выручка от продажи КРС', d.livestock_revenue),
    row('Телочки — племенной скот', d.rev_heifers, true),
    row('Маточное поголовье — выбраковка', d.rev_cows_culled, true),
    row('Быки-производители — выбраковка', d.rev_bulls_culled, true),
    row('Собственные бычки', d.rev_steers, true),
    sep,
    tot('Субсидии', d.subsidies),
    row('Субсидии закуп поголовья', d.sub_purchase, true),
    row('Субсидии выращивание молодняка', d.sub_breeding, true),
    row('Субсидии содержание быков', d.sub_bulls, true),
    sep,
    tot('Итого выручка', d.total_revenue),

    // COGS section
    sep,
    sec('СЕБЕСТОИМОСТЬ'),
    tot('Себестоимость репродуктора', d.cogs_reproducer),
    row('Корма (репродуктор)', d.feed_cost_repro, true),
    row('Вет препараты', d.cost_vet, true),
    row('RFID-чипы', d.cost_rfid, true),
    row('Ушные бирки', d.cost_tags, true),
    row('Страхование маточного поголовья', d.cost_insurance, true),
    row('ФОТ (производственный)', d.cost_payroll, true),
    row('Текущие расходы', d.cost_current, true),
    row('Прочие расходы', d.cost_other, true),
    sep,
    tot('Себестоимость доращивания', d.cogs_fattening),
    row('Корма (откорм)', d.feed_cost_fatt, true),
    tot('Итого себестоимость', d.total_cogs),

    // P&L calculation
    sep,
    sec('ОТЧЁТ О ПРИБЫЛЯХ И УБЫТКАХ'),
    tot('Валовая прибыль', d.gross_profit),
    row('ФОТ (административный)', d.admin_payroll, true),
    row('Земельный налог', d.land_tax, true),
    tot('EBITDA', d.ebitda),
    row('Амортизация техники', d.depr_equipment, true),
    row('Амортизация зданий и сооружений', d.depr_buildings, true),
    tot('EBIT', d.ebit),
    row('Расходы по финансированию', d.finance_costs, true),
    tot('Прибыль до уплаты налога', d.profit_before_tax),
    row('КПН (20%)', d.cit, true),
    tot('Чистая прибыль', d.net_profit),
  ]
}

/* ------------------------------------------------------------------ */
/*  Resolve data                                                       */
/* ------------------------------------------------------------------ */
function resolveMonthly(
  revenue: any, opex: any, pnl: any, capex: any, loans: any, n: number,
): PnlData {
  const revDetail = revenue.detail || {}
  const opexDetail = opex.detail || {}

  const deprEquip = capex?.depreciation_equipment_monthly ?? 0
  const deprBuild = capex?.depreciation_buildings_monthly ?? 0

  return {
    livestock_revenue: safeArr(revenue.livestock_revenue),
    rev_heifers: safeArr(revDetail.rev_heifers),
    rev_cows_culled: safeArr(revDetail.rev_cows_culled),
    rev_bulls_culled: safeArr(revDetail.rev_bulls_culled),
    rev_steers: safeArr(revDetail.rev_steers),
    subsidies: safeArr(revenue.subsidies),
    sub_purchase: safeArr(revDetail.sub_purchase),
    sub_breeding: safeArr(revDetail.sub_breeding),
    sub_bulls: safeArr(revDetail.sub_bulls),
    total_revenue: safeArr(revenue.total_revenue),

    cogs_reproducer: safeArr(opex.cogs_reproducer),
    feed_cost_repro: safeArr(opex.feed_cost_repro ?? opex.feed_cost),
    feed_cost_fatt: safeArr(opex.feed_cost_fatt ?? opex.cogs_fattening),
    cost_vet: safeArr(opexDetail.cost_vet),
    cost_rfid: safeArr(opexDetail.cost_rfid),
    cost_tags: safeArr(opexDetail.cost_tags),
    cost_insurance: safeArr(opexDetail.cost_insurance),
    cost_payroll: safeArr(opexDetail.cost_payroll),
    cost_current: safeArr(opexDetail.cost_current),
    cost_other: safeArr(opexDetail.cost_other),
    cogs_fattening: safeArr(opex.cogs_fattening),
    total_cogs: safeArr(opex.total_cogs),

    gross_profit: safeArr(pnl.gross_profit),
    admin_expenses: safeArr(pnl.admin_expenses),
    admin_payroll: safeArr(opex.admin_payroll),
    land_tax: safeArr(opex.land_tax),
    ebitda: safeArr(pnl.ebitda),
    depr_equipment: makeConstArr(-deprEquip, n),
    depr_buildings: makeConstArr(-deprBuild, n),
    ebit: safeArr(pnl.ebit),
    finance_costs: safeArr(pnl.finance_costs || loans?.total_interest?.map((v: number) => -v)),
    profit_before_tax: safeArr(pnl.profit_before_tax),
    cit: safeArr(pnl.cit),
    net_profit: safeArr(pnl.net_profit),
  }
}

function resolveAnnual(
  revenue: any, opex: any, pnl: any, capex: any, loans: any,
  calYears: number[], n: number,
): PnlData {
  const a = (arr: number[] | undefined) => toCalendarYear(arr, calYears, 'sum')
  const revDetail = revenue.detail || {}
  const opexDetail = opex.detail || {}

  const deprEquip = capex?.depreciation_equipment_monthly ?? 0
  const deprBuild = capex?.depreciation_buildings_monthly ?? 0

  return {
    livestock_revenue: a(revenue.livestock_revenue),
    rev_heifers: a(revDetail.rev_heifers),
    rev_cows_culled: a(revDetail.rev_cows_culled),
    rev_bulls_culled: a(revDetail.rev_bulls_culled),
    rev_steers: a(revDetail.rev_steers),
    subsidies: a(revenue.subsidies),
    sub_purchase: a(revDetail.sub_purchase),
    sub_breeding: a(revDetail.sub_breeding),
    sub_bulls: a(revDetail.sub_bulls),
    total_revenue: a(revenue.total_revenue),

    cogs_reproducer: a(opex.cogs_reproducer),
    feed_cost_repro: a(opex.feed_cost_repro ?? opex.feed_cost),
    feed_cost_fatt: a(opex.feed_cost_fatt ?? opex.cogs_fattening),
    cost_vet: a(opexDetail.cost_vet),
    cost_rfid: a(opexDetail.cost_rfid),
    cost_tags: a(opexDetail.cost_tags),
    cost_insurance: a(opexDetail.cost_insurance),
    cost_payroll: a(opexDetail.cost_payroll),
    cost_current: a(opexDetail.cost_current),
    cost_other: a(opexDetail.cost_other),
    cogs_fattening: a(opex.cogs_fattening),
    total_cogs: a(opex.total_cogs),

    gross_profit: a(pnl.gross_profit),
    admin_expenses: a(pnl.admin_expenses),
    admin_payroll: a(opex.admin_payroll),
    land_tax: a(opex.land_tax),
    ebitda: a(pnl.ebitda),
    depr_equipment: a(makeConstArr(-deprEquip, n)),
    depr_buildings: a(makeConstArr(-deprBuild, n)),
    ebit: a(pnl.ebit),
    finance_costs: a(pnl.finance_costs || loans?.total_interest?.map((v: number) => -v)),
    profit_before_tax: a(pnl.profit_before_tax),
    cit: a(pnl.cit),
    net_profit: a(pnl.net_profit),
  }
}

/* ------------------------------------------------------------------ */
/*  Table renderer                                                     */
/* ------------------------------------------------------------------ */
function renderTable(rows: TableRow[], headers: string[], fontSize: string) {
  const colCount = headers.length + 1
  return (
    <table className={`w-full ${fontSize} font-mono`}>
      <thead>
        <tr className="border-b border-border/40 bg-muted/40">
          <th className="sticky left-0 z-10 bg-muted/40 px-3 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wide min-w-[260px]">
            Показатель
          </th>
          {headers.map((h, i) => (
            <th key={i} className="px-2 py-2 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap min-w-[80px]">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, idx) => {
          if (r.kind === 'separator')
            return <tr key={idx}><td colSpan={colCount} className="py-1" /></tr>

          if (r.kind === 'section')
            return (
              <tr key={idx} className="bg-muted/50">
                <td
                  colSpan={colCount}
                  className="px-3 py-2 font-bold text-[10px] uppercase tracking-wider text-muted-foreground"
                >
                  {r.label}
                </td>
              </tr>
            )

          const isBold = r.kind === 'total'

          return (
            <tr
              key={idx}
              className={[
                'border-b border-border/30',
                isBold ? 'bg-muted/30' : '',
              ].join(' ')}
            >
              <td
                className={[
                  'sticky left-0 z-10 bg-card px-3 py-1.5',
                  r.indent ? 'pl-6' : '',
                  isBold ? 'font-semibold' : 'text-muted-foreground',
                ].join(' ')}
              >
                {r.label}
              </td>
              {r.values.map((v, i) => (
                <td
                  key={i}
                  className={[
                    'px-2 py-1.5 text-right',
                    isBold ? 'font-semibold' : '',
                    v < -0.1 ? 'text-[var(--red)]' : '',
                  ].join(' ')}
                >
                  {Math.abs(v) < 0.1 ? '' : fmt(v, 0)}
                </td>
              ))}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export function PnlTab() {
  const { results, version, loading } = useProjectData()
  const [view, setView] = useState<ViewMode>('annual')

  if (loading) return (
    <div className="page space-y-2">
      <Skeleton className="h-5 w-44 mb-2" />
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className="flex gap-3 items-center">
          <Skeleton className="h-3.5 grow" />
          <Skeleton className="h-3.5 w-16 shrink-0" />
          <Skeleton className="h-3.5 w-16 shrink-0" />
        </div>
      ))}
    </div>
  )
  if (!version) return (
    <div className="page">
      <Card><CardContent className="flex flex-col items-center py-12">
        <TrendingUp className="mb-4 h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">Нет данных. Запустите расчёт.</p>
      </CardContent></Card>
    </div>
  )

  const pnl = results.pnl || {}
  const revenue = results.revenue || {}
  const opex = results.opex || {}
  const loans = results.loans || {}
  const capex = results.capex || {}
  const timeline = results.timeline || {}
  const calYears: number[] | undefined = timeline.calendar_year
  const dates: string[] | undefined = timeline.dates
  const totalMonths = pnl.net_profit?.length || 0

  if (totalMonths === 0) return (
    <div className="page">
      <Card><CardContent className="flex flex-col items-center py-12">
        <TrendingUp className="mb-4 h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">Нет данных P&L.</p>
      </CardContent></Card>
    </div>
  )

  const years = getYearLabels(calYears)

  // ============================================================
  // CHART DATA (unchanged)
  // ============================================================
  const toAnnualSum = (arr: number[] | undefined) => toCalendarYear(arr, calYears, 'sum')
  const annualRevenue = toAnnualSum(revenue.total_revenue)
  const annualCosts = toAnnualSum(opex.total_cogs)
  const annualNetProfit = toAnnualSum(pnl.net_profit)

  const chartData = years.map((yr, i) => ({
    year: `${yr}`,
    revenue: annualRevenue[i] ?? 0,
    costs: -(Math.abs(annualCosts[i] ?? 0)),
    netProfit: annualNetProfit[i] ?? 0,
  }))

  // ============================================================
  // TABLE VIEWS
  // ============================================================
  const renderAnnual = () => {
    const data = resolveAnnual(revenue, opex, pnl, capex, loans, calYears!, totalMonths)
    const rows = buildRows(data)
    return renderTable(rows, years.map(String), 'text-sm')
  }

  const renderMonthly = () => {
    const n = Math.min(totalMonths, 120)
    const MONTHS_RU = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек']
    const monthLabels: string[] = []
    for (let i = 0; i < n; i++) {
      const d = dates?.[i]
      if (d) {
        const parts = d.split('-')
        const y = parts[0] ?? '00'
        const m = parts[1] ?? '01'
        monthLabels.push(`${MONTHS_RU[parseInt(m) - 1]} ${y.slice(2)}`)
      } else {
        monthLabels.push(`М${i + 1}`)
      }
    }

    const data = resolveMonthly(revenue, opex, pnl, capex, loans, n)
    const rows = buildRows(data)
    for (const r of rows) {
      if (r.values.length > n) r.values = r.values.slice(0, n)
    }
    return renderTable(rows, monthLabels, 'text-xs')
  }

  return (
    <div className="page space-y-4">
      {/* Revenue / Costs / Profit chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Выручка, расходы и прибыль</CardTitle>
          <CardDescription>Годовая динамика выручки, себестоимости и чистой прибыли</CardDescription>
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

      {/* View toggle */}
      <SegmentedControl
        segments={[
          { value: 'annual', label: 'По годам' },
          { value: 'monthly', label: 'По месяцам' },
        ]}
        value={view}
        onChange={setView}
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>
            {view === 'annual'
              ? 'Отчёт о прибылях и убытках (тыс. тг, по годам)'
              : 'Отчёт о прибылях и убытках (тыс. тг, помесячно)'}
          </CardTitle>
          <CardDescription>Детализация выручки, себестоимости и P&L по строкам</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {view === 'annual' ? renderAnnual() : renderMonthly()}
        </CardContent>
      </Card>
    </div>
  )
}
