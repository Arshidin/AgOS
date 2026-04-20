import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslation } from "react-i18next";
import type { NewsArticle } from "@/types/news";

interface ArticleContentProps {
  article: NewsArticle;
}

const CATEGORY_COLORS: Record<string, string> = {
  industry: "bg-blue-100 text-blue-700",
  standards: "bg-emerald-100 text-emerald-700",
  events: "bg-violet-100 text-violet-700",
  partnership: "bg-amber-100 text-amber-700",
  general: "bg-gray-100 text-gray-600",
};

const ArticleContent = ({ article }: ArticleContentProps) => {
  const { t } = useTranslation();

  const formattedDate = new Date(article.published_at).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <article>
      {/* Cover image */}
      {article.cover_image_url && (
        <div className="relative aspect-video w-full overflow-hidden rounded-xl mb-6">
          <img
            src={article.cover_image_url}
            alt={article.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            CATEGORY_COLORS[article.category] ?? CATEGORY_COLORS.general
          }`}
        >
          {t(`news.categories.${article.category}`)}
        </span>
        <time dateTime={article.published_at} className="text-sm text-muted-foreground">
          {formattedDate}
        </time>
        {article.author && (
          <>
            <span className="text-muted-foreground">·</span>
            <span className="text-sm text-muted-foreground">{article.author}</span>
          </>
        )}
      </div>

      {/* Title */}
      <h1 className="font-heading text-3xl md:text-4xl font-medium leading-tight text-foreground mb-4">
        {article.title}
      </h1>

      {/* Summary */}
      {article.summary && (
        <p className="text-lg text-muted-foreground leading-relaxed mb-8">
          {article.summary}
        </p>
      )}

      {/* Body */}
      {article.content && (
        <div className="prose prose-lg max-w-none prose-headings:font-serif prose-headings:text-foreground prose-p:text-foreground/80 prose-a:text-primary prose-strong:text-foreground prose-blockquote:border-primary/40 prose-blockquote:text-foreground/70">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {article.content}
          </ReactMarkdown>
        </div>
      )}
    </article>
  );
};

export default ArticleContent;
