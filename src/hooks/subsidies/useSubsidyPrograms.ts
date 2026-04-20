import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { SubsidyProgram, SubsidyCategory } from '@/types/subsidy';

export function useSubsidyPrograms(category?: SubsidyCategory) {
  return useQuery({
    queryKey: ['subsidy-programs', category ?? 'all'],
    queryFn: async () => {
      let q = supabase
        .from('subsidy_programs' as any)
        .select('*')
        .eq('is_active', true)
        .order('order_index');
      if (category) q = q.eq('category', category);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as SubsidyProgram[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useSubsidyProgram(id: string | undefined) {
  return useQuery({
    queryKey: ['subsidy-program', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('subsidy_programs' as any)
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as SubsidyProgram | null;
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });
}

export function useSubsidyCategoryCounts() {
  return useQuery({
    queryKey: ['subsidy-category-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subsidy_programs' as any)
        .select('category')
        .eq('is_active', true);
      if (error) throw error;
      const counts: Record<SubsidyCategory, number> = {
        livestock: 0, crop: 0, investment: 0, irrigation: 0,
      };
      for (const row of (data ?? []) as unknown as { category: SubsidyCategory }[]) {
        counts[row.category] = (counts[row.category] ?? 0) + 1;
      }
      return counts;
    },
    staleTime: 10 * 60 * 1000,
  });
}
