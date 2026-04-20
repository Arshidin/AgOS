import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Batch } from '@/types/tsp';

export function useAdminBatches(statusFilter?: string | null) {
  return useQuery({
    queryKey: ['admin-batches', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('batches' as any)
        .select('*, organizations!inner(name)')
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as (Batch & { organizations: { name: string } })[];
    },
  });
}
