import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface CrossCondition {
  id: string;
  condition_key: string;
  label_ru: string;
  crop_value: string | null;
  investment_value: string | null;
  livestock_value: string | null;
  irrigation_value: string | null;
  order_index: number;
}

export function useCrossConditions() {
  return useQuery({
    queryKey: ['subsidy-cross-conditions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subsidy_cross_conditions' as any)
        .select('*')
        .order('order_index');
      if (error) throw error;
      return (data ?? []) as unknown as CrossCondition[];
    },
    staleTime: 30 * 60 * 1000,
  });
}
