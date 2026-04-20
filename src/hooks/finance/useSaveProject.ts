import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ProjectInputs, ComputedStage } from '@/types/finance';

interface SaveArgs {
  inputs: ProjectInputs;
  segment: string;
  stages: ComputedStage[];
}

export function useSaveProject() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ inputs, segment, stages }: SaveArgs) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: project, error: pErr } = await supabase
        .from('finance_projects')
        .insert({
          user_id: user.id,
          goal_type: inputs.goal_type,
          is_agri_producer: inputs.is_agri_producer,
          land_area: inputs.land_area,
          has_feed_base: inputs.has_feed_base,
          has_farm: inputs.has_farm,
          herd_size: inputs.herd_size,
          target_herd_size: inputs.target_herd_size,
          import_livestock: inputs.import_livestock,
          need_infrastructure: inputs.need_infrastructure,
          user_segment: segment,
        } as Record<string, unknown>)
        .select('id')
        .single();

      if (pErr) throw pErr;

      if (stages.length > 0) {
        const stageRows = stages.map((s, i) => ({
          project_id: project.id as string,
          program_id: s.program.id,
          status: s.status,
          order_index: i,
        }));
        const { error: sErr } = await supabase
          .from('finance_project_stages')
          .insert(stageRows);
        if (sErr) throw sErr;
      }

      return project;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance-projects'] });
    },
  });
}
