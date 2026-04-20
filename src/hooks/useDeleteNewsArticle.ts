import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useDeleteNewsArticle() {
  const qc = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('news_articles')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: ['admin-news', id] });
      qc.invalidateQueries({ queryKey: ['admin-news'] });
      qc.invalidateQueries({ queryKey: ['news'] });
    },
  });
}
