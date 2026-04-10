/**
 * RationTab — Кормовая модель консалтингового проекта
 *
 * Показывает:
 * 1. Сводку COGS по кормам (₸/мес на всё стадо)
 * 2. Таблицу рационов по 5 кормовым группам (пастбище / стойло)
 * 3. Годовую потребность в кормах (тонны)
 *
 * 5 кормовых групп (не 10 категорий!):
 *   COW           — Маточное поголовье
 *   SUCKLING_CALF — Молодняк (телята)
 *   HEIFER_YOUNG  — Тёлки
 *   STEER         — Бычки
 *   BULL_BREEDING — Быки-производители
 *
 * _CULL категории НЕ являются отдельными кормовыми группами.
 * Данные из feeding модели движка (results.feeding).
 */
import { useProjectData, fmt } from './usProjectData'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { TrendingDown, Wheat, Info } from 'lucide-react'

// ─── Feed Groups ─────────────────────────────────────────────────────────────

interface FeedGroup {
  key: string
  label: string
  herdKey: string
  herdMetric: 'eop' | 'avg'
  feedingGroup: string  // key in results.feeding.groups
}

const FEED_GROUPS: FeedGroup[] = [
  { key: 'COW',           label: 'Маточное поголовье',  herdKey: 'cows',    herdMetric: 'eop', feedingGroup: 'cows_12m' },
  { key: 'SUCKLING_CALF', label: 'Молодняк (телята)',   herdKey: 'calves',  herdMetric: 'avg', feedingGroup: 'molodnyak' },
  { key: 'HEIFER_YOUNG',  label: 'Тёлки',               herdKey: 'heifers', herdMetric: 'avg', feedingGroup: 'heifers_prev' },
  { key: 'STEER',         label: 'Бычки',               herdKey: 'steers',  herdMetric: 'avg', feedingGroup: 'fattening_commercial' },
  { key: 'BULL_BREEDING', label: 'Быки-производители',  herdKey: 'bulls',   herdMetric: 'eop', feedingGroup: 'bulls' },
]

