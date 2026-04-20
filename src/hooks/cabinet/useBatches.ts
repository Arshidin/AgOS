import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Batch } from '@/types/tsp';

export function useBatches() {
  return useQuery({
    queryKey: ['batches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Batch[];
    },
  });
}
