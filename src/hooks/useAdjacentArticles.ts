import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface AdjacentArticle {
  id: string;
  slug: string;
  title: string;
  cover_image_url: string | null;
}

export function useAdjacentArticles(
  publishedAt: string | undefined,
  currentId: string | undefined,
) {
  const prev = useQuery<AdjacentArticle | null>({
    queryKey: ["news-adjacent", "prev", currentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_articles")
        .select("id, slug, title, cover_image_url")
        .eq("is_published", true)
        .gt("published_at", publishedAt!)
        .order("published_at", { ascending: true })
        .limit(1);

      if (error) throw error;
      return (data?.[0] as AdjacentArticle | undefined) ?? null;
    },
    enabled: !!publishedAt && !!currentId,
    staleTime: 5 * 60 * 1000,
  });

  const next = useQuery<AdjacentArticle | null>({
    queryKey: ["news-adjacent", "next", currentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_articles")
        .select("id, slug, title, cover_image_url")
        .eq("is_published", true)
        .lt("published_at", publishedAt!)
        .order("published_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      return (data?.[0] as AdjacentArticle | undefined) ?? null;
    },
    enabled: !!publishedAt && !!currentId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    prev: prev.data ?? null,
    next: next.data ?? null,
    isLoading: prev.isLoading || next.isLoading,
  };
}
