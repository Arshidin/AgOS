import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Skeleton } from '@/components/ui/skeleton'
import { useProjectData, fmt } from './usProjectData'
import {
  AreaChart,
  Area,
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
type RowKind = 'section' | 'group' | 'data' | 'computed' | 'separator' | 'total'

interface TableRow {
  label: string
  values: number[]
  kind: RowKind
  indent?: number   // 0=group header, 1=flow line
  sign?: '+' | '−' | ''
}

/* ------------------------------------------------------------------ */
/*  Array helpers                                                      */
/* ------------------------------------------------------------------ */
function absArr(arr: number[] | undefined): number[] {
  return arr?.map(v => Math.abs(v ?? 0)) ?? []
}

function arrAdd(...arrays: number[][]): number[] {
  const n = arrays[0]?.length ?? 0
  return Array.from({ length: n }, (_, i) =>
    arrays.reduce((sum, a) => sum + (a[i] ?? 0), 0),
  )
}

function arrSub(base: number[], ...subs: number[][]): number[] {
  const n = base.length
  return Array.from({ length: n }, (_, i) =>
    subs.reduce((val, a) => val - (a[i] ?? 0), base[i] ?? 0),
  )
}

function safeArr(arr: number[] | undefined): number[] {
  return arr ?? []
}

/* ------------------------------------------------------------------ */
/*  Calendar-year aggregation                                          */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/*  Build table rows (shared between annual & monthly)                 */
/* ------------------------------------------------------------------ */
interface HerdArrays {
  cows_bop: number[]; cows_purchased: number[]; cows_from_heifers: number[]
  cows_culled: number[]; cows_mortality: number[]; cows_sold_breeding: number[]
  cows_eop: number[]; cows_avg: number[]

  bulls_bop: number[]; bulls_purchased: number[]; bulls_from_steers: number[]
  bulls_culled: number[]; bulls_mortality: number[]
  bulls_eop: number[]; bulls_avg: number[]

  calves_bop: number[]; calves_born: number[]; calves_mortality: number[]
  calves_to_heifers: number[]; calves_to_steers: number[]
  calves_eop: number[]; calves_avg: number[]

  heifers_bop: number[]; heifers_from_calves: number[]; heifers_mortality: number[]
  heifers_sold_breeding: number[]; heifers_to_cows: number[]
  heifers_eop: number[]; heifers_avg: number[]

  steers_bop: number[]; steers_from_calves: number[]; steers_to_bulls: number[]
  steers_mortality: number[]; steers_sold: number[]
  steers_eop: number[]; steers_avg: number[]

  fattening_bop: number[]; fattening_eop: number[]; fattening_avg: number[]

  total_avg_livestock: number[]
  total_sold: number[]
}

function buildRows(d: HerdArrays): TableRow[] {
  const sec = (label: string): TableRow => ({ label, values: [], kind: 'section' })
  const grp = (label: string): TableRow => ({ label, values: [], kind: 'group', indent: 0 })
  const row = (label: string, values: number[], sign?: '+' | '−'): TableRow =>
    ({ label, values, kind: 'data', indent: 1, sign: sign ?? '' })
  const comp = (label: string, values: number[]): TableRow =>
    ({ label, values, kind: 'computed', indent: 1 })
  const tot = (label: string, values: number[]): TableRow =>
    ({ label, values, kind: 'total' })
  const sep: TableRow = { label: '', values: [], kind: 'separator' }

  // --- Cows ---
  const cowsInterim = arrSub(
    arrAdd(d.cows_bop, d.cows_purchased, d.cows_from_heifers),
    d.cows_culled, d.cows_mortality,
  )

  // --- Calves ---
  const calvesBeforeDist = arrSub(
    arrAdd(d.calves_bop, d.calves_born),
    d.calves_mortality,
  )

  // --- Heifers ---
  // Python engine: heifers_before = bop + from_calves + mortality (mortality is negative in engine)
  // Here mortality is already abs'd, so we subtract it
  const heifersBeforeDist = arrSub(
    arrAdd(d.heifers_bop, d.heifers_from_calves),
    d.heifers_mortality,
  )

  // --- Steers ---
  const steersInterim = arrSub(
    arrAdd(d.steers_bop, d.steers_from_calves),
    d.steers_to_bulls, d.steers_mortality,
  )

  // --- Totals ---
  const totalAvg = d.total_avg_livestock
  const totalBop = arrAdd(d.cows_bop, d.bulls_bop, d.calves_bop, d.heifers_bop, d.steers_bop)
  const totalEop = arrAdd(d.cows_eop, d.bulls_eop, d.calves_eop, d.heifers_eop, d.steers_eop)

  return [
    sec('РЕПРОДУКТОР'),

    // 1. Cows
    grp('1. Маточное поголовье'),
    row('н.п.', d.cows_bop),
    row('Покупка маточного поголовья', d.cows_purchased, '+'),
    row('Перевод из тёлок', d.cows_from_heifers, '+'),
    row('Выбраковка / откорм', d.cows_culled, '−'),
    row('Падёж маточного поголовья', d.cows_mortality, '−'),
    comp('Промежуточно', cowsInterim),
    row('Продажа как племенной скот', d.cows_sold_breeding, '−'),
    row('к.п.', d.cows_eop),
    row('Среднее количество', d.cows_avg),
    sep,

    // 2. Bulls
    grp('2. Быки-производители'),
    row('н.п.', d.bulls_bop),
    row('Покупка быков-производителей', d.bulls_purchased, '+'),
    row('Перевод из бычков (до коэф. 1:15)', d.bulls_from_steers, '+'),
    row('Выбраковка / откорм', d.bulls_culled, '−'),
    row('Падёж быков-производителей', d.bulls_mortality, '−'),
    row('к.п.', d.bulls_eop),
    row('Среднее количество', d.bulls_avg),
    sep,

    // 3. Calves
    grp('3. Приплод'),
    row('н.п.', d.calves_bop),
    row('Новый приплод', d.calves_born, '+'),
    row('Падёж приплода', d.calves_mortality, '−'),
    comp('До распределения', calvesBeforeDist),
    row('Перевод в телочек', d.calves_to_heifers, '−'),
    row('Перевод в бычков', d.calves_to_steers, '−'),
    row('к.п.', d.calves_eop),
    row('Среднее количество', d.calves_avg),
    sep,

    // 4. Heifers
    grp('4. Телочки'),
    row('н.п.', d.heifers_bop),
    row('Перевод из приплода', d.heifers_from_calves, '+'),
    row('Падёж телочек', d.heifers_mortality, '−'),
    comp('До распределения', heifersBeforeDist),
    row('Перевод в маточное поголовье', d.heifers_to_cows, '−'),
    row('Продажа как племенной скот', d.heifers_sold_breeding, '−'),
    row('к.п.', d.heifers_eop),
    row('Среднее количество', d.heifers_avg),
    sep,

    // 5. Steers
    grp('5. Бычки'),
    row('н.п.', d.steers_bop),
    row('Перевод из приплода', d.steers_from_calves, '+'),
    row('Перевод в быков-производителей', d.steers_to_bulls, '−'),
    row('Падёж бычков', d.steers_mortality, '−'),
    comp('Промежуточно', steersInterim),
    row('Продажа на финишный откорм', d.steers_sold, '−'),
    row('к.п.', d.steers_eop),
    row('Среднее количество', d.steers_avg),

    // Totals
    sep,
    sec('ИТОГО РЕПРОДУКТОР'),
    tot('Среднее количество КРС', totalAvg),
    tot('Итого КРС на н.п.', totalBop),
    tot('Итого КРС на к.п.', totalEop),

    // Fattening
    sep,
    sec('ЭТАП ДОРАЩИВАНИЯ'),
    row('н.п.', d.fattening_bop),
    row('к.п.', d.fattening_eop),
    row('Среднее количество', d.fattening_avg),

    // Sales summary
    sep,
    sec('САММАРИ ПО РЕАЛИЗАЦИИ'),
    row('Маточное поголовье — выбраковка', d.cows_culled),
    row('Маточное поголовье — племенной скот', d.cows_sold_breeding),
    row('Быки-производители — выбраковка', d.bulls_culled),
    row('Бычки — реализация', d.steers_sold),
    tot('Всего реализовано', d.total_sold),
  ]
}

/* ------------------------------------------------------------------ */
/*  Resolve herd data into HerdArrays                                  */
/* ------------------------------------------------------------------ */
function resolveMonthly(herd: any): HerdArrays {
  return {
    cows_bop: safeArr(herd.cows?.bop),
    cows_purchased: safeArr(herd.cows?.purchased),
    cows_from_heifers: safeArr(herd.cows?.from_heifers),
    cows_culled: absArr(herd.cows?.culled),
    cows_mortality: absArr(herd.cows?.mortality),
    cows_sold_breeding: absArr(herd.cows?.sold_breeding),
    cows_eop: safeArr(herd.cows?.eop),
    cows_avg: safeArr(herd.cows?.avg),

    bulls_bop: safeArr(herd.bulls?.bop),
    bulls_purchased: safeArr(herd.bulls?.purchased),
    bulls_from_steers: safeArr(herd.bulls?.from_steers),
    bulls_culled: absArr(herd.bulls?.culled),
    bulls_mortality: absArr(herd.bulls?.mortality),
    bulls_eop: safeArr(herd.bulls?.eop),
    bulls_avg: safeArr(herd.bulls?.avg),

    calves_bop: safeArr(herd.calves?.bop),
    calves_born: safeArr(herd.calves?.born),
    calves_mortality: absArr(herd.calves?.mortality),
    calves_to_heifers: absArr(herd.calves?.to_heifers),
    calves_to_steers: absArr(herd.calves?.to_steers),
    calves_eop: safeArr(herd.calves?.eop),
    calves_avg: safeArr(herd.calves?.avg),

    heifers_bop: safeArr(herd.heifers?.bop),
    heifers_from_calves: safeArr(herd.heifers?.from_calves),
    heifers_mortality: absArr(herd.heifers?.mortality),
    heifers_sold_breeding: absArr(herd.heifers?.sold_breeding),
    heifers_to_cows: absArr(herd.heifers?.to_cows),
    heifers_eop: safeArr(herd.heifers?.eop),
    heifers_avg: safeArr(herd.heifers?.avg),

    steers_bop: safeArr(herd.steers?.bop),
    steers_from_calves: safeArr(herd.steers?.from_calves),
    steers_to_bulls: absArr(herd.steers?.to_bulls),
    steers_mortality: absArr(herd.steers?.mortality),
    steers_sold: absArr(herd.steers?.sold),
    steers_eop: safeArr(herd.steers?.eop),
    steers_avg: safeArr(herd.steers?.avg),

    fattening_bop: safeArr(herd.fattening?.bop),
    fattening_eop: safeArr(herd.fattening?.eop),
    fattening_avg: safeArr(herd.fattening?.avg),

    total_avg_livestock: safeArr(herd.total_avg_livestock),
    total_sold: safeArr(herd.total_sold),
  }
}

function resolveAnnual(herd: any, calYears: number[]): HerdArrays {
  const a = (arr: number[] | undefined, mode: 'first' | 'last' | 'sum' | 'avg') =>
    toCalendarYear(arr, calYears, mode)

  return {
    cows_bop: a(herd.cows?.bop, 'first'),
    cows_purchased: a(herd.cows?.purchased, 'sum'),
    cows_from_heifers: a(herd.cows?.from_heifers, 'sum'),
    cows_culled: a(absArr(herd.cows?.culled), 'sum'),
    cows_mortality: a(absArr(herd.cows?.mortality), 'sum'),
    cows_sold_breeding: a(absArr(herd.cows?.sold_breeding), 'sum'),
    cows_eop: a(herd.cows?.eop, 'last'),
    cows_avg: a(herd.cows?.avg, 'avg'),

    bulls_bop: a(herd.bulls?.bop, 'first'),
    bulls_purchased: a(herd.bulls?.purchased, 'sum'),
    bulls_from_steers: a(herd.bulls?.from_steers, 'sum'),
    bulls_culled: a(absArr(herd.bulls?.culled), 'sum'),
    bulls_mortality: a(absArr(herd.bulls?.mortality), 'sum'),
    bulls_eop: a(herd.bulls?.eop, 'last'),
    bulls_avg: a(herd.bulls?.avg, 'avg'),

    calves_bop: a(herd.calves?.bop, 'first'),
    calves_born: a(herd.calves?.born, 'sum'),
    calves_mortality: a(absArr(herd.calves?.mortality), 'sum'),
    calves_to_heifers: a(absArr(herd.calves?.to_heifers), 'sum'),
    calves_to_steers: a(absArr(herd.calves?.to_steers), 'sum'),
    calves_eop: a(herd.calves?.eop, 'last'),
    calves_avg: a(herd.calves?.avg, 'avg'),

    heifers_bop: a(herd.heifers?.bop, 'first'),
    heifers_from_calves: a(herd.heifers?.from_calves, 'sum'),
    heifers_mortality: a(absArr(herd.heifers?.mortality), 'sum'),
    heifers_sold_breeding: a(absArr(herd.heifers?.sold_breeding), 'sum'),
    heifers_to_cows: a(absArr(herd.heifers?.to_cows), 'sum'),
    heifers_eop: a(herd.heifers?.eop, 'last'),
    heifers_avg: a(herd.heifers?.avg, 'avg'),

    steers_bop: a(herd.steers?.bop, 'first'),
    steers_from_calves: a(herd.steers?.from_calves, 'sum'),
    steers_to_bulls: a(absArr(herd.steers?.to_bulls), 'sum'),
    steers_mortality: a(absArr(herd.steers?.mortality), 'sum'),
    steers_sold: a(absArr(herd.steers?.sold), 'sum'),
    steers_eop: a(herd.steers?.eop, 'last'),
    steers_avg: a(herd.steers?.avg, 'avg'),

    fattening_bop: a(herd.fattening?.bop, 'first'),
    fattening_eop: a(herd.fattening?.eop, 'last'),
    fattening_avg: a(herd.fattening?.avg, 'avg'),

    total_avg_livestock: a(herd.total_avg_livestock, 'avg'),
    total_sold: a(herd.total_sold, 'sum'),
  }
}

/* ------------------------------------------------------------------ */
/*  Table renderer (shared)                                            */
/* ------------------------------------------------------------------ */
function renderTable(rows: TableRow[], headers: string[], fontSize: string) {
  const colCount = headers.length + 1
  return (
    <table className={`w-full ${fontSize} font-mono`}>
      <thead>
        <tr className="border-b">
          <th className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-medium text-muted-foreground min-w-[220px]">
            Показатель
          </th>
          {headers.map((h, i) => (
            <th key={i} className="px-2 py-2 text-right font-medium text-muted-foreground whitespace-nowrap min-w-[70px]">
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

          if (r.kind === 'group')
            return (
              <tr key={idx}>
                <td colSpan={colCount} className="px-3 pt-3 pb-1 font-semibold text-foreground">
                  {r.label}
                </td>
              </tr>
            )

          const isBold = r.kind === 'total' || r.label === 'к.п.'
          const isItalic = r.kind === 'computed'

          return (
            <tr
              key={idx}
              className={[
                'border-b border-border/30',
                r.kind === 'total' ? 'bg-muted/30 border-t border-border' : '',
                isItalic ? 'bg-muted/10' : '',
              ].join(' ')}
            >
              <td
                className={[
                  'sticky left-0 z-10 bg-card px-3 py-1',
                  r.indent === 1 ? 'pl-6' : '',
                  isBold ? 'font-semibold' : 'text-muted-foreground',
                  isItalic ? 'italic' : '',
                ].join(' ')}
              >
                {r.sign && <span className="text-muted-foreground mr-1">{r.sign}</span>}
                {r.label}
              </td>
              {r.values.map((v, i) => (
                <td
                  key={i}
                  className={[
                    'px-2 py-1 text-right',
                    isBold ? 'font-semibold' : '',
                    isItalic ? 'italic' : '',
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
export function HerdTab() {
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
  if (!version) return <p className="page text-muted-foreground">Нет данных. Запустите расчёт.</p>

  const herd = results.herd || {}
  const timeline = results.timeline || {}
  const calYears: number[] | undefined = timeline.calendar_year
  const dates: string[] | undefined = timeline.dates
  const totalMonths = herd.cows?.eop?.length || 0

  if (totalMonths === 0) return <p className="page text-muted-foreground">Нет данных стада.</p>

  // ============================================================
  // CHART DATA
  // ============================================================
  const chartData = Array.from({ length: Math.min(totalMonths, 120) }, (_, i) => ({
    month: i + 1,
    label: (i + 1) % 12 === 0 ? `Г${Math.floor(i / 12) + 1}` : '',
    cows: herd.cows?.eop?.[i] ?? 0,
    bulls: herd.bulls?.eop?.[i] ?? 0,
    heifers: herd.heifers?.eop?.[i] ?? 0,
    steers: herd.steers?.eop?.[i] ?? 0,
  }))

  // ============================================================
  // ANNUAL VIEW
  // ============================================================
  const renderAnnual = () => {
    const years = getYearLabels(calYears)
    const data = resolveAnnual(herd, calYears!)
    const rows = buildRows(data)
    return renderTable(rows, years.map(String), 'text-sm')
  }

  // ============================================================
  // MONTHLY VIEW
  // ============================================================
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

    const data = resolveMonthly(herd)
    const rows = buildRows(data)
    // Trim all row values to n months
    for (const r of rows) {
      if (r.values.length > n) r.values = r.values.slice(0, n)
    }
    return renderTable(rows, monthLabels, 'text-xs')
  }

  return (
    <div className="page space-y-4">
      {/* Herd composition chart */}
      <Card>
        <CardHeader>
          <CardTitle>Динамика поголовья</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="gradCows" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradBulls" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradHeifers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-3)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--chart-3)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradSteers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-4)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--chart-4)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                interval={11}
                tickLine={false}
                className="text-muted-foreground"
              />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} className="text-muted-foreground" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: 12,
                }}
                labelFormatter={(_, payload) => {
                  if (payload?.[0]?.payload) {
                    const m = payload[0].payload.month
                    return `Месяц ${m}`
                  }
                  return ''
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="cows"
                name="Маточное"
                stackId="1"
                stroke="var(--chart-1)"
                fill="url(#gradCows)"
              />
              <Area
                type="monotone"
                dataKey="bulls"
                name="Быки"
                stackId="1"
                stroke="var(--chart-2)"
                fill="url(#gradBulls)"
              />
              <Area
                type="monotone"
                dataKey="heifers"
                name="Тёлки"
                stackId="1"
                stroke="var(--chart-3)"
                fill="url(#gradHeifers)"
              />
              <Area
                type="monotone"
                dataKey="steers"
                name="Бычки"
                stackId="1"
                stroke="var(--chart-4)"
                fill="url(#gradSteers)"
              />
            </AreaChart>
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
        <CardHeader>
          <CardTitle>
            {view === 'annual' ? 'Оборот стада (календарный год)' : 'Оборот стада (помесячно, 120 мес.)'}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {view === 'annual' ? renderAnnual() : renderMonthly()}
        </CardContent>
      </Card>
    </div>
  )
}
