/**
 * SimpleRationEditor — табличный ввод рационов (кг/сут × корм × сезон)
 * Альтернатива NASEM-калькулятору для базового сценария.
 * Сохраняет через rpc_save_consulting_ration.
 */
import { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Save, RotateCcw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRpc } from '@/hooks/useRpc'
import { useAnimalCategoryMappings } from '@/hooks/useAnimalCategoryMappings'
import { toast } from 'sonner'

interface FeedItem {
  id: string
  code: string
  name_ru: string
  category: string
}

interface FeedPrice {
  feed_item_id: string
  price_per_kg: number
}

/** Simplified ration groups matching expert scenario — static fallback (HS-5). */
const RATION_GROUPS = [
  { key: 'COW', label: 'Маточное поголовье', code: 'COW' },
  { key: 'SUCKLING_CALF', label: 'Молодняк (телята)', code: 'SUCKLING_CALF' },
  { key: 'HEIFER_YOUNG', label: 'Тёлки', code: 'HEIFER_YOUNG' },
  { key: 'STEER', label: 'Бычки', code: 'STEER' },
  { key: 'BULL_BREEDING', label: 'Быки-производители', code: 'BULL_BREEDING' },
]

/**
 * TAXONOMY-M3c: UI labels for feeding_group target codes.
 * These are presentation labels — NOT taxonomy data. Taxonomy provides the
 * canonical code (COW, STEER, …); the label is a UI concern kept here.
 * If a new group code lacks a label, the code itself is displayed as fallback.
 */
const FEEDING_GROUP_LABELS: Record<string, string> = {
  COW:           'Маточное поголовье',
  SUCKLING_CALF: 'Молодняк (телята)',
  HEIFER_YOUNG:  'Тёлки',
  STEER:         'Бычки',
  BULL_BREEDING: 'Быки-производители',
}

/** Default rations matching CFC Excel template (feeding_model.py hardcoded) */
const DEFAULT_RATIONS: Record<string, Record<string, { pasture: number; stall: number }>> = {
  COW: {
    green_mass: { pasture: 32, stall: 0 },
    hay: { pasture: 0, stall: 8 },
    straw: { pasture: 0, stall: 2 },
    concentrates: { pasture: 0, stall: 2 },
    salt: { pasture: 0.05, stall: 0.06 },
    bran_meal: { pasture: 0, stall: 1 },
  },
  SUCKLING_CALF: {
    green_mass: { pasture: 10, stall: 0 },
    hay: { pasture: 0, stall: 2.5 },
    concentrates: { pasture: 0, stall: 1 },
    salt: { pasture: 0.02, stall: 0.02 },
  },
  HEIFER_YOUNG: {
    green_mass: { pasture: 29, stall: 0 },
    hay: { pasture: 0, stall: 4 },
    haylage: { pasture: 0, stall: 5 },
    salt: { pasture: 0.03, stall: 0.03 },
  },
  STEER: {
    green_mass: { pasture: 29, stall: 0 },
    hay: { pasture: 0, stall: 4 },
    concentrates: { pasture: 0, stall: 2.5 },
    salt: { pasture: 0.03, stall: 0.03 },
  },
  BULL_BREEDING: {
    green_mass: { pasture: 12, stall: 0 },
    hay: { pasture: 0, stall: 8 },
    concentrates: { pasture: 0, stall: 2.78 },
    bran_meal: { pasture: 0, stall: 1 },
    salt: { pasture: 0.05, stall: 0.045 },
  },
}

/** Feed display names (ru) */
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
}

/** Base prices (same as feeding_model.py) */
const BASE_PRICES: Record<string, number> = {
  green_mass: 0,
  hay: 28,
  straw: 15,
  haylage: 28,
  silage: 15,
  concentrates: 80,
  salt: 145,
  bran_meal: 120,
  milk: 0,
  barley_meal: 36,
  feed_phosphate: 145,
}

