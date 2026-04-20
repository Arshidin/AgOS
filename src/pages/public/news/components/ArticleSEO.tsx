import { Helmet } from "react-helmet-async";
import type { NewsArticle } from "@/types/news";

interface ArticleSEOProps {
  article: NewsArticle;
}

const ArticleSEO = ({ article }: ArticleSEOProps) => {
  const title = article.meta_title || article.title;
  const description = article.meta_description || article.summary || "";
  const url = `https://turanstandard.kz/article/${article.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description,
    image: article.cover_image_url || undefined,
    datePublished: article.published_at,
    dateModified: article.updated_at,
    author: article.author
      ? { "@type": "Person", name: article.author }
      : { "@type": "Organization", name: "TURAN" },
    publisher: {
      "@type": "Organization",
      name: "TURAN",
      url: "https://turanstandard.kz",
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };

  return (
    <Helmet>
      <title>{title} | TURAN</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      {/* Open Graph */}
      <meta property="og:type" content="article" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      {article.cover_image_url && (
        <meta property="og:image" content={article.cover_image_url} />
      )}
      <meta property="og:site_name" content="TURAN" />
      <meta property="article:published_time" content={article.published_at} />
      <meta property="article:modified_time" content={article.updated_at} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {article.cover_image_url && (
        <meta name="twitter:image" content={article.cover_image_url} />
      )}

      {/* JSON-LD */}
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  );
};

export default ArticleSEO;
