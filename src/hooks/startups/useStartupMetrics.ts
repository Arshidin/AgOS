import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface StartupMetrics {
  totalProjects: number;
  totalRaised: number;
  totalSectors: number;
}

export function useStartupMetrics() {
  return useQuery<StartupMetrics>({
    queryKey: ['startups', 'metrics'],
    queryFn: async () => {
      // Count projects
      const { count } = await supabase
        .from('startups')
        .select('*', { count: 'exact', head: true });

      // Sum funding_raised
      const { data: fundingData } = await supabase
        .from('startups')
        .select('funding_raised');

      const totalRaised = (fundingData ?? []).reduce(
        (sum, row) => sum + ((row as any).funding_raised ?? 0),
        0
      );

      // Count distinct categories
      const { data: catData } = await supabase
        .from('startups')
        .select('category');

      const uniqueCategories = new Set(
        (catData ?? []).map((r: any) => r.category)
      );

      return {
        totalProjects: count ?? 0,
        totalRaised: totalRaised,
        totalSectors: uniqueCategories.size,
      };
    },
    staleTime: 60_000,
  });
}
