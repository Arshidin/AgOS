import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { FarmProfile } from '@/types/membership';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function useFarmProfile() {
  const { organization } = useAuth();
  const orgId = organization?.id;

  return useQuery({
    queryKey: ['farm_profile', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from('farm_profiles' as any)
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle();
      if (error) throw error;
      return data as any as FarmProfile | null;
    },
    enabled: !!orgId && organization?.org_type === 'farmer',
  });
}

export function useUpdateFarmProfile() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const orgId = organization?.id;

  return useMutation({
    mutationFn: async (values: Partial<FarmProfile>) => {
      if (!orgId) throw new Error('No organization');
      const { error } = await supabase
        .from('farm_profiles' as any)
        .update(values as any)
        .eq('organization_id', orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farm_profile', orgId] });
      toast.success(t('cabinet.profile.saved'));
    },
    onError: () => {
      toast.error(t('cabinet.profile.saveError'));
    },
  });
}
