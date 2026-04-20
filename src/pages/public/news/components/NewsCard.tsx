import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ExternalLink } from "lucide-react";
import type { NewsArticle } from "@/types/news";

interface NewsCardProps {
  article: NewsArticle;
}

const CATEGORY_COLORS: Record<string, string> = {
  industry: "bg-blue-100 text-blue-700",
  standards: "bg-emerald-100 text-emerald-700",
  events: "bg-violet-100 text-violet-700",
  partnership: "bg-amber-100 text-amber-700",
  general: "bg-gray-100 text-gray-600",
};

const NewsCard = ({ article }: NewsCardProps) => {
  const { t } = useTranslation();
  const isMedia = article.type === "media";

  const formattedDate = new Date(article.published_at).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const cardClasses = "group block cursor-pointer rounded-2xl border border-black/5 bg-white overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/8";

  const inner = (
    <>
      {/* Cover image */}
      <div className="relative aspect-video overflow-hidden bg-muted">
        {article.cover_image_url ? (
          <img
            src={article.cover_image_url}
            alt={article.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <span className="text-4xl opacity-30">📰</span>
          </div>
        )}

        {/* Category badge */}
        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            CATEGORY_COLORS[article.category] ?? CATEGORY_COLORS.general
          }`}
        >
          {t(`news.categories.${article.category}`)}
        </span>

        {/* Media source badge */}
        {isMedia && article.source_name && (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/90 backdrop-blur-sm px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {article.source_name}
            <ExternalLink size={12} />
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-serif text-lg font-bold leading-snug text-foreground line-clamp-2 mb-1.5">
          {article.title}
        </h3>
        {article.summary && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-3">
            {article.summary}
          </p>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <time dateTime={article.published_at}>{formattedDate}</time>
          {isMedia && (
            <span className="flex items-center gap-1 text-primary font-medium">
              {t("news.readSource")}
              <ExternalLink size={12} />
            </span>
          )}
        </div>
      </div>
    </>
  );

  return (
    <Link to={`/news/${article.slug}`} className={cardClasses}>
      {inner}
    </Link>
  );
};

export default NewsCard;
