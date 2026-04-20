import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = "https://turanstandard.kz";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Fetch all published news articles
  const { data: articles } = await supabase
    .from("news_articles")
    .select("slug, updated_at, published_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  // Fetch all published startups
  const { data: startups } = await supabase
    .from("startups")
    .select("slug, updated_at")
    .eq("is_published", true)
    .eq("submission_status", "approved");

  const staticPages = [
    { loc: "/", priority: "1.0", changefreq: "weekly" },
    { loc: "/news", priority: "0.9", changefreq: "daily" },
    { loc: "/startups", priority: "0.8", changefreq: "weekly" },
    { loc: "/registration", priority: "0.6", changefreq: "monthly" },
  ];

  const urls = staticPages.map(
    (p) => `
  <url>
    <loc>${SITE_URL}${p.loc}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`,
  );

  if (articles) {
    for (const a of articles) {
      urls.push(`
  <url>
    <loc>${SITE_URL}/article/${a.slug}</loc>
    <lastmod>${(a.updated_at || a.published_at).split("T")[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`);
    }
  }

  if (startups) {
    for (const s of startups) {
      urls.push(`
  <url>
    <loc>${SITE_URL}/startups/${s.slug}</loc>
    <lastmod>${s.updated_at.split("T")[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`);
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
