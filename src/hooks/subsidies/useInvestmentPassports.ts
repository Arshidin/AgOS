import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { InvestmentPassport, InvestmentItem } from '@/types/subsidy';

export function useInvestmentPassports() {
  return useQuery({
    queryKey: ['investment-passports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subsidy_investment_passports' as any)
        .select('*')
        .order('passport_number');
      if (error) throw error;
      return (data ?? []) as unknown as InvestmentPassport[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useInvestmentPassport(id: string | undefined) {
  return useQuery({
    queryKey: ['investment-passport', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('subsidy_investment_passports' as any)
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as InvestmentPassport | null;
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });
}

export function useInvestmentItems(passportId: string | undefined) {
  return useQuery({
    queryKey: ['investment-items', passportId],
    queryFn: async () => {
      if (!passportId) return [];
      const { data, error } = await supabase
        .from('subsidy_investment_items' as any)
        .select('*')
        .eq('passport_id', passportId)
        .order('order_index');
      if (error) throw error;
      return (data ?? []) as unknown as InvestmentItem[];
    },
    enabled: !!passportId,
    staleTime: 10 * 60 * 1000,
  });
}
