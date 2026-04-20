const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function getMetaContent(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

function extractArticleText(html: string): string {
  // Try to extract from <article> first, then <main>, then full body
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const source = articleMatch?.[1] || mainMatch?.[1] || html;

  return source
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractAuthor(html: string): string | null {
  return (
    getMetaContent(html, 'article:author') ??
    getMetaContent(html, 'author') ??
    getMetaContent(html, 'dc.creator') ??
    getMetaContent(html, 'sailthru.author') ??
    html.match(/"author":\s*\{[^}]*"name":\s*"([^"]+)"/i)?.[1] ??
    html.match(/"author":\s*"([^"]+)"/i)?.[1] ??
    null
  );
}

function extractTags(html: string): string[] {
  const tags: string[] = [];
  // article:tag meta
  const tagRegex = /<meta[^>]+(?:property|name)=["'](?:article:tag|keywords)["'][^>]+content=["']([^"']+)["']/gi;
  let m;
  while ((m = tagRegex.exec(html)) !== null) {
    m[1].split(',').forEach(t => {
      const clean = t.trim();
      if (clean && !tags.includes(clean)) tags.push(clean);
    });
  }
  // Also reversed attribute order
  const tagRegex2 = /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:article:tag|keywords)["']/gi;
  while ((m = tagRegex2.exec(html)) !== null) {
    m[1].split(',').forEach(t => {
      const clean = t.trim();
      if (clean && !tags.includes(clean)) tags.push(clean);
    });
  }
  // JSON-LD keywords
  const jsonLdMatch = html.match(/"keywords"\s*:\s*\[([^\]]+)\]/i);
  if (jsonLdMatch) {
    jsonLdMatch[1].replace(/"/g, '').split(',').forEach(t => {
      const clean = t.trim();
      if (clean && !tags.includes(clean)) tags.push(clean);
    });
  }
  return tags.slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url || !url.startsWith('http')) {
      return new Response(
        JSON.stringify({ error: 'INVALID_URL', message: 'Укажите корректный URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Fetch the page
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TuranBot/1.0; +https://turanstandard.kz)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ru,kk,en;q=0.5',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: 'URL_UNREACHABLE', message: `Страница вернула ${response.status}` }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await response.text();

    // 2. Parse meta tags
    const title =
      getMetaContent(html, 'og:title') ??
      getMetaContent(html, 'twitter:title') ??
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ??
      null;

    const description =
      getMetaContent(html, 'og:description') ??
      getMetaContent(html, 'twitter:description') ??
      getMetaContent(html, 'description') ??
      null;

    const image =
      getMetaContent(html, 'og:image') ??
      getMetaContent(html, 'twitter:image') ??
      null;

    const siteName =
      getMetaContent(html, 'og:site_name') ??
      null;

    const publishedTime =
      getMetaContent(html, 'article:published_time') ??
      getMetaContent(html, 'datePublished') ??
      getMetaContent(html, 'date') ??
      html.match(/"datePublished"\s*:\s*"([^"]+)"/i)?.[1] ??
      null;

    const author = extractAuthor(html);
    const tags = extractTags(html);

    // 3. Extract article text for AI summarisation
    const textContent = extractArticleText(html).slice(0, 5000);

    // 4. Generate summary via Lovable AI (always enrich to 300-500 chars)
    let summary = description;
    const needsAiSummary = !summary || summary.length < 300;

    if (needsAiSummary && textContent.length > 100) {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

      if (LOVABLE_API_KEY) {
        try {
          const prompt = needsAiSummary
            ? `Ты — редактор отраслевого медиа об агросекторе Казахстана. Прочитай текст статьи и напиши ёмкое описание (summary) длиной 300–500 символов на русском языке.

Требования:
- Передай ключевой факт / событие / заявление из статьи
- Упомяни главных участников (компании, персоны, организации)
- Если есть цифры (суммы, объёмы, даты) — включи их
- Пиши нейтральным информационным стилем, без оценочных слов
- Только текст описания, без кавычек, заголовков и пояснений

Текст статьи:
${textContent}`
            : `Ты — редактор отраслевого медиа. У тебя есть мета-описание статьи и её текст. Расширь мета-описание до 300–500 символов, добавив конкретные факты, цифры и имена из текста. Пиши на русском, нейтральным информационным стилем. Только текст, без кавычек и пояснений.

Мета-описание: ${description}

Текст статьи:
${textContent}`;

          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash-lite',
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 400,
            }),
          });

          const aiData = await aiResponse.json();
          const aiText = aiData.choices?.[0]?.message?.content?.trim();
          if (aiText && aiText.length > 50) {
            summary = aiText.slice(0, 500);
          }
        } catch (err) {
          console.error('AI summary error:', err);
          if (needsAiSummary) {
            summary = textContent.slice(0, 500) + '...';
          }
        }
      } else if (needsAiSummary) {
        summary = textContent.slice(0, 500) + '...';
      }
    }

    // 5. Resolve relative image URLs
    let coverImageUrl = image;
    if (coverImageUrl && !coverImageUrl.startsWith('http')) {
      const urlObj = new URL(url);
      coverImageUrl = coverImageUrl.startsWith('/')
        ? `${urlObj.protocol}//${urlObj.host}${coverImageUrl}`
        : `${urlObj.protocol}//${urlObj.host}/${coverImageUrl}`;
    }

    return new Response(
      JSON.stringify({
        title: title || null,
        summary: summary || null,
        cover_image_url: coverImageUrl || null,
        source_name: siteName || new URL(url).hostname.replace('www.', ''),
        published_date: publishedTime || null,
        author: author || null,
        tags: tags,
        url,
        _meta: {
          has_og: !!getMetaContent(html, 'og:title'),
          ai_generated_summary: needsAiSummary,
          partial: !title || !summary,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const isTimeout = error instanceof DOMException && error.name === 'AbortError';
    return new Response(
      JSON.stringify({
        error: isTimeout ? 'TIMEOUT' : 'PARSE_ERROR',
        message: isTimeout
          ? 'Превышено время ожидания (15 секунд)'
          : 'Ошибка обработки страницы',
      }),
      { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
