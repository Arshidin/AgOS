import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function useMembershipDocs() {
  const { organization } = useAuth();
  const orgId = organization?.id;

  return useQuery({
    queryKey: ['membership-docs', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.storage
        .from('membership-documents')
        .list(orgId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

export function useUploadMembershipDoc() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const orgId = organization?.id;

  return useMutation({
    mutationFn: async (file: File) => {
      if (!orgId) throw new Error('No organization');
      const path = `${orgId}/${file.name}`;
      const { error } = await supabase.storage
        .from('membership-documents')
        .upload(path, file, { upsert: true });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-docs', orgId] });
      toast.success(t('cabinet.membership.docUploaded'));
    },
    onError: () => {
      toast.error(t('cabinet.membership.uploadError'));
    },
  });
}

export function useDeleteMembershipDoc() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  const orgId = organization?.id;

  return useMutation({
    mutationFn: async (fileName: string) => {
      if (!orgId) throw new Error('No organization');
      const { error } = await supabase.storage
        .from('membership-documents')
        .remove([`${orgId}/${fileName}`]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-docs', orgId] });
    },
  });
}