const FEED_NAMES: Record<string, string> = {
  green_mass: 'Зелёная масса',
  hay: 'Сено',
  straw: 'Солома',
  haylage: 'Сенаж',
  silage: 'Силос',
  concentrates: 'Концентраты',
  salt: 'Соль',
  bran_meal: 'Отруби/шрот',
  milk: 'Молоко',
  barley_meal: 'Дерть ячменная',
  feed_phosphate: 'Кормофос',
  senazh: 'Сенаж',
  daf: 'ДАФ',
  mkf: 'МКФ',
  bmvd: 'БМВД',
  grain_waste: 'Зерноотходы',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getAvgHeadCount(herd: any, herdKey: string, metric: string): number {
  const arr = herd?.[herdKey]?.[metric]
  if (!arr || !Array.isArray(arr) || arr.length === 0) return 0
  const slice = arr.slice(0, 12)
  return slice.reduce((a: number, b: number) => a + (b ?? 0), 0) / slice.length
}

function sumYear(arr: number[] | undefined, year: number): number {
  if (!arr) return 0
  const start = year * 12
  const end = Math.min(start + 12, arr.length)
  return arr.slice(start, end).reduce((a, b) => a + Math.abs(b ?? 0), 0)
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function RationTab() {
  const { results, version, loading } = useProjectData()

  if (loading) return <Skeleton className="h-48 w-full rounded-xl" />
  if (!version) return <p className="page text-muted-foreground">Нет данных. Запустите расчёт.</p>

  const herd = results.herd || {}
  const feeding = results.feeding || {}
  const feedSource = feeding._source || 'hardcoded_defaults'
  const groups = feeding.groups || {}
  const annualFeedSummary = feeding.annual_feed_summary || {}
  const annualCostSummary = feeding.annual_feed_cost_summary || []

  // Total monthly COGS (first 12 months average)
  const totalReproducer = feeding.total_reproducer || []
  const totalFattening = feeding.total_fattening || []
  const year1FeedCost = sumYear(totalReproducer, 0) + sumYear(totalFattening, 0)
  const avgMonthlyCost = year1FeedCost / Math.min(12, totalReproducer.length || 1)

  // Source badge
  const sourceLabel = feedSource === 'consulting_rations' ? 'NASEM'
    : feedSource === 'feed_consumption_norms' ? 'Нормы'
    : 'Нормативные (CFC)'

  return (
    <div className="page space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">Кормовая модель</h2>
        <p className="text-sm text-muted-foreground">
          Рационы по 5 кормовым группам. Стоимость и потребность рассчитаны движком на 10 лет.
        </p>
      </div>

      {/* ── COGS Summary ── */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Себестоимость кормов (Год 1)</span>
              <Badge variant="outline" className="text-[10px] h-5">{sourceLabel}</Badge>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold">
                {fmt(year1FeedCost, 0)} <span className="text-sm font-normal text-muted-foreground">тыс. ₸/год</span>
              </div>
              <div className="text-xs text-muted-foreground">
                ~{fmt(avgMonthlyCost, 0)} тыс. ₸/мес
              </div>
            </div>
          </div>
          <div className="mt-2 flex items-start gap-1.5">
            <Info className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Инфляция кормов 10.5%/год. Все значения в тыс. тенге. Отражается в P&L → строка «Корма».
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Per-Group Cost Table ── */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Стоимость кормов по группам (тыс. ₸)</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">Группа</th>
                <th className="px-2 py-2 text-right font-medium w-20">Голов</th>
                <th className="px-2 py-2 text-right font-medium w-28">Год 1</th>
                <th className="px-2 py-2 text-right font-medium w-28">Год 2</th>
                <th className="px-2 py-2 text-right font-medium w-28">Год 3</th>
                <th className="px-2 py-2 text-right font-medium w-28">Год 5</th>
                <th className="px-2 py-2 text-right font-medium w-28">Год 10</th>
              </tr>
            </thead>
            <tbody>
              {FEED_GROUPS.map(g => {
                const arr = groups[g.feedingGroup]
                const heads = Math.round(getAvgHeadCount(herd, g.herdKey, g.herdMetric))
                const hasData = arr && arr.some((v: number) => v !== 0)

                return (
                  <tr key={g.key} className="border-b border-border/30 hover:bg-muted/20">
                    <td className="px-4 py-2">
                      <div className="font-medium text-sm">{g.label}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{g.key}</div>
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-muted-foreground">
                      {heads || '—'}
                    </td>
                    {[0, 1, 2, 4, 9].map(yr => (
                      <td key={yr} className="px-2 py-2 text-right font-mono">
                        {hasData ? fmt(sumYear(arr, yr), 0) : '—'}
                      </td>
                    ))}
                  </tr>
                )
              })}
              {/* Totals row */}
              <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                <td className="px-4 py-2">Итого</td>
                <td className="px-2 py-2 text-right font-mono">
                  {Math.round(FEED_GROUPS.reduce((s, g) => s + getAvgHeadCount(herd, g.herdKey, g.herdMetric), 0))}
                </td>
                {[0, 1, 2, 4, 9].map(yr => (
                  <td key={yr} className="px-2 py-2 text-right font-mono">
                    {fmt((annualCostSummary[yr] ?? 0), 0)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ── Feed Quantities (tonnes/year) ── */}
      {Object.keys(annualFeedSummary).length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <div className="flex items-center gap-2">
              <Wheat className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm">Потребность в кормах (тонн/год)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="px-4 py-2 text-left font-medium">Корм</th>
                  <th className="px-2 py-2 text-right font-medium w-24">Год 1</th>
                  <th className="px-2 py-2 text-right font-medium w-24">Год 2</th>
                  <th className="px-2 py-2 text-right font-medium w-24">Год 3</th>
                  <th className="px-2 py-2 text-right font-medium w-24">Год 5</th>
                  <th className="px-2 py-2 text-right font-medium w-24">Год 10</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(annualFeedSummary)
                  .filter(([, vals]: [string, any]) => Array.isArray(vals) && vals.some((v: number) => v > 0))
                  .sort(([, a]: [string, any], [, b]: [string, any]) => (b[0] || 0) - (a[0] || 0))
                  .map(([feed, vals]: [string, any]) => (
                    <tr key={feed} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="px-4 py-1.5">
                        {FEED_NAMES[feed] || feed}
                      </td>
                      {[0, 1, 2, 4, 9].map(yr => (
                        <td key={yr} className="px-2 py-1.5 text-right font-mono">
                          {fmt(vals[yr] ?? 0, 1)}
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ── How it works ── */}
      <Card className="border-border/50">
        <CardContent className="py-3 px-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>Как считается:</strong> Движок использует нормативные рационы (кг/гол/день) из CFC модели,
            раздельно для пастбищного (май–окт) и стойлового (ноя–апр) сезонов.
            Стоимость = цена × кг/день × дней в месяце × поголовье.
            Цены кормов индексируются на 10.5% в год.
            Поголовье берётся из модуля «Оборот стада».
            {feedSource === 'consulting_rations' && ' Используются NASEM-рационы, привязанные к проекту.'}
            {feedSource === 'feed_consumption_norms' && ' Используются нормы кормления из справочника.'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
