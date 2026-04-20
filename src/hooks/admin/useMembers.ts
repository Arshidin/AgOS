import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Organization, MembershipStatus, OrgType } from '@/types/membership';

export interface MemberFilters {
  status?: MembershipStatus | 'all';
  orgType?: OrgType | 'all';
  region?: string | 'all';
  search?: string;
  page?: number;
}

const PAGE_SIZE = 20;

export function useMembers(filters: MemberFilters = {}) {
  const { status = 'all', orgType = 'all', region = 'all', search = '', page = 0 } = filters;

  return useQuery({
    queryKey: ['admin-members', status, orgType, region, search, page],
    queryFn: async () => {
      let query = supabase
        .from('organizations' as any)
        .select('*', { count: 'exact' })
        .order('applied_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (status !== 'all') {
        query = query.eq('membership_status', status);
      }
      if (orgType !== 'all') {
        query = query.eq('org_type', orgType);
      }
      if (region !== 'all') {
        query = query.eq('region', region);
      }
      if (search.trim()) {
        query = query.or(`name.ilike.%${search}%,contact_name.ilike.%${search}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        members: (data ?? []) as any as Organization[],
        total: count ?? 0,
        pageSize: PAGE_SIZE,
      };
    },
  });
}
