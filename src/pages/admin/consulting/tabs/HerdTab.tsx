import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useProjectData, fmt } from './usProjectData'

type ViewMode = 'annual' | 'monthly'

/** Group months by calendar year using timeline.calendar_year */
function toCalendarYear(
  arr: number[] | undefined,
  calYears: number[] | undefined,
  mode: 'last' | 'sum',
): { year: number; value: number }[] {
  if (!arr || !calYears || arr.length === 0) return []
  const yearMap = new Map<number, number[]>()
  for (let i = 0; i < Math.min(arr.length, calYears.length); i++) {
    const y = calYears[i]
    if (!yearMap.has(y)) yearMap.set(y, [])
    yearMap.get(y)!.push(arr[i] ?? 0)
  }
  return Array.from(yearMap.entries()).map(([year, vals]) => ({
    year,
    value: mode === 'sum' ? vals.reduce((a, b) => a + b, 0) : vals[vals.length - 1],
  }))
}

function absArr(arr: number[] | undefined): number[] | undefined {
  return arr?.map(v => Math.abs(v ?? 0))
}

export function HerdTab() {
  const { results, version, loading } = useProjectData()
  const [view, setView] = useState<ViewMode>('annual')

  if (loading) return <Skeleton className="h-48 w-full rounded-xl" />
  if (!version) return <p className="page text-muted-foreground">Нет данных. Запустите расчёт.</p>

  const herd = results.herd || {}
  const timeline = results.timeline || {}
  const calYears: number[] | undefined = timeline.calendar_year
  const dates: string[] | undefined = timeline.dates
  const totalMonths = herd.cows?.eop?.length || 0

  if (totalMonths === 0) return <p className="page text-muted-foreground">Нет данных стада.</p>

  // ============================================================
  // ANNUAL VIEW (calendar year)
  // ============================================================
  const renderAnnual = () => {
    const cowsEop = toCalendarYear(herd.cows?.eop, calYears, 'last')
    const bullsEop = toCalendarYear(herd.bulls?.eop, calYears, 'last')
    const heifersEop = toCalendarYear(herd.heifers?.eop, calYears, 'last')
    const steersEop = toCalendarYear(herd.steers?.eop, calYears, 'last')

    const calvesBorn = toCalendarYear(herd.calves?.born, calYears, 'sum')
    const cowsCulled = toCalendarYear(absArr(herd.cows?.culled), calYears, 'sum')
    const bullsCulled = toCalendarYear(absArr(herd.bulls?.culled), calYears, 'sum')
    const breedSold = toCalendarYear(absArr(herd.cows?.sold_breeding), calYears, 'sum')
    const steersSold = toCalendarYear(absArr(herd.steers?.sold), calYears, 'sum')
    const heifersIn = toCalendarYear(herd.cows?.from_heifers, calYears, 'sum')
    const cowsMort = toCalendarYear(absArr(herd.cows?.mortality), calYears, 'sum')

    const years = cowsEop.map(c => c.year)
    const n = years.length

    type Row = { label: string; values: number[]; bold?: boolean; sep?: boolean }
    const rows: Row[] = [
      { label: 'Маточное к.п.', values: cowsEop.map(v => v.value), bold: true },
      { label: '  + закуп', values: toCalendarYear(herd.cows?.purchased, calYears, 'sum').map(v => v.value) },
      { label: '  + из тёлок', values: heifersIn.map(v => v.value) },
      { label: '  − выбраковка', values: cowsCulled.map(v => v.value) },
      { label: '  − падёж', values: cowsMort.map(v => v.value) },
      { label: '  − продажа племенных', values: breedSold.map(v => v.value) },
      { label: '', values: [], sep: true },
      { label: 'Быки к.п.', values: bullsEop.map(v => v.value), bold: true },
      { label: 'Тёлки к.п.', values: heifersEop.map(v => v.value) },
      { label: 'Бычки к.п.', values: steersEop.map(v => v.value) },
      { label: '', values: [], sep: true },
      { label: 'ИТОГО к.п.', values: cowsEop.map((_, i) =>
        (cowsEop[i]?.value ?? 0) + (bullsEop[i]?.value ?? 0) +
        (heifersEop[i]?.value ?? 0) + (steersEop[i]?.value ?? 0)
      ), bold: true },
      { label: '', values: [], sep: true },
      { label: 'Приплод', values: calvesBorn.map(v => v.value), bold: true },
      { label: 'Реализация бычков', values: steersSold.map(v => v.value) },
      { label: 'Реализация племенных', values: breedSold.map(v => v.value) },
      { label: 'Выбраковка коров', values: cowsCulled.map(v => v.value) },
      { label: 'Выбраковка быков', values: bullsCulled.map(v => v.value) },
      { label: 'Всего реализовано', values: steersSold.map((_, i) =>
        (steersSold[i]?.value ?? 0) + (breedSold[i]?.value ?? 0) +
        (cowsCulled[i]?.value ?? 0) + (bullsCulled[i]?.value ?? 0)
      ), bold: true },
    ]

    return (
      <table className="w-full text-sm font-mono">
        <thead>
          <tr className="border-b">
            <th className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-medium text-muted-foreground min-w-[180px]">Показатель</th>
            {years.map(y => (
              <th key={y} className="px-3 py-2 text-right font-medium text-muted-foreground min-w-[80px]">{y}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            if (row.sep) return <tr key={idx}><td colSpan={n + 1} className="py-1"></td></tr>
            return (
              <tr key={idx} className={`border-b border-border/30 ${row.bold ? 'bg-muted/30' : ''}`}>
                <td className={`sticky left-0 z-10 bg-card px-3 py-1.5 ${row.bold ? 'font-semibold' : 'text-muted-foreground'}`}>{row.label}</td>
                {row.values.slice(0, n).map((v, i) => (
                  <td key={i} className={`px-3 py-1.5 text-right ${row.bold ? 'font-semibold' : ''}`}>{fmt(v, 0)}</td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    )
  }

  // ============================================================
  // MONTHLY VIEW
  // ============================================================
  const renderMonthly = () => {
    const n = Math.min(totalMonths, 120)
    // Show month label as "Авг 26", "Сен 26"...
    const monthLabels: string[] = []
    const MONTHS_RU = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек']
    for (let i = 0; i < n; i++) {
      if (dates && dates[i]) {
        const [y, m] = dates[i].split('-')
        monthLabels.push(`${MONTHS_RU[parseInt(m) - 1]} ${y.slice(2)}`)
      } else {
        monthLabels.push(`М${i + 1}`)
      }
    }

    type MRow = { label: string; values: number[]; bold?: boolean }
    const mRows: MRow[] = [
      { label: 'Маточное к.п.', values: herd.cows?.eop || [], bold: true },
      { label: 'Быки к.п.', values: herd.bulls?.eop || [] },
      { label: 'Тёлки к.п.', values: herd.heifers?.eop || [] },
      { label: 'Бычки к.п.', values: herd.steers?.eop || [] },
      { label: 'Приплод', values: herd.calves?.born || [] },
      { label: 'Тёлки→коровы', values: herd.cows?.from_heifers || [] },
      { label: 'Выбраковка коров', values: absArr(herd.cows?.culled) || [] },
      { label: 'Реал. бычков', values: absArr(herd.steers?.sold) || [] },
      { label: 'Реал. племенных', values: absArr(herd.cows?.sold_breeding) || [] },
    ]

    return (
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="border-b">
            <th className="sticky left-0 z-10 bg-card px-2 py-1.5 text-left font-medium text-muted-foreground min-w-[130px]">Показатель</th>
            {monthLabels.map((lbl, i) => (
              <th key={i} className="px-1.5 py-1.5 text-right font-medium text-muted-foreground whitespace-nowrap">{lbl}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {mRows.map((row, idx) => (
            <tr key={idx} className={`border-b border-border/30 ${row.bold ? 'bg-muted/30' : ''}`}>
              <td className={`sticky left-0 z-10 bg-card px-2 py-1 ${row.bold ? 'font-semibold' : 'text-muted-foreground'}`}>{row.label}</td>
              {row.values.slice(0, n).map((v, i) => (
                <td key={i} className={`px-1.5 py-1 text-right ${(v ?? 0) < -0.01 ? 'text-red-400' : ''}`}>
                  {Math.abs(v ?? 0) < 0.1 ? '' : fmt(v, 0)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  return (
    <div className="page space-y-4">
      {/* View toggle */}
      <div className="flex gap-2">
        <Button size="sm" variant={view === 'annual' ? 'default' : 'outline'} onClick={() => setView('annual')}>
          По годам
        </Button>
        <Button size="sm" variant={view === 'monthly' ? 'default' : 'outline'} onClick={() => setView('monthly')}>
          По месяцам
        </Button>
      </div>

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
