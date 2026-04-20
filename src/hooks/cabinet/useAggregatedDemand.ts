import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { AggregatedDemand } from '@/types/tsp';
import type { KzRegion } from '@/types/membership';

export function useAggregatedDemand(region?: KzRegion | null) {
  return useQuery({
    queryKey: ['aggregated-demand', region],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_aggregated_demand', {
        p_region: region ?? null,
      });
      if (error) throw error;
      return (data ?? []) as AggregatedDemand[];
    },
  });
}
