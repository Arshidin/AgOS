import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { PriceGridRow, AnimalCategory, Grade } from '@/types/tsp';

export interface PriceGridFilters {
  category?: AnimalCategory | 'all';
  grade?: Grade | 'all';
  activeOnly?: boolean;
}

export function usePriceGrid(filters: PriceGridFilters = {}) {
  const { category = 'all', grade = 'all', activeOnly = false } = filters;

  return useQuery({
    queryKey: ['admin-price-grid', category, grade, activeOnly],
    queryFn: async () => {
      let query = supabase
        .from('price_grid' as any)
        .select('*')
        .order('category')
        .order('weight_class')
        .order('breed_group')
        .order('grade');

      if (category !== 'all') {
        query = query.eq('category', category);
      }
      if (grade !== 'all') {
        query = query.eq('grade', grade);
      }
      if (activeOnly) {
        query = query.eq('is_active', true);
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
  });
}
