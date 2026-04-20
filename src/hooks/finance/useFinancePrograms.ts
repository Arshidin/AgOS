import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { FinanceProgram, ProgramDependency } from '@/types/finance';

export function useFinancePrograms() {
  return useQuery({
    queryKey: ['finance-programs'],
    queryFn: async () => {
      const [{ data: programs, error: pErr }, { data: deps, error: dErr }] = await Promise.all([
        supabase.from('finance_programs').select('*').eq('is_active', true).order('order_index'),
        supabase.from('finance_program_deps').select('*'),
      ]);
      if (pErr) throw pErr;
      if (dErr) throw dErr;
      return {
        programs: (programs ?? []) as unknown as FinanceProgram[],
        deps: (deps ?? []) as unknown as ProgramDependency[],
      };
    },
    staleTime: 1000 * 60 * 10,
  });
}
