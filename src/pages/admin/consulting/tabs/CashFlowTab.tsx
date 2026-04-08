import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useProjectData, fmt } from './usProjectData'

export function CashFlowTab() {
  const { results, version, loading } = useProjectData()
  if (loading) return <Skeleton className="h-48 w-full rounded-xl" />
  if (!version) return <p className="page text-muted-foreground">Нет данных. Запустите расчёт.</p>

  const groups = ['Операционная', 'Инвестиционная', 'Финансовая', 'Баланс ДС']
  const data: Record<string, number[]> = {
    'Операционная': results.cashflow?.cf_operations || [],
    'Инвестиционная': results.cashflow?.cf_investing || [],
    'Финансовая': results.cashflow?.cf_financing || [],
    'Баланс ДС': results.cashflow?.cash_balance || [],
  }
  const months = Math.min(24, data['Операционная']?.length || 0)

  return (
    <div className="page">
      <Card>
        <CardHeader><CardTitle>Движение денежных средств</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b">
                <th className="sticky left-0 bg-card px-2 py-1.5 text-left font-medium text-muted-foreground">Показатель</th>
                {Array.from({ length: months }, (_, i) => (
                  <th key={i} className="px-2 py-1.5 text-right font-medium text-muted-foreground">М{i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map(g => (
                <tr key={g} className="border-b border-border/50">
                  <td className="sticky left-0 bg-card px-2 py-1 text-muted-foreground">{g}</td>
                  {(data[g] || []).slice(0, months).map((v, i) => (
                    <td key={i} className={`px-2 py-1 text-right ${v < 0 ? 'text-red-400' : ''}`}>{fmt(v, 1)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