export function SimpleRationEditor({
  projectId,
  orgId,
  onSaved,
}: {
  projectId: string
  orgId: string
  onSaved: () => void
}) {
  const [activeGroup, setActiveGroup] = useState<string>(RATION_GROUPS[0]?.key ?? 'COW')
  const [rations, setRations] = useState<Record<string, Record<string, { pasture: number; stall: number }>>>(
    () => JSON.parse(JSON.stringify(DEFAULT_RATIONS))
  )
  const [saving, setSaving] = useState(false)

  // TAXONOMY-M3c: dynamic feeding groups from DB (staleTime=60s, fallback to static RATION_GROUPS)
  const { data: feedingGroupData } = useAnimalCategoryMappings('feeding_group')
  const rationGroups = useMemo(() => {
    if (!feedingGroupData || feedingGroupData.length === 0) return RATION_GROUPS
    const seen = new Set<string>()
    const groups: Array<{ key: string; label: string; code: string }> = []
    for (const row of feedingGroupData) {
      if (!row.is_primary || seen.has(row.target_code)) continue
      seen.add(row.target_code)
      groups.push({
        key: row.target_code,
        label: FEEDING_GROUP_LABELS[row.target_code] ?? row.target_code,
        code: row.target_code,
      })
    }
    return groups.length > 0 ? groups : RATION_GROUPS
  }, [feedingGroupData])

  // Load feed items, prices and animal categories for ID resolution
  const { data: feedItems } = useRpc<FeedItem[]>('rpc_list_feed_items', { p_active_only: true })
  const { data: feedPrices } = useRpc<FeedPrice[]>('rpc_list_feed_prices', {})
  const { data: animalCategories } = useRpc<{ id: string; code: string }[]>('rpc_list_animal_categories', {})

  // Build animal category code → UUID map
  const animalCategoryToId = new Map<string, string>()
  ;(animalCategories || []).forEach(ac => animalCategoryToId.set(ac.code, ac.id))

  // Build feed code→id and code→price maps
  const feedCodeToId = new Map<string, string>()
  const feedCodeToPrice = new Map<string, number>()
  ;(feedItems || []).forEach(f => {
    // Map simplified names to feed item codes
    const simpleMap: Record<string, string> = {
      green_mass: 'PASTURE_SUMMER',
      hay: 'HAY_MIXED_GRASS',
      straw: 'STRAW_WHEAT',
      haylage: 'HAYLAGE_GRASS',
      silage: 'SILAGE_CORN',
      concentrates: 'GRAIN_BARLEY',
      salt: 'SALT_NaCl',
      bran_meal: 'MEAL_SUNFLOWER',
      milk: 'HAY_MIXED_GRASS', // placeholder
      barley_meal: 'GRAIN_BARLEY',
      feed_phosphate: 'PREMIX_BEEF',
    }
    for (const [simple, code] of Object.entries(simpleMap)) {
      if (f.code === code) feedCodeToId.set(simple, f.id)
    }
  })
  ;(feedPrices || []).forEach(fp => {
    const entry = (feedItems || []).find(f => f.id === fp.feed_item_id)
    if (entry) {
      // reverse map
      for (const [simple, code] of Object.entries({
        hay: 'HAY_MIXED_GRASS', straw: 'STRAW_WHEAT', haylage: 'HAYLAGE_GRASS',
        silage: 'SILAGE_CORN', concentrates: 'GRAIN_BARLEY', salt: 'SALT_NaCl',
        bran_meal: 'MEAL_SUNFLOWER', barley_meal: 'GRAIN_BARLEY', feed_phosphate: 'PREMIX_BEEF',
      })) {
        if (entry.code === code) feedCodeToPrice.set(simple, fp.price_per_kg)
      }
    }
  })

  const currentGroup = rations[activeGroup] || {}

  const setFeedValue = useCallback((feed: string, season: 'pasture' | 'stall', value: number) => {
    setRations(prev => {
      const next = { ...prev }
      if (!next[activeGroup]) next[activeGroup] = {}
      if (!next[activeGroup][feed]) next[activeGroup][feed] = { pasture: 0, stall: 0 }
      next[activeGroup] = { ...next[activeGroup] }
      const existing = next[activeGroup][feed] || { pasture: 0, stall: 0 }
      next[activeGroup][feed] = { pasture: existing.pasture, stall: existing.stall, [season]: value }
      return next
    })
  }, [activeGroup])

  const addFeed = useCallback((feed: string) => {
    setRations(prev => {
      const next = { ...prev }
      if (!next[activeGroup]) next[activeGroup] = {}
      next[activeGroup] = { ...next[activeGroup], [feed]: { pasture: 0, stall: 0 } }
      return next
    })
  }, [activeGroup])

  // Calculate daily cost for current group
  const dailyCostPasture = Object.entries(currentGroup).reduce((sum, [feed, vals]) => {
    const price = feedCodeToPrice.get(feed) ?? BASE_PRICES[feed] ?? 0
    return sum + price * vals.pasture
  }, 0)

  const dailyCostStall = Object.entries(currentGroup).reduce((sum, [feed, vals]) => {
    const price = feedCodeToPrice.get(feed) ?? BASE_PRICES[feed] ?? 0
    return sum + price * vals.stall
  }, 0)

  // Save all groups as consulting rations
  const handleSave = async () => {
    setSaving(true)
    try {
      // For each group, save a ration with combined items
      for (const group of rationGroups) {
        const groupRation = rations[group.key]
        if (!groupRation) continue

        // Build separate pasture and stall item arrays (DEF-RATION-01)
        const pastureItems = Object.entries(groupRation)
          .filter(([, vals]) => vals.pasture > 0)
          .map(([feed, vals]) => {
            const price = feedCodeToPrice.get(feed) ?? BASE_PRICES[feed] ?? 0
            return {
              feed_item_id: feedCodeToId.get(feed) || feed,
              feed_item_code: feed,
              quantity_kg_per_day: Number(vals.pasture.toFixed(3)),
              effective_price_per_kg: price,
              cost_per_day: Number((vals.pasture * price).toFixed(2)),
            }
          })

        const stallItems = Object.entries(groupRation)
          .filter(([, vals]) => vals.stall > 0)
          .map(([feed, vals]) => {
            const price = feedCodeToPrice.get(feed) ?? BASE_PRICES[feed] ?? 0
            return {
              feed_item_id: feedCodeToId.get(feed) || feed,
              feed_item_code: feed,
              quantity_kg_per_day: Number(vals.stall.toFixed(3)),
              effective_price_per_kg: price,
              cost_per_day: Number((vals.stall * price).toFixed(2)),
            }
          })

        // p_items: year-average for RPC backward compatibility
        const items = Object.entries(groupRation)
          .filter(([, vals]) => vals.stall > 0 || vals.pasture > 0)
          .map(([feed, vals]) => {
            const price = feedCodeToPrice.get(feed) ?? BASE_PRICES[feed] ?? 0
            const avgKg = (vals.pasture * 183 + vals.stall * 182) / 365
            return {
              feed_item_id: feedCodeToId.get(feed) || feed,
              feed_item_code: feed,
              quantity_kg_per_day: Number(avgKg.toFixed(3)),
              effective_price_per_kg: price,
              cost_per_day: Number((avgKg * price).toFixed(2)),
            }
          })

        if (items.length === 0) continue

        const dailyCostPastureGroup = pastureItems.reduce((s, i) => s + i.cost_per_day, 0)
        const dailyCostStallGroup = stallItems.reduce((s, i) => s + i.cost_per_day, 0)
        // Weighted average: 6 pasture months + 6 stall months
        const avgDailyCost = Number(((dailyCostPastureGroup * 6 + dailyCostStallGroup * 6) / 12).toFixed(2))

        // Resolve animal category UUID
        const categoryId = animalCategoryToId.get(group.code)
        if (!categoryId) {
          console.warn(`[SimpleRation] No UUID for category ${group.code}, skipping`)
          continue
        }

        // Call RPC directly (simpler than Edge Function for manual input)
        const { error } = await supabase.rpc('rpc_save_consulting_ration', {
          p_organization_id: orgId,
          p_consulting_project_id: projectId,
          p_animal_category_id: categoryId,
          p_items: items,
          p_results: {
            // Seasonal split — primary data (DEF-RATION-01)
            pasture: {
              items: pastureItems,
              total_cost_per_day: Number(dailyCostPastureGroup.toFixed(2)),
            },
            stall: {
              items: stallItems,
              total_cost_per_day: Number(dailyCostStallGroup.toFixed(2)),
            },
            source: 'simple_editor',
            // Weighted average for display and backward compat
            total_cost_per_day: avgDailyCost,
            total_cost_per_month: Number((avgDailyCost * 30.44).toFixed(2)),
          },
        })

        if (error) {
          console.error(`[SimpleRation] ${group.key}:`, error)
          toast.error(`Ошибка сохранения: ${group.label}`)
          return
        }
      }

      toast.success('Рационы сохранены')
      onSaved()
    } catch (err: any) {
      toast.error(err.message || 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setRations(JSON.parse(JSON.stringify(DEFAULT_RATIONS)))
    toast.info('Рационы сброшены на нормативные')
  }

  return (
    <div className="space-y-4">
      {/* Group tabs */}
      <div className="flex gap-1 overflow-x-auto">
        {rationGroups.map(g => (
          <Button
            key={g.key}
            variant={activeGroup === g.key ? 'default' : 'outline'}
            size="sm"
            className="text-xs whitespace-nowrap"
            onClick={() => setActiveGroup(g.key)}
          >
            {g.label}
          </Button>
        ))}
      </div>

      {/* Ration table */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">
            {rationGroups.find(g => g.key === activeGroup)?.label} — рацион кг/гол/сут
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">Корм</th>
                <th className="px-2 py-2 text-right font-medium w-28">Пастбище</th>
                <th className="px-2 py-2 text-right font-medium w-28">Стойло</th>
                <th className="px-2 py-2 text-right font-medium w-24">Цена тг/кг</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(currentGroup)
                .filter(([feed]) => feed in FEED_NAMES)
                .map(([feed, vals]) => {
                  const price = feedCodeToPrice.get(feed) ?? BASE_PRICES[feed] ?? 0
                  return (
                    <tr key={feed} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="px-4 py-1.5 text-sm">{FEED_NAMES[feed] || feed}</td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={vals.pasture || ''}
                          onChange={e => setFeedValue(feed, 'pasture', Number(e.target.value) || 0)}
                          className="h-7 w-24 text-right font-mono text-xs ml-auto"
                          placeholder="—"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={vals.stall || ''}
                          onChange={e => setFeedValue(feed, 'stall', Number(e.target.value) || 0)}
                          className="h-7 w-24 text-right font-mono text-xs ml-auto"
                          placeholder="—"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-xs text-muted-foreground">
                        {price > 0 ? price : '—'}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>

          {/* Add feed */}
          {Object.keys(FEED_NAMES).filter(f => !(f in currentGroup)).length > 0 && (
            <div className="px-4 pt-2">
              <select
                className="text-xs border rounded px-2 py-1 text-muted-foreground"
                onChange={e => { if (e.target.value) addFeed(e.target.value); e.target.value = '' }}
                defaultValue=""
              >
                <option value="" disabled>+ Добавить корм...</option>
                {Object.entries(FEED_NAMES)
                  .filter(([k]) => !(k in currentGroup))
                  .map(([k, name]) => (
                    <option key={k} value={k}>{name}</option>
                  ))}
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cost summary */}
      <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">Стоимость рациона (текущая группа)</p>
          <div className="flex gap-4 text-sm">
            <span>Пастбище: <strong className="font-mono">{dailyCostPasture.toFixed(0)} тг/гол/день</strong></span>
            <span>Стойло: <strong className="font-mono">{dailyCostStall.toFixed(0)} тг/гол/день</strong></span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="w-3 h-3 mr-1" /> Сброс
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="w-3 h-3 mr-1" /> {saving ? 'Сохранение...' : 'Сохранить все'}
          </Button>
        </div>
      </div>
    </div>
  )
}
