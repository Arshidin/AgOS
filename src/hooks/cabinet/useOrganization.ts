import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Organization } from '@/types/membership';

export function useOrganization() {
  const { organization } = useAuth();
  const orgId = organization?.id;

  return useQuery({
    queryKey: ['organization', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from('organizations' as any)
        .select('*')
        .eq('id', orgId)
        .single();
      if (error) throw error;
      return data as any as Organization;
    },
    enabled: !!orgId,
    initialData: organization ?? undefined,
  });
}
