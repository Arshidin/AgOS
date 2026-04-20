import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { AdminStartupDetail } from '@/types/adminStartup';
import type { StartupTeamMember, StartupUseOfFunds } from '@/types/startup';

export function useAdminStartup(id: string | undefined) {
  return useQuery<AdminStartupDetail>({
    queryKey: ['admin', 'startup', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('startups')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Startup not found');

      const { data: teamMembers } = await supabase
        .from('startup_team_members')
        .select('*')
        .eq('startup_id', id!)
        .order('order_index', { ascending: true });

      const { data: useOfFunds } = await supabase
        .from('startup_use_of_funds')
        .select('*')
        .eq('startup_id', id!);

      return {
        ...(data as any),
        team_members: (teamMembers ?? []) as unknown as StartupTeamMember[],
        use_of_funds: (useOfFunds ?? []) as unknown as StartupUseOfFunds[],
      } as AdminStartupDetail;
    },
    enabled: !!id,
  });
}
