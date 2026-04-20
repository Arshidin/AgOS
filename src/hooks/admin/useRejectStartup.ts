import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useRejectStartup() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: string; reason: string }>({
    mutationFn: async ({ id, reason }) => {
      const { error } = await supabase
        .from('startups')
        .update({
          submission_status: 'rejected',
          rejection_reason: reason,
          is_published: false,
        } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'startups'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'startup'] });
      queryClient.invalidateQueries({ queryKey: ['startups'] });
    },
  });
}
