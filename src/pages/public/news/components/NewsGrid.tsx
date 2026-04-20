import { useTranslation } from "react-i18next";
import type { NewsArticle } from "@/types/news";
import NewsCard from "./NewsCard";

interface NewsGridProps {
  articles: NewsArticle[];
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
}

const NewsGrid = ({ articles, hasMore, isLoading, onLoadMore }: NewsGridProps) => {
  const { t } = useTranslation();

  if (!isLoading && articles.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">{t("news.empty")}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <NewsCard key={article.id} article={article} />
        ))}
      </div>

      {/* Loading skeleton */}
      {isLoading && articles.length === 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-black/5 bg-white overflow-hidden"
            >
              <div className="aspect-video bg-muted" />
              <div className="p-4 space-y-2">
                <div className="h-5 w-3/4 bg-muted rounded" />
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-4 w-2/3 bg-muted rounded" />
                <div className="h-3 w-1/3 bg-muted rounded mt-3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && !isLoading && (
        <div className="mt-10 text-center">
          <button
            onClick={onLoadMore}
            className="rounded-full bg-black/5 px-6 py-2.5 text-sm font-medium text-foreground hover:bg-black/10 transition-colors"
          >
            {t("news.loadMore")}
          </button>
        </div>
      )}
    </div>
  );
};

export default NewsGrid;
