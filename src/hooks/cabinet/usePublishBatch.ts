import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export function usePublishBatch() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (batchId: string) => {
      const { error } = await (supabase.rpc as any)('publish_batch', {
        p_batch_id: batchId,
      });
      if (error) throw error;
    },
    onSuccess: (_data, batchId) => {
      qc.invalidateQueries({ queryKey: ['batches'] });
      qc.invalidateQueries({ queryKey: ['batch', batchId] });
      toast({ title: t('cabinet.batches.fsm.published') });
    },
    onError: () => {
      toast({ title: t('cabinet.batches.fsm.error'), variant: 'destructive' });
    },
  });
}
