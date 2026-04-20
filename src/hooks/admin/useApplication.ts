import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Application } from '@/types/admin';

export function useApplication(id: string | undefined) {
  return useQuery<Application>({
    queryKey: ['admin', 'application', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('registration_applications')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Application not found');
      return data as unknown as Application;
    },
    enabled: !!id,
  });
}
