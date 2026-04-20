import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Organization } from '@/types/membership';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function useUpdateOrganization() {
  const { organization, refreshContext } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const orgId = organization?.id;

  return useMutation({
    mutationFn: async (values: Partial<Organization>) => {
      if (!orgId) throw new Error('No organization');
      const { error } = await supabase
        .from('organizations' as any)
        .update(values as any)
        .eq('id', orgId);
      if (error) throw error;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['organization', orgId] });
      await refreshContext();
      toast.success(t('cabinet.profile.saved'));
    },
    onError: () => {
      toast.error(t('cabinet.profile.saveError'));
    },
  });
}
