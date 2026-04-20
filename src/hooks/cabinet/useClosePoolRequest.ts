import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export function useClosePoolRequest() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ requestId, note }: { requestId: string; note?: string }) => {
      const { error } = await (supabase.rpc as any)('close_pool_request', {
        p_request_id: requestId,
        p_note: note ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_data, { requestId }) => {
      qc.invalidateQueries({ queryKey: ['pool-requests'] });
      qc.invalidateQueries({ queryKey: ['pool-request', requestId] });
      qc.invalidateQueries({ queryKey: ['request-matches', requestId] });
      toast({ title: t('cabinet.requests.fsm.closed') });
    },
    onError: () => {
      toast({ title: t('cabinet.requests.fsm.error'), variant: 'destructive' });
    },
  });
}
