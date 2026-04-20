import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { PriceGridRow, AnimalCategory } from '@/types/tsp';

export function usePriceGridPublic(category?: AnimalCategory | null) {
  return useQuery({
    queryKey: ['price-grid-public', category],
    queryFn: async () => {
      let query = supabase
        .from('price_grid' as any)
        .select('*')
        .eq('is_active', true)
        .order('weight_class')
        .order('breed_group')
        .order('grade');

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      // PostgREST returns NUMERIC as strings — coerce to number
      return ((data ?? []) as any[]).map((row) => ({
        ...row,
        reference_price_per_kg: Number(row.reference_price_per_kg),
        recommended_premium_min: Number(row.recommended_premium_min),
        recommended_premium_max: Number(row.recommended_premium_max),
      })) as PriceGridRow[];
    },
    enabled: !!category,
  });
}
