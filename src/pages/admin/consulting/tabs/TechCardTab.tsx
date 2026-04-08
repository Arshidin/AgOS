import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useProjectData } from './usProjectData'

/** Phase color from engine */
const PHASE_COLORS: Record<string, string> = {
  quarantine: '#9E9E9E',
  pre_breeding: '#A5D6A7',
  breeding: '#66BB6A',
  gestation: '#CE93D8',
  calving: '#FF8A65',
  suckling: '#FFF176',
  weaning: '#FFD54F',
  fattening: '#FFB74D',
  sale: '#EF9A9A',
}

const PHASE_LABELS: Record<string, string> = {
  quarantine: 'Карантин',
  pre_breeding: 'Подготовка',
  breeding: 'Случка',
  gestation: 'Стельность',
  calving: 'Отёл',
  suckling: 'Подсос',
  weaning: 'Отъём',
  fattening: 'Доращивание',
  sale: 'Реализация',
}

const MONTHS_RU = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек']

export function TechCardTab() {
  const { results, version, loading } = useProjectData()

  if (loading) return <Skeleton className="h-48 w-full rounded-xl" />
  if (!version) return <p className="page text-muted-foreground">Нет данных. Запустите расчёт.</p>

  const tc = results.tech_card
  const timeline = results.timeline
  if (!tc || !tc.phases || !timeline) {
    return <p className="page text-muted-foreground">Технологическая карта не рассчитана.</p>
  }

  const phases: Array<{
    name: string
    name_ru: string
    start_month: number
    end_month: number
    cycle: number
    color: string
  }> = tc.phases
  const dates: string[] = timeline.dates || []
  const totalMonths = Math.min(dates.length, 48) // Show first 4 years for clarity
  const params = tc.params || {}

  // Build month labels
  const monthLabels: string[] = []
  for (let i = 0; i < totalMonths; i++) {
    const d = dates[i]
    if (d) {
      const parts = d.split('-')
      const m = parseInt(parts[1] ?? '1') - 1
      monthLabels.push(MONTHS_RU[m] ?? '')
    } else {
      monthLabels.push('')
    }
  }

  // Year headers
  const calYears: number[] = timeline.calendar_year || []
  const yearSpans: { year: number; start: number; count: number }[] = []
  let currentYear = calYears[0]
  let currentStart = 0
  for (let i = 0; i <= totalMonths; i++) {
    const y = i < totalMonths ? calYears[i] : -1
    if (y !== currentYear || i === totalMonths) {
      if (currentYear != null) {
        yearSpans.push({ year: currentYear, start: currentStart, count: i - currentStart })
      }
      currentYear = y
      currentStart = i
    }
  }

  // Group phases by unique process names (for rows)
  const processNames = [...new Set(phases.map(p => p.name))]

  return (
    <div className="page space-y-4">
      {/* Params summary */}
      <Card>
        <CardHeader><CardTitle>Параметры технологической карты</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
          <div><span className="text-muted-foreground">Сценарий отёла:</span> {params.calving_scenario}</div>
          <div><span className="text-muted-foreground">Карантин:</span> {params.quarantine_months} мес</div>
          <div><span className="text-muted-foreground">Подготовка к случке:</span> {params.pre_breeding_months} мес</div>
          <div><span className="text-muted-foreground">Случка:</span> {params.breeding_duration_months} мес</div>
          <div><span className="text-muted-foreground">Стельность:</span> {params.gestation_months} мес</div>
          <div><span className="text-muted-foreground">Подсосный период:</span> {params.suckling_months} мес</div>
          <div><span className="text-muted-foreground">Доращивание:</span> {params.fattening_enabled ? `${params.fattening_months} мес` : 'Нет'}</div>
        </CardContent>
      </Card>

      {/* Timeline chart */}
      <Card>
        <CardHeader><CardTitle>Технологическая карта (первые 4 года)</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            {/* Year header */}
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-card px-2 py-1 min-w-[120px]"></th>
                {yearSpans.map(ys => (
                  <th
                    key={ys.year}
                    colSpan={ys.count}
                    className="px-0 py-1 text-center font-semibold text-muted-foreground border-l border-border"
                  >
                    {ys.year}
                  </th>
                ))}
              </tr>
              <tr className="border-b">
                <th className="sticky left-0 z-10 bg-card px-2 py-1 text-left font-medium text-muted-foreground">Процесс</th>
                {monthLabels.map((lbl, i) => (
                  <th key={i} className="px-0 py-1 text-center font-medium text-muted-foreground min-w-[32px] border-l border-border/30">
                    {lbl}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {processNames.map(procName => {
                // Find all phases of this process type
                const procPhases = phases.filter(p => p.name === procName)

                return (
                  <tr key={procName} className="border-b border-border/20">
                    <td className="sticky left-0 z-10 bg-card px-2 py-1.5 text-muted-foreground whitespace-nowrap">
                      {PHASE_LABELS[procName] || procName}
                    </td>
                    {Array.from({ length: totalMonths }, (_, monthIdx) => {
                      const mi = monthIdx + 1 // 1-based
                      const activePhase = procPhases.find(
                        p => mi >= p.start_month && mi <= p.end_month
                      )

                      if (activePhase) {
                        const bg = activePhase.color || PHASE_COLORS[procName] || '#E0E0E0'
                        return (
                          <td
                            key={monthIdx}
                            className="px-0 py-1.5 text-center border-l border-border/10"
                            style={{ backgroundColor: bg }}
                            title={`${PHASE_LABELS[procName]} (цикл ${activePhase.cycle}, мес ${mi})`}
                          >
                            <span className="text-[10px] font-medium text-gray-800">{mi}</span>
                          </td>
                        )
                      }
                      return <td key={monthIdx} className="px-0 py-1.5 border-l border-border/10"></td>
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Key events */}
      <Card>
        <CardHeader><CardTitle>Ключевые события</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {tc.calving_months?.length > 0 && (
            <div>
              <span className="text-muted-foreground">Отёлы (месяцы):</span>{' '}
              {tc.calving_months.map((m: number) => {
                const d = dates[m - 1]
                const label = d ? `${MONTHS_RU[parseInt(d.split('-')[1] ?? '1') - 1]} ${d.split('-')[0]}` : `М${m}`
                return label
              }).join(', ')}
            </div>
          )}
          {tc.sale_months?.length > 0 && (
            <div>
              <span className="text-muted-foreground">Реализация (месяцы):</span>{' '}
              {tc.sale_months.map((m: number) => {
                const d = dates[m - 1]
                const label = d ? `${MONTHS_RU[parseInt(d.split('-')[1] ?? '1') - 1]} ${d.split('-')[0]}` : `М${m}`
                return label
              }).join(', ')}
            </div>
          )}
          {tc.breeding_months?.length > 0 && (
            <div>
              <span className="text-muted-foreground">Случка (месяцы):</span>{' '}
              {tc.breeding_months.map((m: number) => {
                const d = dates[m - 1]
                const label = d ? `${MONTHS_RU[parseInt(d.split('-')[1] ?? '1') - 1]} ${d.split('-')[0]}` : `М${m}`
                return label
              }).join(', ')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap gap-3 text-xs">
            {processNames.map(name => (
              <div key={name} className="flex items-center gap-1.5">
                <div
                  className="h-3 w-6 rounded-sm"
                  style={{ backgroundColor: PHASE_COLORS[name] || '#E0E0E0' }}
                />
                <span className="text-muted-foreground">{PHASE_LABELS[name] || name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
