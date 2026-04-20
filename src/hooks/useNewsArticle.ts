import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { NewsArticle } from "@/types/news";

export function useNewsArticle(slug: string | undefined) {
  return useQuery<NewsArticle | null>({
    queryKey: ["news-article", slug],
    queryFn: async () => {
      if (!slug) return null;

      const { data, error } = await supabase
        .from("news_articles")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .single();

      if (error) throw error;
      return data as NewsArticle;
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!slug,
  });
}
