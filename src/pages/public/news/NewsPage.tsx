import { useState, useCallback } from "react";
import { useSearchParams, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import NewsSectionHeader from "@/components/public/news/NewsSectionHeader";
import Footer from "@/components/public/Footer";
import NewsGrid from "./components/NewsGrid";
import { useNewsArticles } from "@/hooks/useNewsArticles";
import type { NewsType } from "@/types/news";

const PAGE_SIZE = 9;

const NEWS_TYPES: { label: string; value: NewsType | undefined }[] = [
  { label: "news.filters.all", value: undefined },
  { label: "news.filters.association", value: "association" },
  { label: "news.filters.media", value: "media" },
];

const NewsPage = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const typeParam = searchParams.get("type") as NewsType | null;
  const activeType =
    typeParam === "association" || typeParam === "media" ? typeParam : undefined;

  const [limit, setLimit] = useState(PAGE_SIZE);

  const { data, isLoading } = useNewsArticles({ type: activeType, limit, offset: 0 });

  const handleTypeChange = useCallback(
    (type: NewsType | undefined) => {
      setLimit(PAGE_SIZE);
      if (type) {
        setSearchParams({ type });
      } else {
        setSearchParams({});
      }
    },
    [setSearchParams],
  );

  const handleLoadMore = useCallback(() => {
    setLimit((prev) => prev + PAGE_SIZE);
  }, []);

  const total = data?.total;

  return (
    <>
      <Helmet>
        <title>{t("news.pageTitle")} | TURAN</title>
        <meta name="description" content={t("news.pageDescription")} />
        <link rel="canonical" href="https://turanstandard.kz/news" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`${t("news.pageTitle")} | TURAN`} />
        <meta property="og:description" content={t("news.pageDescription")} />
        <meta property="og:url" content="https://turanstandard.kz/news" />
        <meta property="og:site_name" content="TURAN" />
      </Helmet>

      <NewsSectionHeader />

      {/* ── Sticky filter bar ── */}
      <div className="sticky top-14 md:top-16 z-30 bg-[#fdf6ee]/95 backdrop-blur-md border-b border-[#2B180A]/8">
        <div className="mx-auto max-w-6xl px-4 py-2.5">
          <div className="flex items-center justify-between gap-4">
            {/* Type filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {NEWS_TYPES.map((f) => {
                const active = activeType === f.value;
                return (
                  <button
                    key={f.value ?? "all"}
                    onClick={() => handleTypeChange(f.value)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                      active
                        ? "bg-[#2B180A] text-white"
                        : "bg-[#2B180A]/5 text-[#2B180A]/65 hover:bg-[#2B180A]/10"
                    }`}
                  >
                    {t(f.label)}
                  </button>
                );
              })}
            </div>

            {/* Count */}
            {total != null && (
              <span className="shrink-0 text-[13px] text-[#2B180A]/45 whitespace-nowrap">
                <span className="font-semibold text-[#2B180A]">{total}</span>
                {" "}{t("news.filters.articles", { defaultValue: "материалов" })}
              </span>
            )}
          </div>
        </div>
      </div>

      <main className="min-h-screen pt-8 md:pt-10 pb-16 px-4">
        <div className="mx-auto max-w-6xl">
          <NewsGrid
            articles={data?.data ?? []}
            hasMore={data?.hasMore ?? false}
            isLoading={isLoading}
            onLoadMore={handleLoadMore}
          />
        </div>
      </main>

      <Footer />

      {/* Nested drawer route */}
      <Outlet />
    </>
  );
};

export default NewsPage;
