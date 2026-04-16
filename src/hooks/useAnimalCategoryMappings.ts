/**
 * TAXONOMY-M3c (ADR-ANIMAL-01): React Query wrappers for taxonomy RPCs.
 *
 * useAnimalCategoryMappings — reads rpc_get_category_mappings with staleTime=60s.
 * useInvalidateTaxonomyCache — invalidates taxonomy queries on
 *   standards.animal_category.updated (wired in Supabase Realtime, Slice 4).
 *
 * P8: standards as data, not code. These hooks replace hardcoded mapping
 * consts over time, but hardcoded fallbacks remain (HS-5 additive architecture).
 */
import { useQueryClient } from '@tanstack/react-query'
import { useRpc } from '@/hooks/useRpc'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CategoryMappingRow {
  target_taxonomy: string
  target_code: string
  animal_category_code: string
  is_primary: boolean
  valid_from: string
  valid_to: string | null
  conditions: Record<string, unknown>
  notes: string | null
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Read all active L2 mappings for a given target taxonomy.
 *
 * @param targetTaxonomy — 'feeding_group' | 'turnover_key' | 'market_sex' | …
 * staleTime=60s per ADR-ANIMAL-01: association standards change rarely;
 * short enough to pick up emergency admin edits within a minute.
 *
 * @example
 *   const { data } = useAnimalCategoryMappings('feeding_group')
 *   const groups = [...new Set(data?.filter(r => r.is_primary).map(r => r.target_code))]
 */
export function useAnimalCategoryMappings(targetTaxonomy: string) {
  return useRpc<CategoryMappingRow[]>(
    'rpc_get_category_mappings',
    { p_target_taxonomy: targetTaxonomy },
    { staleTime: 60_000 },
  )
}

/**
 * Returns a callback that invalidates all cached taxonomy mapping queries.
 * Call when receiving a standards.animal_category.updated platform event.
 */
export function useInvalidateTaxonomyCache() {
  const queryClient = useQueryClient()
  return () =>
    queryClient.invalidateQueries({ queryKey: ['rpc_get_category_mappings'] })
}
