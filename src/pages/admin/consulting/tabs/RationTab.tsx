/**
 * Slice 8 Part C-UI: RationTab
 * /admin/consulting/:projectId/ration
 *
 * Per-category NASEM ration builder for consulting projects.
 * Uses calculate-ration Edge Function in consulting context (ADR-FEED-02, D-S8-3).
 * Saves results via rpc_save_consulting_ration (C-RPC-09).
 * Reads existing rations via rpc_get_consulting_rations (C-RPC-10).
 */
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useRpc } from '@/hooks/useRpc'
import { useProjectData } from './usProjectData'
import {
  getRelevantCategories,
  getHeadCount,
  getDefaultWeight,
  getDefaultObjective,
} from './herdCategoryMapping'
import { SimpleRationEditor } from './SimpleRationEditor'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { CheckCircle, Circle, Calculator, ChevronDown, ChevronUp, TrendingDown, AlertTriangle, Table2 } from 'lucide-react'
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
  const [mode, setMode] = useState<'nasem' | 'simple'>('nasem')
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

  const { data: categories } = useRpc<AnimalCategory[]>('rpc_list_animal_categories', {})
  const { data: rations, isLoading, refetch } = useRpc<ConsultingRation[]>(
    'rpc_get_consulting_rations',
    { p_organization_id: orgId, p_consulting_project_id: projectId },
    { enabled: !!orgId && !!projectId }
  )

  if (!orgId || !projectId) return null

  const relevantCategories = getRelevantCategories(herd, categories || [])

  const rationsByCategory = new Map<string, ConsultingRation>(
    (rations || []).map(r => [r.animal_category_id, r])
  )

  const totalCategories = relevantCategories.length
  const rationCount = rationsByCategory.size
  const totalCogsMontly = [...rationsByCategory.values()].reduce(
    (sum, r) => sum + r.results.total_cost_per_month, 0
  )

  return (
    <div className="page space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Рационы кормления</h2>
          <p className="text-sm text-muted-foreground">
            {mode === 'nasem'
              ? 'NASEM-расчёт по категориям животных. Используется в P&L как точный COGS по кормам.'
              : 'Табличный ввод рационов кг/гол/сут. Корректируйте под регион и условия.'}
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border p-0.5">
          <Button
            variant={mode === 'simple' ? 'default' : 'ghost'}
            size="sm"
            className="text-xs h-7 gap-1"
            onClick={() => setMode('simple')}
          >
            <Table2 className="w-3 h-3" /> Простой
          </Button>
          <Button
            variant={mode === 'nasem' ? 'default' : 'ghost'}
            size="sm"
            className="text-xs h-7 gap-1"
            onClick={() => setMode('nasem')}
          >
            <Calculator className="w-3 h-3" /> NASEM
          </Button>
        </div>
      </div>

      {mode === 'simple' && (
        <SimpleRationEditor
          projectId={projectId}
          orgId={orgId}
          onSaved={() => refetch()}
        />
      )}

      {/* COGS Summary — visible in both modes */}
      {mode === 'nasem' && !isLoading && rationCount > 0 && (
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

      {/* Fallback banner when no herd data */}
      {mode === 'nasem' && !herd && !isLoading && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
          <CardContent className="py-3 px-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Запустите расчёт проекта для фильтрации категорий по стаду и автоподстановки голов/веса.
            </p>
          </CardContent>
        </Card>
      )}

      {mode === 'nasem' && isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      )}

      {mode === 'nasem' && !isLoading && (
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
