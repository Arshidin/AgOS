import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { REQUIRED_DOCUMENTS } from '@/types/application-flow';

export interface OrgDocStatus {
  /** Maps slot key → full storage path (e.g. "orgId/docs/file.pdf") or null */
  documents: Record<string, string | null>;
  allDocsUploaded: boolean;
  signed: boolean;
  signedPath: string | null;
  paymentConfirmed: boolean;
  paymentSkipped: boolean;
  paymentPath: string | null;
}

export function useOrgDocuments(orgId: string | undefined) {
  const query = useQuery<OrgDocStatus | null>({
    queryKey: ['admin', 'org-docs', orgId],
    queryFn: async () => {
      if (!orgId) return null;

      const [docsRes, signedRes, paymentRes] = await Promise.all([
        supabase.storage.from('membership-documents').list(`${orgId}/docs`, { limit: 100 }),
        supabase.storage.from('membership-documents').list(`${orgId}/signed`, { limit: 100 }),
        supabase.storage.from('membership-documents').list(`${orgId}/payment`, { limit: 100 }),
      ]);

      const docFiles = (docsRes.data ?? []).map(f => f.name);
      const signedFiles = (signedRes.data ?? []).map(f => f.name);
      const paymentFiles = (paymentRes.data ?? []).map(f => f.name);

      const documents: Record<string, string | null> = {};
      for (const slot of REQUIRED_DOCUMENTS) {
        const found = docFiles.find(f => f.startsWith(`${slot.key}_`));
        documents[slot.key] = found ? `${orgId}/docs/${found}` : null;
      }
      const allDocsUploaded = REQUIRED_DOCUMENTS.every(slot => documents[slot.key] !== null);
      const signedFile = signedFiles.find(f => f.startsWith('application_'));
      const signed = !!signedFile;
      const signedPath = signedFile ? `${orgId}/signed/${signedFile}` : null;

      const paymentConfirmed = paymentFiles.some(f => f === 'confirmed');
      const paymentSkipped = paymentFiles.some(f => f === 'skipped');
      const payFile = paymentFiles.find(f => f !== '.emptyFolderPlaceholder');
      const paymentPath = payFile ? `${orgId}/payment/${payFile}` : null;

      return { documents, allDocsUploaded, signed, signedPath, paymentConfirmed, paymentSkipped, paymentPath };
    },
    enabled: !!orgId,
  });

  const downloadFile = useCallback(async (path: string) => {
    const { data, error } = await supabase.storage
      .from('membership-documents')
      .createSignedUrl(path, 300);
    if (error || !data?.signedUrl) return;
    window.open(data.signedUrl, '_blank');
  }, []);

  return { ...query, downloadFile };
}
