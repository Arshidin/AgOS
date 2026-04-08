import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useProjectData, fmt } from './usProjectData'

/** Aggregate monthly array to annual (sum or last-value) */
function toAnnual(arr: number[] | undefined, mode: 'last' | 'sum' = 'last'): number[] {
  if (!arr || arr.length === 0) return []
  const years: number[] = []
  for (let yr = 0; yr < 10; yr++) {
    const start = yr * 12
    const end = Math.min((yr + 1) * 12, arr.length)
    if (start >= arr.length) break
    if (mode === 'sum') {
      years.push(arr.slice(start, end).reduce((a, b) => a + b, 0))
    } else {
      years.push(arr[end - 1])
    }
  }
  return years
}

export function HerdTab() {
  const { results, version, loading } = useProjectData()
  if (loading) return <Skeleton className="h-48 w-full rounded-xl" />
  if (!version) return <p className="page text-muted-foreground">Нет данных. Запустите расчёт.</p>

  const herd = results.herd || {}
  const years = Math.min(10, Math.ceil((herd.cows?.eop?.length || 0) / 12))
  if (years === 0) return <p className="page text-muted-foreground">Нет данных стада.</p>

  const groups: { name: string; eop: number[]; sold: number[] }[] = [
    {
      name: 'Маточное',
      eop: toAnnual(herd.cows?.eop),
      sold: toAnnual(herd.cows?.culled?.map((v: number) => Math.abs(v)), 'sum'),
    },
    {
      name: 'Быки',
      eop: toAnnual(herd.bulls?.eop),
      sold: toAnnual(herd.bulls?.culled?.map((v: number) => Math.abs(v)), 'sum'),
    },
    {
      name: 'Тёлки',
      eop: toAnnual(herd.heifers?.eop),
      sold: toAnnual(herd.cows?.sold_breeding?.map((v: number) => Math.abs(v)), 'sum'),
    },
    {
      name: 'Бычки',
      eop: toAnnual(herd.steers?.eop),
      sold: toAnnual(herd.steers?.sold?.map((v: number) => Math.abs(v)), 'sum'),
    },
  ]

  const totalEop = groups[0].eop.map((_, i) =>
    groups.reduce((sum, g) => sum + (g.eop[i] || 0), 0)
  )

  const totalSold = groups[0].eop.map((_, i) =>
    groups.reduce((sum, g) => sum + (g.sold[i] || 0), 0)
  )

  // Calves born per year
  const calvesBorn = toAnnual(herd.calves?.born, 'sum')

  return (
    <div className="page space-y-4">
      {/* Поголовье к.п. */}
      <Card>
        <CardHeader><CardTitle>Поголовье на конец периода (голов)</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="border-b">
                <th className="sticky left-0 bg-card px-3 py-2 text-left font-medium text-muted-foreground">Группа</th>
                {Array.from({ length: years }, (_, i) => (
                  <th key={i} className="px-3 py-2 text-right font-medium text-muted-foreground">Год {i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map(g => (
                <tr key={g.name} className="border-b border-border/50">
                  <td className="sticky left-0 bg-card px-3 py-2 text-muted-foreground">{g.name}</td>
                  {g.eop.slice(0, years).map((v, i) => (
                    <td key={i} className="px-3 py-2 text-right">{fmt(v, 0)}</td>
                  ))}
                </tr>
              ))}
              <tr className="border-t-2 font-semibold">
                <td className="sticky left-0 bg-card px-3 py-2">ИТОГО</td>
                {totalEop.slice(0, years).map((v, i) => (
                  <td key={i} className="px-3 py-2 text-right">{fmt(v, 0)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Движение */}
      <Card>
        <CardHeader><CardTitle>Движение стада (голов/год)</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="border-b">
                <th className="sticky left-0 bg-card px-3 py-2 text-left font-medium text-muted-foreground">Показатель</th>
                {Array.from({ length: years }, (_, i) => (
                  <th key={i} className="px-3 py-2 text-right font-medium text-muted-foreground">Год {i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="sticky left-0 bg-card px-3 py-2 text-muted-foreground">Приплод</td>
                {calvesBorn.slice(0, years).map((v, i) => (
                  <td key={i} className="px-3 py-2 text-right">{fmt(v, 0)}</td>
                ))}
              </tr>
              <tr className="border-b border-border/50">
                <td className="sticky left-0 bg-card px-3 py-2 text-muted-foreground">Реализация племенных</td>
                {groups[2].sold.slice(0, years).map((v, i) => (
                  <td key={i} className="px-3 py-2 text-right">{fmt(v, 0)}</td>
                ))}
              </tr>
              <tr className="border-b border-border/50">
                <td className="sticky left-0 bg-card px-3 py-2 text-muted-foreground">Выбраковка коров</td>
                {groups[0].sold.slice(0, years).map((v, i) => (
                  <td key={i} className="px-3 py-2 text-right">{fmt(v, 0)}</td>
                ))}
              </tr>
              <tr className="border-b border-border/50">
                <td className="sticky left-0 bg-card px-3 py-2 text-muted-foreground">Выбраковка быков</td>
                {groups[1].sold.slice(0, years).map((v, i) => (
                  <td key={i} className="px-3 py-2 text-right">{fmt(v, 0)}</td>
                ))}
              </tr>
              <tr className="border-t-2 font-semibold">
                <td className="sticky left-0 bg-card px-3 py-2">Всего реализовано</td>
                {totalSold.slice(0, years).map((v, i) => (
                  <td key={i} className="px-3 py-2 text-right">{fmt(v, 0)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
