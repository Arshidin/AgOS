import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { PoolRequest } from '@/types/tsp';

export function usePoolRequests() {
  return useQuery({
    queryKey: ['pool-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pool_requests' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return ((data ?? []) as any[]).map((row) => ({
        ...row,
        premium_bulls: Number(row.premium_bulls),
        premium_heifers: Number(row.premium_heifers),
        premium_cows: Number(row.premium_cows),
      })) as PoolRequest[];
    },
  });
}
