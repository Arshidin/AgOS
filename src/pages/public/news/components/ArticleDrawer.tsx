import { useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Maximize2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNewsArticle } from "@/hooks/useNewsArticle";
import { useAdjacentArticles } from "@/hooks/useAdjacentArticles";
import ArticleContent from "./ArticleContent";
import ArticleSEO from "./ArticleSEO";

const ArticleDrawer = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: article, isLoading } = useNewsArticle(slug);
  const { prev, next } = useAdjacentArticles(
    article?.published_at,
    article?.id,
  );

  const handleClose = () => {
    navigate("/news", { replace: true });
  };

  const goTo = useCallback(
    (targetSlug: string) => {
      navigate(`/news/${targetSlug}`, { replace: true });
    },
    [navigate],
  );

  const goPrev = useCallback(() => {
    if (prev) goTo(prev.slug);
  }, [prev, goTo]);

  const goNext = useCallback(() => {
    if (next) goTo(next.slug);
  }, [next, goTo]);

  // Keyboard navigation (Left / Right arrows)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goPrev, goNext]);

  return (
    <Dialog open onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto p-0 gap-0"
      >
        <DialogTitle className="sr-only">
          {article?.title ?? t("news.article")}
        </DialogTitle>

        {/* ── Navigation bar ── */}
        {article && (
          <div
            className="sticky top-0 z-10 flex items-center justify-between px-3 py-2 border-b"
            style={{
              background: "rgba(253, 246, 238, 0.85)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderColor: "rgba(0,0,0,0.06)",
            }}
          >
            {/* Prev / Next arrows */}
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-foreground/50 hover:text-foreground hover:bg-black/5 disabled:opacity-25 disabled:hover:bg-transparent transition-colors"
                onClick={goPrev}
                disabled={!prev}
                title={prev?.title}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-foreground/50 hover:text-foreground hover:bg-black/5 disabled:opacity-25 disabled:hover:bg-transparent transition-colors"
                onClick={goNext}
                disabled={!next}
                title={next?.title}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Expand to full page */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 rounded-lg text-foreground/50 hover:text-foreground hover:bg-black/5 text-xs font-medium transition-colors"
              onClick={() => navigate(`/article/${slug}`)}
            >
              <Maximize2 className="h-3.5 w-3.5" />
              {t("news.expandArticle")}
            </Button>
          </div>
        )}

        {/* ── Content ── */}
        <div className="p-6 md:p-8">
          {/* Loading skeleton */}
          {isLoading && (
            <div className="space-y-4 animate-pulse">
              <div className="aspect-video w-full bg-muted rounded-xl" />
              <div className="h-6 w-2/3 bg-muted rounded" />
              <div className="h-8 w-full bg-muted rounded" />
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-4 w-full bg-muted rounded" />
                ))}
              </div>
            </div>
          )}

          {/* Not found */}
          {!isLoading && !article && (
            <div className="text-center py-16">
              <p className="text-muted-foreground">{t("news.notFound")}</p>
            </div>
          )}

          {/* Article body */}
          {article && (
            <>
              <ArticleSEO article={article} />
              <ArticleContent article={article} />

              {/* Source link for media articles */}
              {article.type === "media" && article.source_url && (
                <div className="mt-8 pt-6 border-t">
                  <a
                    href={article.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-medium px-4 py-2.5 transition-colors"
                  >
                    <ExternalLink size={16} />
                    {t("news.readSource")}
                    {article.source_name && (
                      <span className="text-primary/70">
                        — {article.source_name}
                      </span>
                    )}
                  </a>
                </div>
              )}

              {/* ── Bottom prev/next navigation ── */}
              {(prev || next) && (
                <nav
                  className="mt-10 pt-6 grid grid-cols-2 gap-3"
                  style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
                >
                  {/* Previous (newer) article */}
                  {prev ? (
                    <button
                      onClick={goPrev}
                      className="group flex items-start gap-3 p-3 rounded-xl text-left transition-all hover:bg-black/[0.03] active:scale-[0.98]"
                    >
                      <ChevronLeft className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                      <div className="min-w-0">
                        <span className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground/70">
                          {t("news.prevArticle")}
                        </span>
                        <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug mt-0.5 group-hover:text-primary transition-colors">
                          {prev.title}
                        </p>
                      </div>
                    </button>
                  ) : (
                    <div />
                  )}

                  {/* Next (older) article */}
                  {next ? (
                    <button
                      onClick={goNext}
                      className="group flex items-start gap-3 p-3 rounded-xl text-right transition-all hover:bg-black/[0.03] justify-end active:scale-[0.98]"
                    >
                      <div className="min-w-0">
                        <span className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground/70">
                          {t("news.nextArticle")}
                        </span>
                        <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug mt-0.5 group-hover:text-primary transition-colors">
                          {next.title}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                    </button>
                  ) : (
                    <div />
                  )}
                </nav>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ArticleDrawer;
