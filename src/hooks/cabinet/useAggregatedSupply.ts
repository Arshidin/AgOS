import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { AggregatedSupply } from '@/types/tsp';
import type { KzRegion } from '@/types/membership';

export function useAggregatedSupply(region?: KzRegion | null) {
  return useQuery({
    queryKey: ['aggregated-supply', region],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_aggregated_supply', {
        p_region: region ?? null,
      });
      if (error) throw error;
      return (data ?? []) as AggregatedSupply[];
    },
  });
}
