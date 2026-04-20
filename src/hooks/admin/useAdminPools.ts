import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Pool } from '@/types/tsp';

export function useAdminPools() {
  return useQuery({
    queryKey: ['admin-pools'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pools' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Pool[];
    },
  });
}
