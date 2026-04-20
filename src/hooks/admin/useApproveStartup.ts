import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useApproveStartup() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (startupId: string) => {
      const { error } = await supabase
        .from('startups')
        .update({
          submission_status: 'approved',
          is_published: true,
        } as any)
        .eq('id', startupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'startups'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'startup'] });
      queryClient.invalidateQueries({ queryKey: ['startups'] });
    },
  });
}
