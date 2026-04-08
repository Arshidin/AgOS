import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useProjectData, fmt } from './usProjectData'

export function CapexTab() {
  const { results, version, loading } = useProjectData()
  if (loading) return <Skeleton className="h-48 w-full rounded-xl" />
  if (!version) return <p className="page text-muted-foreground">Нет данных. Запустите расчёт.</p>

  const BLOCKS: { key: string; title: string }[] = [
    { key: 'farm', title: 'Основная ферма' },
    { key: 'pasture', title: 'Пастбища' },
    { key: 'equipment', title: 'Техника' },
    { key: 'tools', title: 'Инструменты' },
  ]

  return (
    <div className="page space-y-4">
      {BLOCKS.map(({ key, title }) => {
        const data = results.capex?.[key]
        if (!data?.items?.length) return null
        return (
          <Card key={key}>
            <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <tbody>
                  {data.items.map((item: any, i: number) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="py-1.5 text-muted-foreground">{item.name || item.code}</td>
                      <td className="py-1.5 text-right font-mono">{fmt(item.cost)} тг</td>
                    </tr>
                  ))}
                  <tr className="font-medium">
                    <td className="py-2">Итого</td>
                    <td className="py-2 text-right font-mono">
                      {fmt(data.total || data.items.reduce((s: number, i: any) => s + (i.cost || 0), 0))} тг
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        )
      })}
      <Card>
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">CAPEX Итого</p>
          <p className="mt-1 font-mono text-xl font-semibold">{fmt(results.capex?.grand_total)} тг</p>
        </CardContent>
      </Card>
    </div>
  )
}
