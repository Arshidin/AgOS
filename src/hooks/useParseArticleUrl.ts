import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface ParsedArticle {
  title: string | null;
  summary: string | null;
  cover_image_url: string | null;
  source_name: string;
  published_date: string | null;
  author: string | null;
  tags: string[];
  url: string;
  _meta: {
    has_og: boolean;
    ai_generated_summary: boolean;
    partial: boolean;
  };
}

export function useParseArticleUrl() {
  return useMutation<ParsedArticle, Error, string>({
    mutationFn: async (url: string) => {
      const { data, error } = await supabase.functions.invoke('parse-article-url', {
        body: { url },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.message);
      return data as ParsedArticle;
    },
  });
}
