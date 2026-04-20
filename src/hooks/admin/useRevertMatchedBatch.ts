import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export function useRevertMatchedBatch() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ batchId, note }: { batchId: string; note: string }) => {
      const { error } = await (supabase.rpc as any)('revert_matched_batch', {
        p_batch_id: batchId,
        p_note: note,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-batches'] });
      qc.invalidateQueries({ queryKey: ['admin-pools'] });
      qc.invalidateQueries({ queryKey: ['admin-pool-matches'] });
      toast({ title: t('admin.tspMatching.batchReverted') });
    },
    onError: (err: Error) => {
      toast({ title: err.message || t('admin.tspMatching.revertError'), variant: 'destructive' });
    },
  });
}
