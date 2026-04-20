import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface GlossaryTerm {
  id: string;
  abbreviation: string;
  full_name_ru: string;
  full_name_kz: string;
  description_ru: string | null;
  order_index: number;
}

export function useGlossary() {
  return useQuery({
    queryKey: ['subsidy-glossary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subsidy_glossary' as any)
        .select('*')
        .order('order_index');
      if (error) throw error;
      return (data ?? []) as unknown as GlossaryTerm[];
    },
    staleTime: 30 * 60 * 1000,
  });
}

export function useGlossaryMap() {
  const { data: terms } = useGlossary();
  const map = new Map<string, GlossaryTerm>();
  if (terms) {
    for (const t of terms) {
      map.set(t.abbreviation, t);
    }
  }
  return map;
}
