import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { StartupDetail, Startup, StartupTeamMember, StartupUseOfFunds } from '@/types/startup';

export function useStartup(slug: string | undefined) {
  return useQuery<StartupDetail | null>({
    queryKey: ['startup', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('startups')
        .select('*')
        .eq('slug', slug!)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const startup = data as unknown as Startup;

      // Fetch team members
      const { data: teamData } = await supabase
        .from('startup_team_members')
        .select('*')
        .eq('startup_id', startup.id)
        .order('order_index', { ascending: true });

      // Fetch use of funds
      const { data: fundsData } = await supabase
        .from('startup_use_of_funds')
        .select('*')
        .eq('startup_id', startup.id)
        .order('percentage', { ascending: false });

      return {
        ...startup,
        team_members: (teamData ?? []) as unknown as StartupTeamMember[],
        use_of_funds: (fundsData ?? []) as unknown as StartupUseOfFunds[],
      };
    },
    enabled: !!slug,
  });
}
