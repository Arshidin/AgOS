import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { PriceGridLogEntry } from '@/types/tsp';

export function usePriceGridLog(priceGridId: string | null) {
  return useQuery({
    queryKey: ['price-grid-log', priceGridId],
    queryFn: async () => {
      if (!priceGridId) return [];
      const { data, error } = await supabase
        .from('price_grid_log' as any)
        .select('*')
        .eq('price_grid_id', priceGridId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any as PriceGridLogEntry[];
    },
    enabled: !!priceGridId,
  });
}
