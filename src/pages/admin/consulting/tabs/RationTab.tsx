/**
 * Slice 8 Part C-UI: RationTab
 * /admin/consulting/:projectId/ration
 *
 * Per-category NASEM ration builder for consulting projects.
 * Uses calculate-ration Edge Function in consulting context (ADR-FEED-02, D-S8-3).
 * Saves results via rpc_save_consulting_ration (C-RPC-09).
 * Reads existing rations via rpc_get_consulting_rations (C-RPC-10).
 */
import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useRpc } from '@/hooks/useRpc'
import { useAnimalCategoryMappings } from '@/hooks/useAnimalCategoryMappings'
import { useProjectData } from './usProjectData'
import {
  getRelevantCategories,
  getHeadCount,
  getDefaultWeight,
  getDefaultObjective,
  CATEGORY_CODE_TO_HERD,
} from './herdCategoryMapping'
import { SimpleRationEditor } from './SimpleRationEditor'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
// Skeleton import removed (was used only in NASEM CalcDialog mode — DEF-RATION-07)
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { CheckCircle, Circle, Calculator, ChevronDown, ChevronUp, TrendingDown } from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnimalCategory {
  id: string
  code: string
  name_ru: string
  sort_order: number
}

interface FeedItem {
  id: string
  code: string
  name_ru: string
  category: string
  is_validated: boolean
}

interface ConsultingRation {
  ration_version_id: string
  animal_category_id: string
  animal_category_name: string
  animal_category_code: string
  version_number: number
  items: Array<{
    feed_item_id: string
    feed_item_code: string
    quantity_kg_per_day: number
    cost_per_day: number
  }>
  results: {
    total_cost_per_day: number
    total_cost_per_month: number
    nutrients_met: Record<string, boolean>
    deficiencies: string[]
    solver_status: string
  }
  created_at: string
}

const NUTRIENT_LABELS: Record<string, string> = {
  dm_kg: 'СВ', me_mj: 'ОЭ', cp_g: 'СП', ndf_pct: 'НДК', ca_g: 'Ca', p_g: 'P',
}

const OBJECTIVES = [
  { value: 'growth', label: 'Рост' },
  { value: 'maintenance', label: 'Поддержание' },
  { value: 'finishing', label: 'Финишный откорм' },
  { value: 'gestation', label: 'Стельность' },
  { value: 'lactation', label: 'Лактация' },
]

// ─── Main Component ───────────────────────────────────────────────────────────

