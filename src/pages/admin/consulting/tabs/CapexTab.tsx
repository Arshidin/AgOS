import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useProjectData, fmt } from './usProjectData'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
]

const RADIAN = Math.PI / 180
function renderLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx: number
  cy: number
  midAngle: number
  innerRadius: number
  outerRadius: number
  percent: number
}) {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  if (percent < 0.03) return null
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export function CapexTab() {
  const { results, version, loading } = useProjectData()
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

  const BLOCKS: { key: string; title: string }[] = [
    { key: 'farm', title: 'Основная ферма' },
    { key: 'pasture', title: 'Пастбища' },
    { key: 'equipment', title: 'Техника' },
    { key: 'tools', title: 'Инструменты' },
  ]

  const pieData = [
    { name: 'Ферма', value: results.capex?.farm?.total || 0, fill: COLORS[0] },
    { name: 'Пастбища', value: results.capex?.pasture?.total || 0, fill: COLORS[1] },
    { name: 'Техника', value: results.capex?.equipment?.total || 0, fill: COLORS[2] },
    { name: 'Инструменты', value: results.capex?.tools?.total || 0, fill: COLORS[3] },
  ].filter((d) => d.value > 0)

  return (
    <div className="page space-y-4">
      {/* Pie chart: cost distribution */}
      {pieData.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Распределение капитальных затрат</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  outerRadius={110}
                  dataKey="value"
                  labelLine={false}
                  label={renderLabel}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${fmt(value, 0)} тг`, '']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  wrapperStyle={{ fontSize: 13 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Existing capex tables */}
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
