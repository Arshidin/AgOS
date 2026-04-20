import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { PoolMatch } from '@/types/tsp';

export function useBatchMatches(batchId: string | undefined) {
  return useQuery({
    queryKey: ['batch-matches', batchId],
    enabled: !!batchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pool_matches' as any)
        .select('*')
        .eq('batch_id', batchId!);
      if (error) throw error;
      return ((data ?? []) as unknown as PoolMatch[]).map(m => ({
        ...m,
        heads: Number(m.heads),
        reference_price_at_match: Number(m.reference_price_at_match),
        premium_at_match: Number(m.premium_at_match),
      }));
    },
  });
}
