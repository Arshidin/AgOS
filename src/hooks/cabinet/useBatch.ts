import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Batch } from '@/types/tsp';

export function useBatch(id: string | undefined) {
  return useQuery({
    queryKey: ['batch', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches' as any)
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as unknown as Batch;
    },
    enabled: !!id,
  });
}
