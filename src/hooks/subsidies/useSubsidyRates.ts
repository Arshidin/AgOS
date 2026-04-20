import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { SubsidyRate } from '@/types/subsidy';

export function useSubsidyRates(subsidyId: string | undefined) {
  return useQuery({
    queryKey: ['subsidy-rates', subsidyId],
    queryFn: async () => {
      if (!subsidyId) return [];
      const { data, error } = await supabase
        .from('subsidy_rates' as any)
        .select('*')
        .eq('subsidy_id', subsidyId)
        .order('order_index');
      if (error) throw error;
      return (data ?? []) as unknown as SubsidyRate[];
    },
    enabled: !!subsidyId,
    staleTime: 10 * 60 * 1000,
  });
}
