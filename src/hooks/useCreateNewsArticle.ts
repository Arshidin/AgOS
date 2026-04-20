import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { NewsArticle } from '@/types/news';

export interface CreateNewsArticleInput {
  type: 'association' | 'media';
  title: string;
  slug: string;
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

export function useCreateNewsArticle() {
  const qc = useQueryClient();

  return useMutation<NewsArticle, Error, CreateNewsArticleInput>({
    mutationFn: async (input) => {
      const { data, error } = await supabase
        .from('news_articles')
        .insert({
          type: input.type,
          title: input.title,
          slug: input.slug,
          summary: input.summary ?? null,
          content: input.content ?? null,
          cover_image_url: input.cover_image_url ?? null,
          author: input.author ?? null,
          video_url: input.video_url ?? null,
          video_type: input.video_type ?? null,
          source_name: input.source_name ?? null,
          source_url: input.source_url ?? null,
          source_logo_url: input.source_logo_url ?? null,
          category: input.category ?? 'general',
          tags: input.tags ?? [],
          is_published: input.is_published ?? false,
          is_featured: input.is_featured ?? false,
          published_at: input.published_at ?? new Date().toISOString(),
          meta_title: input.meta_title ?? null,
          meta_description: input.meta_description ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as NewsArticle;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-news'] });
      qc.invalidateQueries({ queryKey: ['news'] });
    },
  });
}
