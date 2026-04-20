import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { NewsArticle } from '@/types/news';

export function useAdminNewsArticle(id: string | undefined) {
  return useQuery<NewsArticle | null>({
    queryKey: ['admin-news', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('news_articles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as NewsArticle;
    },
    enabled: !!id,
    staleTime: 60_000,
  });
}
