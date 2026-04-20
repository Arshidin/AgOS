import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import type { PoolStatus, ExecutionResult } from '@/types/tsp';

export function useTransitionPool() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      poolId,
      newStatus,
      result,
      note,
      failedBatchIds,
    }: {
      poolId: string;
      newStatus: PoolStatus;
      result?: ExecutionResult;
      note?: string;
      failedBatchIds?: string[];
    }) => {
      const { error } = await (supabase.rpc as any)('transition_pool', {
        p_pool_id: poolId,
        p_new_status: newStatus,
        p_result: result ?? null,
        p_note: note ?? null,
        p_failed_batch_ids: failedBatchIds ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-pools'] });
      qc.invalidateQueries({ queryKey: ['admin-batches'] });
      qc.invalidateQueries({ queryKey: ['admin-requests'] });
      qc.invalidateQueries({ queryKey: ['admin-pool-matches'] });
      toast({ title: t('admin.tspMatching.poolTransitioned') });
    },
    onError: (err: Error) => {
      toast({ title: err.message || t('admin.tspMatching.poolTransitionError'), variant: 'destructive' });
    },
  });
}
