import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useApproveApplication() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (applicationId: string) => {
      const { error } = await supabase
        .from('registration_applications')
        .update({
          status: 'approved',
          reviewed_by: 'admin',
          reviewed_at: new Date().toISOString(),
        } as any)
        .eq('id', applicationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'applications'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'application'] });
    },
  });
}
