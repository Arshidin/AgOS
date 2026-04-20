import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import type { AnimalCategory, WeightClass, BreedGroup, Grade } from '@/types/tsp';
import type { KzRegion } from '@/types/membership';

interface UpdateDraftBatchParams {
  batchId: string;
  category?: AnimalCategory;
  weight_class?: WeightClass;
  breed_group?: BreedGroup;
  grade?: Grade;
  heads?: number;
  region?: KzRegion;
  target_month?: string;
  notes?: string;
}

interface UpdatePublishedBatchParams {
  batchId: string;
  heads?: number;
  target_month?: string;
  notes?: string;
}

/** Update a draft batch via direct RLS update */
export function useUpdateDraftBatch() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (params: UpdateDraftBatchParams) => {
      const updates: Record<string, unknown> = {};
      if (params.category !== undefined) updates.category = params.category;
      if (params.weight_class !== undefined) updates.weight_class = params.weight_class;
      if (params.breed_group !== undefined) updates.breed_group = params.breed_group;
      if (params.grade !== undefined) updates.grade = params.grade;
      if (params.heads !== undefined) updates.heads = params.heads;
      if (params.region !== undefined) updates.region = params.region;
      if (params.target_month !== undefined) updates.target_month = params.target_month;
      if (params.notes !== undefined) updates.notes = params.notes || null;

      const { error } = await supabase
        .from('batches' as any)
        .update(updates as any)
        .eq('id', params.batchId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['batches'] });
      qc.invalidateQueries({ queryKey: ['batch', variables.batchId] });
      toast({ title: t('cabinet.batches.detail.saved') });
    },
    onError: () => {
      toast({ title: t('cabinet.batches.detail.saveError'), variant: 'destructive' });
    },
  });
}

/** Update a published batch via RPC (heads/notes/target_month only) */
export function useUpdatePublishedBatch() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (params: UpdatePublishedBatchParams) => {
      const { error } = await (supabase.rpc as any)('update_published_batch', {
        p_batch_id: params.batchId,
        p_heads: params.heads ?? null,
        p_target_month: params.target_month ?? null,
        p_notes: params.notes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['batches'] });
      qc.invalidateQueries({ queryKey: ['batch', variables.batchId] });
      toast({ title: t('cabinet.batches.detail.saved') });
    },
    onError: () => {
      toast({ title: t('cabinet.batches.detail.saveError'), variant: 'destructive' });
    },
  });
}
