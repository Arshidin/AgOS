import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import Reveal from "./Reveal";
import SectionSticker from "./SectionSticker";
import { useNewsArticles } from "@/hooks/useNewsArticles";

const LatestNews = () => {
  const { t } = useTranslation();
  const { data, isLoading } = useNewsArticles({ limit: 4 });
  const articles = data?.data ?? [];

  if (!isLoading && articles.length === 0) return null;

  const CardSkeleton = () => (
    <div className="animate-pulse rounded-2xl overflow-hidden bg-white/60 min-w-[280px] snap-start">
      <div className="aspect-[16/10] bg-muted/30" />
      <div className="p-5 space-y-3">
        <div className="h-3 w-20 rounded-full bg-muted/20" />
        <div className="h-5 w-3/4 rounded bg-muted/20" />
        <div className="h-4 w-full rounded bg-muted/10" />
      </div>
    </div>
  );

  const ArticleCard = ({ article, index }: { article: typeof articles[0]; index: number }) => {
    const date = new Date(article.published_at).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const firstLetter = article.title.charAt(0).toUpperCase();

    return (
      <Reveal delay={80 + index * 80}>
        <Link
          to={`/news/${article.slug}`}
          className="group block rounded-2xl overflow-hidden bg-white/60 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_16px_48px_-12px_rgba(43,24,10,0.10)] h-full"
        >
          <div className="relative aspect-[16/10] overflow-hidden">
            {article.cover_image_url ? (
              <img
                src={article.cover_image_url}
                alt={article.title}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div
                className="h-full w-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, hsl(30 40% 94%), hsl(30 30% 88%))",
                }}
              >
                <span
                  className="font-serif text-6xl font-light select-none"
                  style={{ color: "rgba(43,24,10,0.12)" }}
                >
                  {firstLetter}
                </span>
              </div>
            )}
          </div>

          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <span
                className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                style={{
                  background: "rgba(43,24,10,0.06)",
                  color: "rgba(43,24,10,0.45)",
                }}
              >
                {t(`news.categories.${article.category}`)}
              </span>
              <span className="text-[11px] text-muted-foreground">{date}</span>
            </div>

            <h3 className="font-serif text-[17px] md:text-lg font-medium leading-snug line-clamp-2 mb-2 text-foreground transition-colors duration-300 group-hover:text-primary">
              {article.title}
            </h3>

            {article.summary && (
              <p className="text-[13px] leading-relaxed line-clamp-2 text-muted-foreground">
                {article.summary}
              </p>
            )}
          </div>
        </Link>
      </Reveal>
    );
  };

  return (
    <section className="py-16 md:py-24 lg:py-28" style={{ background: "#fdf6ee" }}>
      <div className="mx-auto max-w-[1200px] px-5 md:px-10">
        {/* Header */}
        <div className="flex items-end justify-between gap-4 mb-10 md:mb-14">
          <div>
            <SectionSticker
              icon={
                <svg viewBox="0 0 18 18" fill="none" className="w-full h-full">
                  <rect x="3" y="4" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                  <line x1="6" y1="7.5" x2="12" y2="7.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                  <line x1="6" y1="10" x2="10" y2="10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                </svg>
              }
            >
              {t("latestNews.sticker")}
            </SectionSticker>
            <Reveal delay={50}>
              <h2 className="font-serif font-light text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.1] tracking-editorial text-foreground">
                {t("latestNews.title")}
              </h2>
            </Reveal>
          </div>

          <Reveal delay={100}>
            <Link
              to="/news"
              className="group inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary mb-1"
            >
              {t("latestNews.viewAll")}
              <ArrowRight
                size={14}
                className="transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </Link>
          </Reveal>
        </div>
      </div>

      {/* Mobile: horizontal snap-scroll, Desktop: grid */}
      {isLoading ? (
        <div className="mx-auto max-w-[1200px] px-5 md:px-10">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Mobile scroll */}
          <div className="md:hidden">
            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth px-5 pb-4 -mb-4 scrollbar-none">
              {articles.map((article, i) => (
                <div key={article.id} className="min-w-[82vw] max-w-[320px] snap-start flex-shrink-0 first:ml-0 last:mr-5">
                  <ArticleCard article={article} index={i} />
                </div>
              ))}
            </div>
          </div>

          {/* Desktop grid */}
          <div className="hidden md:block mx-auto max-w-[1200px] px-5 md:px-10">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.slice(0, 3).map((article, i) => (
                <div key={article.id}>
                  <ArticleCard article={article} index={i} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default LatestNews;
