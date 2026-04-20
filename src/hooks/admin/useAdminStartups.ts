import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { AdminStartupsFilters, AdminStartupsResponse, AdminStartup } from '@/types/adminStartup';

const PAGE_SIZE = 20;

export function useAdminStartups(filters: AdminStartupsFilters) {
  return useQuery<AdminStartupsResponse>({
    queryKey: ['admin', 'startups', filters],
    queryFn: async () => {
      let query = supabase
        .from('startups')
        .select('*', { count: 'exact' });

      if (filters.submission_status) {
        query = query.eq('submission_status', filters.submission_status);
      }
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.stage) {
        query = query.eq('stage', filters.stage);
      }

      const from = (filters.page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      query = query.order('created_at', { ascending: false }).range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      const total = count ?? 0;

      // Count pending startups
      const { count: pendingCount } = await supabase
        .from('startups')
        .select('*', { count: 'exact', head: true })
        .eq('submission_status', 'pending_review');

      return {
        data: (data ?? []) as unknown as AdminStartup[],
        total,
        page: filters.page,
        page_size: PAGE_SIZE,
        total_pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
        pending_count: pendingCount ?? 0,
      };
    },
    placeholderData: keepPreviousData,
  });
}
