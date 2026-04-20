import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import type { AnimalCategory, WeightClass, BreedGroup, Grade } from '@/types/tsp';
import type { KzRegion } from '@/types/membership';

interface CreatePoolRequestParams {
  total_heads: number;
  region: KzRegion;
  target_month: string;
  accepted_categories: AnimalCategory[];
  accepted_grades?: Grade[];
  accepted_weight_min?: WeightClass;
  accepted_weight_max?: WeightClass;
  accepted_breed_min?: BreedGroup;
  premium_bulls?: number;
  premium_heifers?: number;
  premium_cows?: number;
  notes?: string;
}

export function useCreatePoolRequest() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (params: CreatePoolRequestParams) => {
      const { data, error } = await (supabase.rpc as any)('create_pool_request', {
        p_total_heads: params.total_heads,
        p_region: params.region,
        p_target_month: params.target_month,
        p_accepted_categories: params.accepted_categories,
        p_accepted_grades: params.accepted_grades ?? ['NS', 'S', 'HS'],
        p_accepted_weight_min: params.accepted_weight_min ?? null,
        p_accepted_weight_max: params.accepted_weight_max ?? null,
        p_accepted_breed_min: params.accepted_breed_min ?? null,
        p_premium_bulls: params.premium_bulls ?? 0,
        p_premium_heifers: params.premium_heifers ?? 0,
        p_premium_cows: params.premium_cows ?? 0,
        p_notes: params.notes ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pool-requests'] });
      toast({ title: t('cabinet.requests.create.created') });
    },
    onError: () => {
      toast({ title: t('cabinet.requests.create.error'), variant: 'destructive' });
    },
  });
}
