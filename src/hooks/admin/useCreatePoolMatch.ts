import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export function useCreatePoolMatch() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      poolId,
      batchId,
      note,
    }: {
      poolId: string;
      batchId: string;
      note?: string;
    }) => {
      const { data, error } = await (supabase.rpc as any)('create_pool_match', {
        p_pool_id: poolId,
        p_batch_id: batchId,
        p_note: note ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-batches'] });
      qc.invalidateQueries({ queryKey: ['admin-requests'] });
      qc.invalidateQueries({ queryKey: ['admin-pools'] });
      qc.invalidateQueries({ queryKey: ['admin-pool-matches'] });
      toast({ title: t('admin.tspMatching.matchCreated') });
    },
    onError: (err: Error) => {
      toast({ title: err.message || t('admin.tspMatching.matchError'), variant: 'destructive' });
    },
  });
}
