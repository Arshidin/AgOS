/**
 * TAXONOMY-M3c (Slice 4): Supabase Realtime sync for taxonomy invalidation.
 *
 * Subscribes to postgres_changes on `animal_categories` and
 * `animal_category_mappings`. On any INSERT/UPDATE/DELETE, invalidates the
 * React Query cache for `rpc_get_category_mappings` so every consumer
 * (useCategoryToHerd, SimpleRationEditor) re-fetches with current data.
 *
 * Also handles the `standards.animal_category.updated` platform_event row
 * if it lands in `platform_events` — forward-compatible with Dok 4 §3.9.
 *
 * Mount once in AppLayout — runs for the full authenticated session lifetime.
 * Safe to mount multiple times (Supabase deduplicates by channel name).
 *
 * ADR-ANIMAL-01: staleTime=60s in useAnimalCategoryMappings means normal
 * browsing never hits the DB; Realtime invalidation is the edge-case path
 * when the association admin changes standards mid-session.
 */
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useInvalidateTaxonomyCache } from '@/hooks/useAnimalCategoryMappings'

export function useTaxonomyRealtimeSync(): void {
  const invalidate = useInvalidateTaxonomyCache()

  useEffect(() => {
    // ── Channel 1: direct table changes ───────────────────────────────────
    // Covers INSERT (new L1 code), UPDATE (deprecation, sort_order changes),
    // DELETE (should never happen per I1, but guard anyway).
    const taxonomyChannel = supabase
      .channel('taxonomy-standards')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'animal_categories' },
        () => {
          invalidate()
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'animal_category_mappings' },
        () => {
          invalidate()
        },
      )
      .subscribe()

    // ── Channel 2: platform_events (Dok 4 §3.9) ───────────────────────────
    // Forward-compatible: when Slice 4 proactive dispatch starts writing
    // platform_events for standards.animal_category.updated, this channel
    // will pick them up without code change.
    const platformChannel = supabase
      .channel('platform-events-taxonomy')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'platform_events',
          filter: 'event_type=eq.standards.animal_category.updated',
        },
        () => {
          invalidate()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(taxonomyChannel)
      supabase.removeChannel(platformChannel)
    }
  }, [invalidate])
}
