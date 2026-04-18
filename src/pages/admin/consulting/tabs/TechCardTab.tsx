import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ClipboardList } from 'lucide-react'
import { useProjectData } from './usProjectData'

const PHASE_COLORS: Record<string, string> = {
  quarantine: '#9E9E9E',
  pre_breeding: '#A5D6A7',
  breeding: '#66BB6A',
  gestation: '#CE93D8',
  calving: '#FF8A65',
  suckling: '#FFF9C4',
  weaning: '#FFD54F',
  fattening: '#FFB74D',
  sale: '#EF9A9A',
}

const PHASE_LABELS: Record<string, string> = {
  quarantine: 'Карантин + адаптация',
  pre_breeding: 'Подготовка к случке',
  breeding: 'Случная кампания',
  gestation: 'Стельность',
  calving: 'Отёл',
  suckling: 'Подсосный период',
  weaning: 'Отъём телят',
  fattening: 'Доращивание',
  sale: 'Выбраковка / реализация',
}

const MONTHS_RU_SHORT = ['Я','Ф','М','А','М','И','И','А','С','О','Н','Д']

export function TechCardTab() {
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
  if (!version) return (
    <div className="page">
      <Card>
        <CardContent className="flex flex-col items-center py-12">
          <ClipboardList className="mb-4 h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">Нет данных. Запустите расчёт.</p>
        </CardContent>
      </Card>
    </div>
  )

  const tc = results.tech_card
  const timeline = results.timeline
  if (!tc?.phases || !timeline) {
    return (
      <div className="page">
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <ClipboardList className="mb-4 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">Технологическая карта не рассчитана.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  interface Phase {
    name: string
    name_ru: string
    start_month: number
    end_month: number
    cycle: number
    color: string
  }

  const phases: Phase[] = tc.phases
  const dates: string[] = timeline.dates || []
  const calYears: number[] = timeline.calendar_year || []
  const params = tc.params || {}

  // Show 4 years (48 months) max
  const totalMonths = Math.min(dates.length, 48)

  // Build year boundaries for grid
  const yearBounds: { year: number; startIdx: number; count: number }[] = []
  let curYear = calYears[0]
  let curStart = 0
  for (let i = 0; i <= totalMonths; i++) {
    const y = i < totalMonths ? calYears[i] : -1
    if (y !== curYear || i === totalMonths) {
      if (curYear != null) yearBounds.push({ year: curYear, startIdx: curStart, count: i - curStart })
      curYear = y
      curStart = i
    }
  }

  // Group phases into rows by process type, showing as horizontal bars
  const processOrder = ['quarantine', 'pre_breeding', 'breeding', 'gestation', 'calving', 'suckling', 'weaning', 'fattening', 'sale']
  const activeProcesses = processOrder.filter(p => phases.some(ph => ph.name === p))

  return (
    <div className="page space-y-4">
      {/* Params */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Параметры производственного цикла</CardTitle>
          <CardDescription>Ключевые сроки и режимы производственного процесса</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
            <div><span className="text-muted-foreground">Отёл:</span> {params.calving_scenario}</div>
            <div><span className="text-muted-foreground">Случка:</span> {params.breeding_duration_months} мес</div>
            <div><span className="text-muted-foreground">Стельность:</span> {params.gestation_months} мес</div>
            <div><span className="text-muted-foreground">Подсос:</span> {params.suckling_months} мес</div>
            <div><span className="text-muted-foreground">Доращивание:</span> {params.fattening_enabled ? `${params.fattening_months} мес` : '—'}</div>
          </div>
        </CardContent>
      </Card>

      {/* Gantt chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Технологическая карта (первые {yearBounds.length} года)</CardTitle>
          <CardDescription>Гант-диаграмма производственных этапов по месяцам</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto pb-2">
          <div className="min-w-[700px]">
            {/* Year + month headers */}
            <div className="flex">
              <div className="w-[160px] shrink-0" />
              <div className="flex flex-1">
                {yearBounds.map(yb => (
                  <div
                    key={yb.year}
                    className="text-center text-xs font-semibold text-muted-foreground border-l border-border py-1"
                    style={{ width: `${(yb.count / totalMonths) * 100}%` }}
                  >
                    {yb.year}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex">
              <div className="w-[160px] shrink-0" />
              <div className="flex flex-1">
                {Array.from({ length: totalMonths }, (_, i) => {
                  const d = dates[i]
                  const m = d ? parseInt(d.split('-')[1] ?? '1') - 1 : i % 12
                  return (
                    <div
                      key={i}
                      className="text-center text-[10px] text-muted-foreground border-l border-border/30 py-0.5"
                      style={{ width: `${100 / totalMonths}%` }}
                    >
                      {MONTHS_RU_SHORT[m]}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Process rows */}
            {activeProcesses.map(procName => {
              const procPhases = phases.filter(p => p.name === procName)
              return (
                <div key={procName} className="flex items-center border-t border-border/20" style={{ minHeight: 32 }}>
                  <div className="w-[160px] shrink-0 px-2 py-1 text-xs text-muted-foreground truncate">
                    {PHASE_LABELS[procName] || procName}
                  </div>
                  <div className="relative flex-1" style={{ height: 28 }}>
                    {procPhases.map((phase, idx) => {
                      if (phase.start_month > totalMonths) return null
                      const startPct = ((phase.start_month - 1) / totalMonths) * 100
                      const endMonth = Math.min(phase.end_month, totalMonths)
                      const widthPct = ((endMonth - phase.start_month + 1) / totalMonths) * 100
                      const bg = phase.color || PHASE_COLORS[procName] || '#E0E0E0'
                      const duration = phase.end_month - phase.start_month + 1
                      return (
                        <div
                          key={idx}
                          className="absolute top-1 rounded-sm flex items-center justify-center"
                          style={{
                            left: `${startPct}%`,
                            width: `${widthPct}%`,
                            height: 20,
                            backgroundColor: bg,
                            minWidth: 4,
                          }}
                          title={`${PHASE_LABELS[procName]} · мес ${phase.start_month}–${phase.end_month} (${duration} мес) · цикл ${phase.cycle}`}
                        >
                          {widthPct > 4 && (
                            <span className="text-[9px] font-medium text-gray-700 truncate px-1">
                              {duration > 1 ? `${duration}м` : ''}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap gap-4 text-xs">
            {activeProcesses.map(name => (
              <div key={name} className="flex items-center gap-1.5">
                <div className="h-3.5 w-5 rounded-sm" style={{ backgroundColor: PHASE_COLORS[name] || '#E0E0E0' }} />
                <span className="text-muted-foreground">{PHASE_LABELS[name]}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key events */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Ключевые даты</CardTitle>
          <CardDescription>Месяцы отёлов, случки и реализации в рамках проекта</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {[
            { label: 'Отёлы', months: tc.calving_months },
            { label: 'Случка', months: tc.breeding_months },
            { label: 'Реализация', months: tc.sale_months },
          ].map(({ label, months }) => (
            <div key={label}>
              <span className="text-muted-foreground">{label}:</span>{' '}
              {(months || []).slice(0, 6).map((m: number) => {
                const d = dates[m - 1]
                if (!d) return `М${m}`
                const parts = d.split('-')
                const MONTHS_RU = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек']
                return `${MONTHS_RU[parseInt(parts[1] ?? '1') - 1]} ${parts[0]}`
              }).join(' → ')}
              {(months || []).length > 6 && ' → ...'}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
