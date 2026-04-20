import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { DemandByCategory } from '@/types/tsp';
import type { KzRegion } from '@/types/membership';

export function useDemandByCategory(region?: KzRegion | null, targetMonth?: string | null) {
  return useQuery({
    queryKey: ['demand-by-category', region, targetMonth],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_demand_by_category', {
        p_region: region ?? null,
        p_target_month: targetMonth ?? null,
      });
      if (error) throw error;
      // PostgREST returns numeric as string — coerce
      return ((data ?? []) as any[]).map((row) => ({
        ...row,
        avg_request_size: Number(row.avg_request_size),
      })) as DemandByCategory[];
    },
  });
}