export function RationTab() {
  const { projectId } = useParams<{ projectId: string }>()
  const { organization } = useAuth()
  // ADR-FEED-05: Simple is the only writer. NASEM is advisory via 🧮 in SimpleRationEditor.
  // DEF-RATION-07: NASEM toggle removed — CalcDialog code preserved below but entry point closed.
  const [calcDialog, setCalcDialog] = useState<{
    categoryId: string
    categoryName: string
    categoryCode: string
    defaultWeight: number
    defaultHeadCount: number
    defaultObjective: string
  } | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const orgId = organization?.id

  const { results } = useProjectData()
  const herd = results?.herd
  const weight = results?.weight

  const { data: allCategories } = useRpc<AnimalCategory[]>('rpc_list_animal_categories', {})
  const { data: feedingGroupData } = useAnimalCategoryMappings('feeding_group')
  const { data: rations, isLoading, refetch } = useRpc<ConsultingRation[]>(
    'rpc_get_consulting_rations',
    { p_organization_id: orgId, p_consulting_project_id: projectId },
    { enabled: !!orgId && !!projectId }
  )

  // DEF-RATION-05: derive relevant categories from feeding_group taxonomy (single source)
  const relevantCategories = useMemo(() => {
    if (!allCategories) return []
    if (!feedingGroupData || feedingGroupData.length === 0) {
      // fallback: use old static-mapping logic
      return getRelevantCategories(herd, allCategories)
    }
    // feeding_group taxonomy defines which categories are feeding groups
    const feedingCodes = new Set(
      feedingGroupData.filter(r => r.is_primary).map(r => r.animal_category_code)
    )
    const feedingCategories = allCategories.filter(c => feedingCodes.has(c.code))
    // Further filter by herd data if available
    return getRelevantCategories(herd, feedingCategories)
  }, [allCategories, feedingGroupData, herd])

  if (!orgId || !projectId) return null

  const rationsByCategory = new Map<string, ConsultingRation>(
    (rations || []).map(r => [r.animal_category_id, r])
  )

  const totalCategories = relevantCategories.length
  const rationCount = rationsByCategory.size
  const totalCogsMontly = [...rationsByCategory.entries()].reduce(
    (sum, [catId, r]) => {
      const cat = relevantCategories.find(c => c.id === catId)
      const headCount = cat ? Math.round(getHeadCount(herd, cat.code)) : 1
      return sum + r.results.total_cost_per_month * headCount
    }, 0
  )

  return (
    <div className="page space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Рационы кормления</h2>
          <p className="text-sm text-muted-foreground">
            Табличный ввод рационов кг/гол/сут. Используйте 🧮 для NASEM-подбора по сезону.
          </p>
        </div>
      </div>

      <SimpleRationEditor
        projectId={projectId}
        orgId={orgId}
        onSaved={() => refetch()}
      />

      {/* COGS Summary — visible in both modes (DEF-RATION-06) */}
      {!isLoading && rationCount > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Расчётный COGS по кормам</span>
                <span className="text-xs text-muted-foreground">
                  ({rationCount} из {totalCategories} {rationCount === totalCategories ? '— все категории' : 'категорий'})
                </span>
              </div>
              <div className="text-right">
                <div className="text-base font-semibold">
                  {totalCogsMontly.toLocaleString('ru-RU')} ₸/мес
                </div>
                <div className="text-xs text-muted-foreground">
                  Применяется в P&L при следующем пересчёте
                </div>
              </div>
            </div>
            {rationCount < totalCategories && (
              <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                {totalCategories - rationCount} {totalCategories - rationCount === 1 ? 'категория без рациона' : 'категорий без рациона'} — P&L использует нормативные значения
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ========== Feed volumes by group & by feed type ========== */}
      {(() => {
        // ── 1. Try engine-computed data first ──────────────────────────────────
        const engineByGroup = results?.feeding?.quantities?.by_group as
          Record<string, Record<string, number[]>> | undefined
        const engineAnnual = results?.feeding?.annual_feed_summary as
          Record<string, number[]> | undefined

        const hasEngineGroups = engineByGroup && Object.keys(engineByGroup).length > 0
        const hasEngineAnnual = engineAnnual && Object.keys(engineAnnual).length > 0

        // ── 2. Client-side fallback: ration items × herd projections ──────────
        // Runs when engine data is absent (project not yet recalculated with
        // DEF-RATION-08). Formula: kg/day × avg_heads_this_year × 365 / 1000 = tonnes/year
        let clientGroups: { key: string; label: string; annual: number[] }[] = []
        let clientFeeds: { name: string; annual: number[] }[] = []

        if (!hasEngineGroups && !hasEngineAnnual && herd && rationsByCategory.size > 0) {
          const grpAcc: Record<string, { label: string; annual: number[] }> = {}
          const feedAcc: Record<string, number[]> = {}

          for (const ration of rationsByCategory.values()) {
            const code = ration.animal_category_code
            const mapping = CATEGORY_CODE_TO_HERD[code]
            if (!mapping) continue

            const herdGrp = (herd as Record<string, Record<string, number[]>>)[mapping.group]
            if (!herdGrp) continue
            const monthArr = herdGrp[mapping.metric]
            if (!Array.isArray(monthArr) || monthArr.length === 0) continue

            const annual = Array<number>(10).fill(0)
            for (let yr = 0; yr < 10; yr++) {
              const slice = monthArr.slice(yr * 12, (yr + 1) * 12)
              if (slice.length === 0) break
              const avgHeads = slice.reduce((a, b) => a + (b ?? 0), 0) / slice.length
              if (avgHeads <= 0) continue

              for (const item of ration.items) {
                const tonnes = (item.quantity_kg_per_day * avgHeads * 365) / 1000
                annual[yr] = (annual[yr] ?? 0) + tonnes

                if (!feedAcc[item.feed_item_code])
                  feedAcc[item.feed_item_code] = Array<number>(10).fill(0)
                feedAcc[item.feed_item_code]![yr] = (feedAcc[item.feed_item_code]![yr] ?? 0) + tonnes
              }
            }

            if (annual.some(v => v > 0.05)) {
              grpAcc[code] = { label: ration.animal_category_name, annual }
            }
          }

          clientGroups = Object.entries(grpAcc)
            .map(([k, v]) => ({ key: k, ...v }))
            .filter(g => g.annual.some(v => v > 0.05))

          clientFeeds = Object.entries(feedAcc)
            .map(([name, annual]) => ({ name, annual }))
            .filter(f => f.annual.some(v => v > 0.05))
            .sort((a, b) => (b.annual[0] ?? 0) - (a.annual[0] ?? 0))
        }

        // ── 3. Merge engine data (if present) ─────────────────────────────────
        const GROUP_LABELS: Record<string, string> = {
          molodnyak:            'Молодняк (телята)',
          heifers_prev:         'Тёлки',
          cows_12m:             'Маточное стадо',
          bulls:                'Быки-производители',
          fattening_breeding:   'Доращивание',
          fattening_commercial: 'Откорм (товарный)',
        }
        const SKIP = new Set(['cows_9m', 'heifers_curr'])

        function toAnnual(arr: number[]): number[] {
          const years: number[] = []
          for (let yr = 0; yr < 10; yr++) {
            const s = yr * 12
            if (s >= arr.length) break
            years.push(arr.slice(s, s + 12).reduce((a, b) => a + (b ?? 0), 0))
          }
          return years
        }

        const groups: { key: string; label: string; annual: number[] }[] = hasEngineGroups
          ? Object.entries(engineByGroup!)
              .filter(([k]) => !SKIP.has(k))
              .map(([k, feeds]) => {
                const monthly = Array<number>(120).fill(0)
                Object.values(feeds).forEach(feedArr =>
                  feedArr?.forEach((v, t) => { monthly[t] = (monthly[t] ?? 0) + (v ?? 0) })
                )
                return { key: k, label: GROUP_LABELS[k] ?? k, annual: toAnnual(monthly) }
              })
              .filter(g => g.annual.some(v => v > 0.05))
          : clientGroups

        const feedRows: { name: string; annual: number[] }[] = hasEngineAnnual
          ? Object.entries(engineAnnual!)
              .map(([name, arr]) => ({ name, annual: arr }))
              .filter(f => f.annual.some(v => v > 0.05))
              .sort((a, b) => (b.annual[0] ?? 0) - (a.annual[0] ?? 0))
          : clientFeeds

        if (groups.length === 0 && feedRows.length === 0) return null

        const numYears = Math.max(
          groups.length > 0 ? groups[0]!.annual.length : 0,
          feedRows.length > 0 ? feedRows[0]!.annual.length : 0,
        )
        const yearHeaders = Array.from({ length: numYears }, (_, i) => `Год ${i + 1}`)

        const groupTotals = Array.from({ length: numYears }, (_, i) =>
          groups.reduce((s, g) => s + (g.annual[i] ?? 0), 0))
        const feedTotals = Array.from({ length: numYears }, (_, i) =>
          feedRows.reduce((s, f) => s + (f.annual[i] ?? 0), 0))

        const isClientSide = !hasEngineGroups && !hasEngineAnnual

        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-0.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Потребность в кормах
              </p>
              {isClientSide && (
                <span className="text-[10px] text-muted-foreground border border-border/50 rounded px-1.5 py-0.5">
                  на основе сохранённых рационов
                </span>
              )}
            </div>

            {/* По группам животных */}
            {groups.length > 0 && (
              <Card>
                <CardHeader className="pb-0 pt-3 px-4">
                  <CardTitle className="text-xs text-muted-foreground font-medium">
                    По группам животных, тн/год
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-0 pb-2 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="px-4 py-2 text-left font-medium min-w-[180px]">Группа</th>
                        {yearHeaders.map(y => (
                          <th key={y} className="px-2 py-2 text-right font-medium whitespace-nowrap">{y}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {groups.map(g => (
                        <tr key={g.key} className="border-b border-border/30 hover:bg-muted/20">
                          <td className="px-4 py-1.5">{g.label}</td>
                          {Array.from({ length: numYears }, (_, i) => (
                            <td key={i} className="px-2 py-1.5 text-right font-mono">
                              {(g.annual[i] ?? 0) > 0.05 ? (g.annual[i]!).toFixed(1) : '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                      <tr className="border-t-2 bg-muted/40 font-semibold">
                        <td className="px-4 py-2">Итого</td>
                        {groupTotals.map((v, i) => (
                          <td key={i} className="px-2 py-2 text-right font-mono">{v.toFixed(1)}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            {/* По видам кормов */}
            {feedRows.length > 0 && (
              <Card>
                <CardHeader className="pb-0 pt-3 px-4">
                  <CardTitle className="text-xs text-muted-foreground font-medium">
                    По видам кормов, тн/год
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-0 pb-2 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="px-4 py-2 text-left font-medium min-w-[180px]">Корм</th>
                        {yearHeaders.map(y => (
                          <th key={y} className="px-2 py-2 text-right font-medium whitespace-nowrap">{y}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {feedRows.map(f => (
                        <tr key={f.name} className="border-b border-border/30 hover:bg-muted/20">
                          <td className="px-4 py-1.5">{f.name}</td>
                          {Array.from({ length: numYears }, (_, i) => (
                            <td key={i} className="px-2 py-1.5 text-right font-mono">
                              {(f.annual[i] ?? 0) > 0.05 ? (f.annual[i]!).toFixed(1) : '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                      <tr className="border-t-2 bg-muted/40 font-semibold">
                        <td className="px-4 py-2">Итого</td>
                        {feedTotals.map((v, i) => (
                          <td key={i} className="px-2 py-2 text-right font-mono">{v.toFixed(1)}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </div>
        )
      })()}

      {/* NASEM CalcDialog mode (preserved, entry point closed per ADR-FEED-05 / DEF-RATION-07) */}
      {false && !isLoading && (
        <div className="space-y-3">
          {relevantCategories.map(cat => {
            const existing = rationsByCategory.get(cat.id)
            const isExpanded = expandedId === cat.id

            return (
              <Card key={cat.id} className="overflow-hidden">
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {existing
                        ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                        : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />}
                      <div>
                        <span className="font-medium text-sm">{cat.name_ru}</span>
                        <span className="ml-2 font-mono text-xs text-muted-foreground">{cat.code}</span>
                        {existing && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            v{existing.version_number} · {new Date(existing.created_at).toLocaleDateString('ru-RU')}
                          </span>
                        )}
                        {herd && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            · {Math.round(getHeadCount(herd, cat.code))} гол. (среднегод.)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {existing && (
                        <>
                          <Badge
                            variant={existing.results.solver_status === 'optimal' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {existing.results.solver_status === 'optimal' ? 'Оптимально' :
                             existing.results.solver_status === 'feasible' ? 'Допустимо' : 'Дефицит'}
                          </Badge>
                          <span className="text-sm font-medium">
                            {existing.results.total_cost_per_day.toLocaleString('ru-RU')} ₸/гол/день
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setExpandedId(isExpanded ? null : cat.id)}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant={existing ? 'outline' : 'default'}
                        onClick={() => setCalcDialog({
                          categoryId: cat.id,
                          categoryName: cat.name_ru,
                          categoryCode: cat.code,
                          defaultWeight: getDefaultWeight(weight, cat.code),
                          defaultHeadCount: Math.round(getHeadCount(herd, cat.code)) || 50,
                          defaultObjective: getDefaultObjective(cat.code),
                        })}
                      >
                        <Calculator className="w-3 h-3 mr-1" />
                        {existing ? 'Пересчитать' : 'Рассчитать'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && existing && (
                  <CardContent className="pt-0 pb-3 px-4">
                    <div className="border-t border-border/50 pt-3 space-y-3">
                      {/* Nutrients */}
                      <div className="flex gap-2 flex-wrap">
                        {Object.entries(existing.results.nutrients_met).map(([key, met]) => (
                          <Badge
                            key={key}
                            variant={met ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {NUTRIENT_LABELS[key] ?? key} {met ? '✓' : '✗'}
                          </Badge>
                        ))}
                      </div>

                      {/* Feed items */}
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Состав рациона</p>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                          {existing.items.map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span className="font-mono text-muted-foreground">{item.feed_item_code}</span>
                              <span>{item.quantity_kg_per_day} кг/день</span>
                              <span className="text-muted-foreground">{item.cost_per_day.toLocaleString('ru-RU')} ₸</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Месячный COGS на голову: <strong>
                          {existing.results.total_cost_per_month.toLocaleString('ru-RU')} ₸
                        </strong>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {calcDialog && (
        <CalcDialog
          projectId={projectId}
          orgId={orgId}
          categoryId={calcDialog.categoryId}
          categoryName={calcDialog.categoryName}
          defaultWeight={calcDialog.defaultWeight}
          defaultHeadCount={calcDialog.defaultHeadCount}
          defaultObjective={calcDialog.defaultObjective}
          hasHerdData={!!herd}
          onClose={() => setCalcDialog(null)}
          onSaved={() => { setCalcDialog(null); refetch() }}
        />
      )}
    </div>
  )
}

// ─── Calc Dialog ──────────────────────────────────────────────────────────────

function CalcDialog({ projectId, orgId, categoryId, categoryName, defaultWeight, defaultHeadCount, defaultObjective, hasHerdData, onClose, onSaved }: {
  projectId: string
  orgId: string
  categoryId: string
  categoryName: string
  defaultWeight: number
  defaultHeadCount: number
  defaultObjective: string
  hasHerdData: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [avgWeight, setAvgWeight] = useState(String(defaultWeight))
  const [headCount, setHeadCount] = useState(String(defaultHeadCount))
  const [objective, setObjective] = useState(defaultObjective)
  const [selectedFeeds, setSelectedFeeds] = useState<string[]>([])
  const [calculating, setCalculating] = useState(false)

  const { data: feedItems } = useRpc<FeedItem[]>('rpc_list_feed_items', { p_active_only: true })

  const toggleFeed = (id: string) =>
    setSelectedFeeds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const handleCalculate = async () => {
    if (!avgWeight || parseFloat(avgWeight) <= 0) return toast.error('Укажите живой вес')
    if (selectedFeeds.length === 0) return toast.error('Выберите корма для расчёта')

    setCalculating(true)
    try {
      const { data, error } = await supabase.functions.invoke('calculate-ration', {
        body: {
          organization_id: orgId,
          consulting_project_id: projectId,
          animal_category_id: categoryId,
          avg_weight_kg: parseFloat(avgWeight),
          head_count: parseInt(headCount) || 1,
          objective,
          feed_item_ids: selectedFeeds,
        },
      })

      if (error || data?.error) {
        // FunctionsHttpError.context is a Response — read body to get actual message
        let errMsg = data?.error || data?.message
        if (!errMsg && (error as any)?.context?.json) {
          try { const body = await (error as any).context.json(); errMsg = body?.error || body?.message } catch (_) {}
        }
        errMsg = errMsg || error?.message || 'Ошибка расчёта'
        console.error('[calculate-ration]', errMsg, error, data)
        toast.error(errMsg)
        return
      }

      toast.success(`Рацион рассчитан · v${data.version_number}`)
      onSaved()
    } catch (err: any) {
      toast.error(err.message || 'Ошибка расчёта')
    } finally {
      setCalculating(false)
    }
  }

  // Group feeds by category
  const grouped = (feedItems || []).reduce<Record<string, FeedItem[]>>((acc, f) => {
    if (!acc[f.category]) acc[f.category] = []
    acc[f.category]!.push(f)
    return acc
  }, {})

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Расчёт рациона — {categoryName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Animal params */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Живой вес (кг)</Label>
              <Input
                type="number" min="1" step="10"
                value={avgWeight} onChange={e => setAvgWeight(e.target.value)}
                className="h-8 text-sm"
              />
              {hasHerdData && (
                <p className="text-[10px] text-muted-foreground">из модели привеса</p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Голов</Label>
              <Input
                type="number" min="1"
                value={headCount} onChange={e => setHeadCount(e.target.value)}
                className="h-8 text-sm"
              />
              {hasHerdData && (
                <p className="text-[10px] text-muted-foreground">из оборота стада</p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Цель</Label>
              <Select value={objective} onValueChange={setObjective}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OBJECTIVES.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Feed selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Выберите корма для расчёта</Label>
              <span className="text-xs text-muted-foreground">{selectedFeeds.length} выбрано</span>
            </div>

            <div className="border border-border rounded-md max-h-52 overflow-y-auto">
              {Object.entries(grouped).map(([cat, feeds]) => (
                <div key={cat}>
                  <div className="px-3 py-1.5 bg-muted/50 text-xs font-medium text-muted-foreground border-b border-border/50">
                    {cat}
                  </div>
                  {feeds.map(f => (
                    <label
                      key={f.id}
                      className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/30 border-b border-border/30 last:border-0"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFeeds.includes(f.id)}
                        onChange={() => toggleFeed(f.id)}
                        className="rounded"
                      />
                      <span className="text-sm flex-1">{f.name_ru}</span>
                      {!f.is_validated && (
                        <Badge variant="outline" className="text-xs h-4">Q37</Badge>
                      )}
                    </label>
                  ))}
                </div>
              ))}
              {Object.keys(grouped).length === 0 && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Нет кормов в каталоге. Добавьте корма в разделе «Кормовая база».
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={calculating}>Отмена</Button>
          <Button onClick={handleCalculate} disabled={calculating || selectedFeeds.length === 0}>
            {calculating ? 'Расчёт...' : 'Рассчитать и сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
