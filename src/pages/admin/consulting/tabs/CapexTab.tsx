import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useRpc } from '@/hooks/useRpc'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { calculateProject } from '@/lib/consulting-api'
import { toast } from 'sonner'
import { useProjectData, fmt, cacheResults } from './usProjectData'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

/** ADR-CAPEX-01: shape of per-item override row saved to consulting_projects.infra_items_override. */
interface OverrideRow {
  code: string
  include?: boolean
  qty_override?: number
  material_override?: string
  unit_cost_override?: number
}

/** Shape of each item emitted by capex.py Priority 2 path. Legacy Priority 3 items have a subset. */
interface CapexItem {
  code: string
  name?: string
  cost: number
  cost_model?: string
  applies_to?: string
  material_target?: string | null
  material_resolved?: string | null
  depreciation_years?: number
  qty?: number | null
  area_m2?: number | null
  calving_multiplier?: number
  included?: boolean
}

interface Material {
  code: string
  name_ru: string
  cost_per_m2: number
}

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
  const { organization } = useAuth()
  const { projectId } = useParams()
  const { results, version, loading, refetch } = useProjectData()
  const { data: materialsData } = useRpc<Material[]>('rpc_list_construction_materials', {})
  const orgId = organization?.id

  const [overrides, setOverrides] = useState<OverrideRow[]>([])
  const [saving, setSaving] = useState(false)
  const initialOverridesRef = useRef<string>('[]')

  // Seed local overrides from the last saved version (calculate.py injects
  // project-row infra_items_override into input_params before persistence,
  // so version.input_params is the authoritative snapshot).
  useEffect(() => {
    const existing: OverrideRow[] = version?.input_params?.infra_items_override || []
    setOverrides(existing)
    initialOverridesRef.current = JSON.stringify(existing)
  }, [version])

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

  const materials: Material[] = materialsData || []
  const priority = results.capex?.priority_used
  const isLegacy = priority !== 2  // Priority 3 fallback OR missing → disable editing
  const editingDisabled = isLegacy || saving
  const isDirty = JSON.stringify(overrides) !== initialOverridesRef.current

  const overrideByCode = new Map(overrides.map(o => [o.code, o]))

  function upsertOverride(code: string, patch: Partial<OverrideRow>) {
    setOverrides(prev => {
      const existing = prev.find(o => o.code === code) || { code }
      const merged: OverrideRow = { ...existing, ...patch }
      // If all editable fields are now undefined → remove the entry (back to defaults).
      const hasContent =
        merged.include === false ||
        merged.qty_override !== undefined ||
        merged.material_override !== undefined ||
        merged.unit_cost_override !== undefined
      const filtered = prev.filter(o => o.code !== code)
      return hasContent ? [...filtered, merged] : filtered
    })
  }

  function handleReset() {
    try {
      setOverrides(JSON.parse(initialOverridesRef.current) as OverrideRow[])
    } catch {
      setOverrides([])
    }
  }

  async function handleSave() {
    if (!orgId || !projectId) return
    const inputParams = version?.input_params
    if (!inputParams) {
      toast.error('Нет параметров для пересчёта. Откройте вкладку Параметры и запустите расчёт.')
      return
    }

    setSaving(true)
    try {
      // Step 1: write overrides to consulting_projects. Materials are not
      // touched here (wizard owns them) — pass null so coalesce preserves.
      const { error: saveError } = await supabase.rpc('rpc_save_project_infra_override', {
        p_organization_id: orgId,
        p_project_id: projectId,
        p_enclosed: null,
        p_support: null,
        p_overrides: overrides,
      })
      if (saveError) {
        toast.error(saveError.message || 'Ошибка сохранения')
        return
      }

      toast.success('Сохранено. Пересчитываю…')

      // Step 2: trigger recalculation. calculate.py reads the fresh override
      // from the project row and injects into input_params before engine run.
      const result = await calculateProject({
        project_id: projectId,
        organization_id: orgId,
        input_params: inputParams,
      })
      cacheResults(projectId, result.results, inputParams)
      await refetch()
      initialOverridesRef.current = JSON.stringify(overrides)
      toast.success(`Пересчёт готов (версия ${result.version_number})`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка пересчёта'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

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

  const materialsUsed = results.capex?.materials_used
  const enclosedName = materialsUsed ? getMaterialName(materials, materialsUsed.enclosed) : null
  const supportName = materialsUsed ? getMaterialName(materials, materialsUsed.support) : null

  return (
    <div className={`page space-y-4 ${isDirty ? 'pb-28' : ''}`}>

      {/* Legacy banner — Priority 3 result or unrecalced post-seed project */}
      {isLegacy && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-medium">Старая модель CAPEX</p>
              <p className="text-muted-foreground mt-1">
                Проект был рассчитан до обновления методики ADR-CAPEX-01.
                Редактирование позиций и материалов появится после пересчёта.
                Откройте вкладку «Параметры» и нажмите «Рассчитать».
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pie chart — works in both Priority 2 and Priority 3 */}
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

      {/* Per-block editable tables */}
      {BLOCKS.map(({ key, title }) => {
        const data = results.capex?.[key] as
          | { items: CapexItem[]; subtotal?: number; work_surcharge?: number; contingency?: number; total: number }
          | undefined
        if (!data?.items?.length) return null

        return (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{title}</span>
                <span className="text-xs text-muted-foreground font-normal">{data.items.length} позиций</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b">
                    <th className="w-8 py-1.5 font-normal"></th>
                    <th className="text-left py-1.5 font-normal">Позиция</th>
                    <th className="text-left py-1.5 font-normal hidden md:table-cell">Модель</th>
                    <th className="text-right py-1.5 font-normal w-28">Кол-во/Площадь</th>
                    <th className="text-left py-1.5 font-normal w-40">Материал</th>
                    <th className="text-right py-1.5 font-normal w-32">Стоимость</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item: CapexItem) => {
                    const ov = overrideByCode.get(item.code) || { code: item.code }
                    const included = ov.include !== false
                    const modelLabel = formatModelLabel(item)
                    const qtyDisplay = formatQty(item, ov)
                    const materialSelectable =
                      !isLegacy && item.material_target !== null && item.material_target !== undefined
                    const materialValue = ov.material_override || 'DEFAULT'

                    return (
                      <tr key={item.code} className={`border-b border-border/20 ${!included ? 'opacity-40' : ''}`}>
                        <td className="py-1.5">
                          <Checkbox
                            checked={included}
                            disabled={editingDisabled}
                            onCheckedChange={(checked) => {
                              // checked === true → remove include=false override
                              // checked === false → persist include: false
                              upsertOverride(item.code, { include: checked === false ? false : undefined })
                            }}
                            aria-label={`Включить ${item.name}`}
                          />
                        </td>
                        <td className="py-1.5 max-w-[320px]">
                          <div className="flex items-baseline gap-2">
                            <span className="text-[10px] text-muted-foreground font-mono">{item.code}</span>
                            <span className="truncate">{item.name || item.code}</span>
                          </div>
                          {/* Model badge on mobile (fallback when column hidden) */}
                          <span className="md:hidden inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground mt-0.5">
                            {modelLabel}
                          </span>
                        </td>
                        <td className="py-1.5 hidden md:table-cell">
                          <span className="inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {modelLabel}
                          </span>
                        </td>
                        <td className="py-1.5 text-right font-mono text-xs">
                          {qtyDisplay.editable ? (
                            <Input
                              type="number"
                              min={0}
                              step={qtyDisplay.step || 1}
                              className="w-20 h-7 ml-auto text-right font-mono text-xs"
                              value={ov.qty_override ?? qtyDisplay.defaultValue ?? 0}
                              disabled={editingDisabled || !included}
                              onChange={e => {
                                const raw = e.target.value
                                if (raw === '') {
                                  upsertOverride(item.code, { qty_override: undefined })
                                  return
                                }
                                const n = Number(raw)
                                if (Number.isNaN(n)) return
                                const same = n === qtyDisplay.defaultValue
                                upsertOverride(item.code, { qty_override: same ? undefined : n })
                              }}
                            />
                          ) : (
                            <span className="text-muted-foreground">{qtyDisplay.label}</span>
                          )}
                        </td>
                        <td className="py-1.5">
                          {materialSelectable ? (
                            <Select
                              value={materialValue}
                              disabled={editingDisabled || !included}
                              onValueChange={(v: string) => {
                                upsertOverride(item.code, {
                                  material_override: v === 'DEFAULT' ? undefined : v,
                                })
                              }}
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="DEFAULT">
                                  По умолчанию ({materialTargetLabel(item.material_target)})
                                </SelectItem>
                                {materials.map(m => (
                                  <SelectItem key={m.code} value={m.code}>
                                    {m.name_ru} · {m.cost_per_m2.toLocaleString('ru-RU')} ₸/м²
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-1.5 text-right font-mono">
                          {included ? fmt(item.cost) : <span className="text-muted-foreground">0</span>}
                        </td>
                      </tr>
                    )
                  })}
                  {data.subtotal !== undefined && (
                    <tr className="text-xs text-muted-foreground">
                      <td colSpan={5} className="py-1 text-right">Subtotal</td>
                      <td className="py-1 text-right font-mono">{fmt(data.subtotal)}</td>
                    </tr>
                  )}
                  {data.work_surcharge ? (
                    <tr className="text-xs text-muted-foreground">
                      <td colSpan={5} className="py-1 text-right">Работы 6%</td>
                      <td className="py-1 text-right font-mono">{fmt(data.work_surcharge)}</td>
                    </tr>
                  ) : null}
                  {data.contingency ? (
                    <tr className="text-xs text-muted-foreground">
                      <td colSpan={5} className="py-1 text-right">Непредвиденные 2.5%</td>
                      <td className="py-1 text-right font-mono">{fmt(data.contingency)}</td>
                    </tr>
                  ) : null}
                  <tr className="font-medium border-t">
                    <td colSpan={5} className="py-2 text-right">Итого блока</td>
                    <td className="py-2 text-right font-mono">
                      {fmt(data.total || data.items.reduce((s: number, i: CapexItem) => s + (i.cost || 0), 0))}
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
          {materialsUsed && (
            <p className="mt-2 text-xs text-muted-foreground">
              Материалы: закрытые — <strong>{enclosedName}</strong>, вспомогательные — <strong>{supportName}</strong>
              <span className="ml-2 opacity-60">(изменяется в Мастере параметров)</span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Sticky save bar — shown when there are unsaved edits (Priority 2 only) */}
      {isDirty && !isLegacy && (
        <div className="fixed bottom-0 inset-x-0 bg-card border-t shadow-lg z-50">
          <div className="mx-auto max-w-6xl flex items-center justify-between gap-4 p-3">
            <div className="text-sm">
              <span className="font-medium">Несохранённых изменений: {overrides.length}</span>
              <span className="text-muted-foreground ml-2">
                Сохраните — проект пересчитается.
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleReset} disabled={saving}>
                Отмена
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {saving ? 'Сохраняю…' : 'Сохранить и пересчитать'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatModelLabel(item: CapexItem): string {
  switch (item.cost_model) {
    case 'area_per_head':
      return 'м²/гол'
    case 'fixed_area':
      return 'фикс. площадь'
    case 'per_head_unit':
      return 'на голову'
    case 'fixed_qty':
      return 'шт (фикс.)'
    case 'fixed_per_project':
      return 'объект'
    case 'per_area_ha':
      return 'на пастбище'
    default:
      return item.cost_model || '—'
  }
}

/**
 * Which cells are editable in the "Кол-во / Площадь" column. Only fixed_qty
 * and per_head_unit expose a directly editable qty. area_per_head shows the
 * computed area read-only (user adjusts via capacity in the wizard).
 */
function formatQty(
  item: CapexItem,
  ov: OverrideRow,
): { editable: boolean; label: string; defaultValue?: number; step?: string } {
  if (item.cost_model === 'fixed_qty' || item.cost_model === 'per_head_unit') {
    const defaultValue = Number(item.qty ?? 0)
    const current = ov.qty_override ?? defaultValue
    return { editable: true, label: String(current), defaultValue, step: '1' }
  }
  if (item.area_m2 != null) {
    return { editable: false, label: `${Math.round(item.area_m2)} м²` }
  }
  if (item.qty != null) {
    return { editable: false, label: String(item.qty) }
  }
  return { editable: false, label: '—' }
}

function materialTargetLabel(target: string | null | undefined): string {
  if (target === 'enclosed') return 'закрытое'
  if (target === 'support') return 'вспомогательное'
  return 'проекта'
}

function getMaterialName(materials: Material[], code: string | null | undefined): string {
  if (!code) return '—'
  const m = materials.find(x => x.code === code)
  return m?.name_ru || code
}
