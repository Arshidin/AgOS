import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export function useActivatePoolRequest() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await (supabase.rpc as any)('activate_pool_request', {
        p_request_id: requestId,
      });
      if (error) throw error;
    },
    onSuccess: (_data, requestId) => {
      qc.invalidateQueries({ queryKey: ['pool-requests'] });
      qc.invalidateQueries({ queryKey: ['pool-request', requestId] });
      toast({ title: t('cabinet.requests.fsm.activated') });
    },
    onError: () => {
      toast({ title: t('cabinet.requests.fsm.error'), variant: 'destructive' });
    },
  });
}
