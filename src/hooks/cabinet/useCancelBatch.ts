import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export function useCancelBatch() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ batchId, note }: { batchId: string; note?: string }) => {
      const { error } = await (supabase.rpc as any)('cancel_batch', {
        p_batch_id: batchId,
        p_note: note ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_data, { batchId }) => {
      qc.invalidateQueries({ queryKey: ['batches'] });
      qc.invalidateQueries({ queryKey: ['batch', batchId] });
      qc.invalidateQueries({ queryKey: ['batch-matches', batchId] });
      toast({ title: t('cabinet.batches.fsm.cancelled') });
    },
    onError: () => {
      toast({ title: t('cabinet.batches.fsm.error'), variant: 'destructive' });
    },
  });
}
