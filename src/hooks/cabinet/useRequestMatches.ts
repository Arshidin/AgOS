import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { PoolMatch } from '@/types/tsp';

export function useRequestMatches(requestId: string | undefined) {
  return useQuery({
    queryKey: ['request-matches', requestId],
    enabled: !!requestId,
    queryFn: async () => {
      // Get pool for this request, then its matches
      const { data: pools, error: poolErr } = await supabase
        .from('pools' as any)
        .select('id')
        .eq('pool_request_id', requestId!);
      if (poolErr) throw poolErr;
      if (!pools || pools.length === 0) return [];

      const poolId = (pools[0] as any).id;
      const { data, error } = await supabase
        .from('pool_matches' as any)
        .select('*')
        .eq('pool_id', poolId);
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
