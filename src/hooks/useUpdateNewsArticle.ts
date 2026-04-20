import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { NewsArticle } from '@/types/news';

export interface UpdateNewsArticleInput {
  id: string;
  title?: string;
  slug?: string;
  summary?: string | null;
  content?: string | null;
  cover_image_url?: string | null;
  author?: string | null;
  video_url?: string | null;
  video_type?: 'youtube' | 'instagram' | null;
  source_name?: string | null;
  source_url?: string | null;
  source_logo_url?: string | null;
  category?: string;
  tags?: string[];
  is_published?: boolean;
  is_featured?: boolean;
  published_at?: string;
  meta_title?: string | null;
  meta_description?: string | null;
}

export function useUpdateNewsArticle() {
  const qc = useQueryClient();

  return useMutation<NewsArticle, Error, UpdateNewsArticleInput>({
    mutationFn: async ({ id, ...input }) => {
      const updateData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(input)) {
        if (value !== undefined) updateData[key] = value;
      }
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('news_articles')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as NewsArticle;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['admin-news'] });
      qc.invalidateQueries({ queryKey: ['admin-news', variables.id] });
      qc.invalidateQueries({ queryKey: ['news'] });
    },
  });
}
