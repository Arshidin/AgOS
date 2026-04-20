import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ApplicationsFilters, ApplicationsResponse, Application } from '@/types/admin';

const PAGE_SIZE = 20;

export function useApplications(filters: ApplicationsFilters) {
  return useQuery<ApplicationsResponse>({
    queryKey: ['admin', 'applications', filters],
    queryFn: async () => {
      let query = supabase
        .from('registration_applications')
        .select('*', { count: 'exact' });

      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.role) {
        query = query.eq('role', filters.role);
      }
      if (filters.region) {
        query = query.eq('region', filters.region);
      }
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom.toISOString());
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo.toISOString());
      }

      const from = (filters.page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      query = query.order('created_at', { ascending: false }).range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      const total = count ?? 0;

      // Count pending applications for tabs
      const { count: pendingAll } = await supabase
        .from('registration_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: pendingFarmer } = await supabase
        .from('registration_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('role', 'farmer');

      const { count: pendingMpk } = await supabase
        .from('registration_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('role', 'mpk');

      return {
        data: (data ?? []) as unknown as Application[],
        total,
        page: filters.page,
        page_size: PAGE_SIZE,
        total_pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
        pending_all: pendingAll ?? 0,
        pending_farmer: pendingFarmer ?? 0,
        pending_mpk: pendingMpk ?? 0,
      };
    },
    placeholderData: keepPreviousData,
  });
}
