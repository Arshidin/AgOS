/**
 * Maps animal_categories.code → herd turnover group key.
 * Mirror of CATEGORY_CODE_TO_HERD in consulting_engine/app/engine/feeding_model.py:37-48.
 *
 * TAXONOMY-M3c: hardcoded const remains as fallback (HS-5 additive architecture).
 * New code should use useCategoryToHerd() which reads from rpc_get_category_mappings
 * ('turnover_key') with staleTime=60s and falls back to the const when loading.
 */
import { useMemo } from 'react'
import { useAnimalCategoryMappings } from '@/hooks/useAnimalCategoryMappings'

// ─── Types ────────────────────────────────────────────────────────────────────

interface HerdMapping {
  group: 'cows' | 'bulls' | 'calves' | 'heifers' | 'steers'
  metric: 'eop' | 'avg'
}

interface AnimalCategory {
  id: string
  code: string
  name_ru: string
  sort_order: number
}

interface HerdGroup {
  bop: number[]
  eop: number[]
  avg: number[]
  [key: string]: number[] | undefined
}

interface HerdData {
  cows: HerdGroup
  bulls: HerdGroup
  calves: HerdGroup
  heifers: HerdGroup
  steers: HerdGroup
  fattening: HerdGroup
}

interface WeightData {
  steer_sale_weight?: number[]
  heifer_transfer_weight?: number[]
  cow_culled_weight?: number
  bull_culled_weight?: number
  birth_weight_kg?: number
  daily_gains?: {
    steer?: { pasture: number; stall: number }
    heifer?: { pasture: number; stall: number }
  }
}

// ─── Mapping ──────────────────────────────────────────────────────────────────
// Mirror of feeding_model.py CATEGORY_CODE_TO_HERD. OX and MIXED excluded.

export const CATEGORY_CODE_TO_HERD: Record<string, HerdMapping> = {
  COW:           { group: 'cows',    metric: 'eop' },
  COW_CULL:      { group: 'cows',    metric: 'eop' },
  BULL_BREEDING: { group: 'bulls',   metric: 'eop' },
  BULL_CULL:     { group: 'bulls',   metric: 'eop' },
  SUCKLING_CALF: { group: 'calves',  metric: 'avg' },
  YOUNG_CALF:    { group: 'calves',  metric: 'avg' },
  HEIFER_YOUNG:  { group: 'heifers', metric: 'avg' },
  HEIFER_PREG:   { group: 'heifers', metric: 'avg' },
  BULL_CALF:     { group: 'steers',  metric: 'avg' },
  STEER:         { group: 'steers',  metric: 'avg' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Filter categories to only those relevant to this project's herd.
 * A category is relevant if its code is in the mapping AND the herd array has non-zero values.
 */
export function getRelevantCategories(
  herd: HerdData | undefined,
  categories: AnimalCategory[],
): AnimalCategory[] {
  if (!herd) return categories

  return categories.filter(cat => {
    const mapping = CATEGORY_CODE_TO_HERD[cat.code]
    if (!mapping) return false

    const groupData = herd[mapping.group]
    if (!groupData) return false

    const arr = groupData[mapping.metric]
    if (!arr || !Array.isArray(arr)) return false

    return arr.some(v => v > 0)
  })
}

/**
 * Average head count over the first 12 months (first-year average).
 */
export function getHeadCount(
  herd: HerdData | undefined,
  categoryCode: string,
): number {
  if (!herd) return 0

  const mapping = CATEGORY_CODE_TO_HERD[categoryCode]
  if (!mapping) return 0

  const groupData = herd[mapping.group]
  if (!groupData) return 0

  const arr = groupData[mapping.metric]
  if (!arr || !Array.isArray(arr) || arr.length === 0) return 0

  const slice = arr.slice(0, 12)
  const sum = slice.reduce((a, b) => a + (b ?? 0), 0)
  return sum / slice.length
}

/**
 * Default weight for ration calculation, from weight model output.
 */
export function getDefaultWeight(
  weight: WeightData | undefined,
  categoryCode: string,
): number {
  if (!weight) return 350

  switch (categoryCode) {
    case 'COW':
    case 'COW_CULL':
      return weight.cow_culled_weight ?? 600

    case 'BULL_BREEDING':
    case 'BULL_CULL':
      return weight.bull_culled_weight ?? 750

    case 'SUCKLING_CALF':
      return weight.birth_weight_kg ?? 30

    case 'YOUNG_CALF': {
      // ~5 months old: birth + avg_daily_gain * 150 days
      const birth = weight.birth_weight_kg ?? 30
      const gain = weight.daily_gains?.heifer?.pasture ?? 0.7
      return Math.round(birth + gain * 150)
    }

    case 'STEER':
    case 'BULL_CALF': {
      const arr = weight.steer_sale_weight
      if (arr) {
        const first = arr.find(v => v > 0)
        if (first) return Math.round(first)
      }
      return 350
    }

    case 'HEIFER_YOUNG':
    case 'HEIFER_PREG': {
      const arr = weight.heifer_transfer_weight
      if (arr) {
        const first = arr.find(v => v > 0)
        if (first) return Math.round(first)
      }
      return 300
    }

    default:
      return 350
  }
}

/**
 * Default objective for ration calculation, based on category purpose.
 */
export function getDefaultObjective(categoryCode: string): string {
  switch (categoryCode) {
    case 'COW':
    case 'COW_CULL':
    case 'BULL_BREEDING':
    case 'BULL_CULL':
      return 'maintenance'

    case 'SUCKLING_CALF':
    case 'YOUNG_CALF':
    case 'HEIFER_YOUNG':
    case 'HEIFER_PREG':
    case 'BULL_CALF':
      return 'growth'

    case 'STEER':
      return 'finishing'

    default:
      return 'growth'
  }
}

// ─── TAXONOMY-M3c: dynamic hook ───────────────────────────────────────────────

/**
 * eop/avg is a CFC-math property of the herd group — NOT taxonomy data.
 * Hardcoded here and in taxonomy_cache.py `_HERD_MEASUREMENT`.
 * Changes to this mapping require a sync between TS and Python (documented in CLAUDE.md).
 */
const _HERD_METRIC: Record<string, HerdMapping['metric']> = {
  cows:    'eop',
  bulls:   'eop',
  calves:  'avg',
  heifers: 'avg',
  steers:  'avg',
}

/**
 * Dynamic alternative to the `CATEGORY_CODE_TO_HERD` const.
 * Reads from rpc_get_category_mappings('turnover_key') via React Query
 * (staleTime=60s per ADR-ANIMAL-01). Returns the hardcoded const while
 * loading or on RPC error — never blocks the UI.
 *
 * New components should prefer this hook over the static const so that
 * new L1 codes added by the association propagate automatically.
 */
export function useCategoryToHerd(): Record<string, HerdMapping> {
  const { data } = useAnimalCategoryMappings('turnover_key')

  return useMemo(() => {
    if (!data || data.length === 0) return CATEGORY_CODE_TO_HERD

    const result: Record<string, HerdMapping> = {}
    for (const row of data) {
      if (!row.is_primary) continue
      const metric = _HERD_METRIC[row.target_code]
      if (!metric) continue
      result[row.animal_category_code] = {
        group: row.target_code as HerdMapping['group'],
        metric,
      }
    }

    return Object.keys(result).length > 0 ? result : CATEGORY_CODE_TO_HERD
  }, [data])
}
