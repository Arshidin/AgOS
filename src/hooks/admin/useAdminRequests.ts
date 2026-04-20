import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { PoolRequest } from '@/types/tsp';

export function useAdminRequests(statusFilter?: string | null) {
  return useQuery({
    queryKey: ['admin-requests', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('pool_requests' as any)
        .select('*, organizations!inner(name)')
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return ((data ?? []) as any[]).map((row) => ({
        ...row,
        premium_bulls: Number(row.premium_bulls),
        premium_heifers: Number(row.premium_heifers),
        premium_cows: Number(row.premium_cows),
      })) as (PoolRequest & { organizations: { name: string } })[];
    },
  });
}
