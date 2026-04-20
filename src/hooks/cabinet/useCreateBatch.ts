import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import type { AnimalCategory, WeightClass, BreedGroup, Grade } from '@/types/tsp';
import type { KzRegion } from '@/types/membership';

interface CreateBatchParams {
  category: AnimalCategory;
  weight_class: WeightClass;
  breed_group: BreedGroup;
  grade: Grade;
  heads: number;
  region: KzRegion;
  target_month: string;
  notes?: string;
}

export function useCreateBatch() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (params: CreateBatchParams) => {
      const { data, error } = await (supabase.rpc as any)('create_batch', {
        p_category: params.category,
        p_weight_class: params.weight_class,
        p_breed_group: params.breed_group,
        p_grade: params.grade,
        p_heads: params.heads,
        p_region: params.region,
        p_target_month: params.target_month,
        p_notes: params.notes ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['batches'] });
      toast({ title: t('cabinet.batches.create.created') });
    },
    onError: () => {
      toast({ title: t('cabinet.batches.create.error'), variant: 'destructive' });
    },
  });
}
