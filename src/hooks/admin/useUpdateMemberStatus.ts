import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { MembershipStatus } from '@/types/membership';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface StatusChangeParams {
  organizationId: string;
  newStatus: MembershipStatus;
  note?: string;
  oldStatus: MembershipStatus;
}

export function useUpdateMemberStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ organizationId, newStatus, note, oldStatus }: StatusChangeParams) => {
      // Build update payload
      const updates: Record<string, any> = {
        membership_status: newStatus,
      };

      if (newStatus === 'observer' && oldStatus === 'applicant') {
        updates.approved_at = new Date().toISOString();
      }
      if (newStatus === 'active' && oldStatus === 'observer') {
        updates.activated_at = new Date().toISOString();
      }
      if (newStatus === 'restricted' || newStatus === 'expelled') {
        updates.status_note = note;
      }

      // Update organization
      const { error: orgError } = await supabase
        .from('organizations' as any)
        .update(updates)
        .eq('id', organizationId);
      if (orgError) throw orgError;

      // Update user role if approving
      if (newStatus === 'observer' && oldStatus === 'applicant') {
        // Get the org to know type
        const { data: org } = await supabase
          .from('organizations' as any)
          .select('org_type')
          .eq('id', organizationId)
          .single();
        if (org) {
          await supabase
            .from('user_profiles' as any)
            .update({ role: (org as any).org_type })
            .eq('organization_id', organizationId);
        }
      }

      // Write audit log
      await supabase.from('audit_log' as any).insert({
        actor_id: user?.id,
        action: `membership_status_change: ${oldStatus} → ${newStatus}`,
        entity_type: 'organization',
        entity_id: organizationId,
        old_values: { membership_status: oldStatus },
        new_values: { membership_status: newStatus },
        note: note || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-members'] });
      toast.success(t('admin.members.statusUpdated'));
    },
    onError: (err: any) => {
      toast.error(err?.message || t('admin.members.statusError'));
    },
  });
}
