export type NewsType = 'association' | 'media';

export type NewsCategory = 'industry' | 'standards' | 'events' | 'partnership' | 'general';

export interface NewsArticle {
  id: string;
  type: NewsType;
  title: string;
  slug: string;
  summary: string | null;
  cover_image_url: string | null;
  published_at: string;
  content: string | null;
  author: string | null;
  video_url: string | null;
  video_type: 'youtube' | 'instagram' | null;
  source_name: string | null;
  source_url: string | null;
  source_logo_url: string | null;
  category: NewsCategory;
  tags: string[];
  is_published: boolean;
  is_featured: boolean;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewsArticlesFilters {
  type?: NewsType;
  limit?: number;
  offset?: number;
}

export interface NewsArticlesResponse {
  data: NewsArticle[];
  total: number;
  hasMore: boolean;
}
