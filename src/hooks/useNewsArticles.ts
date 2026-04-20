import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { NewsArticle, NewsArticlesFilters, NewsArticlesResponse } from "@/types/news";

export function useNewsArticles(filters: NewsArticlesFilters = {}) {
  const { type, limit = 9, offset = 0 } = filters;

  return useQuery<NewsArticlesResponse>({
    queryKey: ["news", type ?? "all", offset],
    queryFn: async () => {
      let query = supabase
        .from("news_articles")
        .select("*", { count: "exact" })
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (type) {
        query = query.eq("type", type);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const total = count ?? 0;
      return {
        data: (data as NewsArticle[]) ?? [],
        total,
        hasMore: offset + limit < total,
      };
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}
