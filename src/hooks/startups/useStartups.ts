import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { StartupsFilters, StartupsResponse, Startup } from '@/types/startup';

const PAGE_SIZE = 12;

export function useStartups(filters: StartupsFilters) {
  return useQuery<StartupsResponse>({
    queryKey: ['startups', filters],
    queryFn: async () => {
      let query = supabase
        .from('startups')
        .select('*', { count: 'exact' })
        .eq('is_published', true);

      // Search
      if (filters.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,tagline.ilike.%${filters.search}%`
        );
      }

      // Filters
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.stage) {
        query = query.eq('stage', filters.stage);
      }
      if (filters.fundingStatus) {
        query = query.eq('funding_status', filters.fundingStatus);
      }
      if (filters.region) {
        query = query.eq('location_region', filters.region);
      }

      // Sorting
      switch (filters.sort) {
        case 'funding_ask_desc':
          query = query.order('funding_ask', { ascending: false, nullsFirst: false });
          break;
        case 'funding_ask_asc':
          query = query.order('funding_ask', { ascending: true, nullsFirst: false });
          break;
        default: // 'newest'
          query = query.order('created_at', { ascending: false });
      }

      // Pagination
      const from = (filters.page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      const total = count ?? 0;

      return {
        data: (data ?? []) as unknown as Startup[],
        total,
        page: filters.page,
        pageSize: PAGE_SIZE,
        totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      };
    },
    placeholderData: keepPreviousData,
  });
}
