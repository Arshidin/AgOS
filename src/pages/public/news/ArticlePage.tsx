import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import NewsSectionHeader from "@/components/public/news/NewsSectionHeader";
import Footer from "@/components/public/Footer";
import ArticleContent from "./components/ArticleContent";
import ArticleSEO from "./components/ArticleSEO";
import { useNewsArticle } from "@/hooks/useNewsArticle";

const ArticlePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const { data: article, isLoading } = useNewsArticle(slug);

  return (
    <>
      <NewsSectionHeader />

      <main className="min-h-screen pt-10 md:pt-14 pb-16 px-4">
        <div className="mx-auto max-w-3xl">
          {/* Back link */}
          <Link
            to="/news"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft size={16} />
            {t("news.backToNews")}
          </Link>

          {/* Loading */}
          {isLoading && (
            <div className="space-y-4 animate-pulse">
              <div className="aspect-video w-full bg-muted rounded-xl" />
              <div className="h-6 w-2/3 bg-muted rounded" />
              <div className="h-10 w-full bg-muted rounded" />
              <div className="space-y-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-4 w-full bg-muted rounded" />
                ))}
              </div>
            </div>
          )}

          {/* Not found */}
          {!isLoading && !article && (
            <div className="text-center py-16">
              <p className="text-lg text-muted-foreground">{t("news.notFound")}</p>
            </div>
          )}

          {/* Article */}
          {article && (
            <>
              <ArticleSEO article={article} />
              <ArticleContent article={article} />
            </>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
};

export default ArticlePage;
