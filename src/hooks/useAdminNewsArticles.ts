import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { NewsArticle, NewsType } from '@/types/news';

export interface AdminNewsFilters {
  type?: NewsType | null;
  status?: 'published' | 'draft' | null;
  search?: string;
}

export function useAdminNewsArticles(filters: AdminNewsFilters = {}) {
  const { type, status, search } = filters;

  return useQuery<NewsArticle[]>({
    queryKey: ['admin-news', type ?? 'all', status ?? 'all', search ?? ''],
    queryFn: async () => {
      let query = supabase
        .from('news_articles')
        .select('*')
        .order('created_at', { ascending: false });

      if (type) query = query.eq('type', type);
      if (status === 'published') query = query.eq('is_published', true);
      if (status === 'draft') query = query.eq('is_published', false);
      if (search?.trim()) query = query.ilike('title', `%${search.trim()}%`);

      const { data, error } = await query;
      if (error) throw error;
      return (data as NewsArticle[]) ?? [];
    },
    staleTime: 30_000,
  });
}
