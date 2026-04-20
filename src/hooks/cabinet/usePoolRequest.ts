import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { PoolRequest } from '@/types/tsp';

export function usePoolRequest(id: string | undefined) {
  return useQuery({
    queryKey: ['pool-request', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pool_requests' as any)
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      const row = data as any;
      return {
        ...row,
        premium_bulls: Number(row.premium_bulls),
        premium_heifers: Number(row.premium_heifers),
        premium_cows: Number(row.premium_cows),
      } as PoolRequest;
    },
    enabled: !!id,
  });
}
