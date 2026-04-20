import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { REQUIRED_DOCUMENTS } from '@/types/application-flow';

export interface ApplicantDocStatus {
  orgId: string | null;
  documents: Record<string, string | null>;
  allDocsUploaded: boolean;
  signed: boolean;
  signedFileName: string | null;
  paymentConfirmed: boolean;
  paymentSkipped: boolean;
  receiptFileName: string | null;
}

/**
 * Admin hook: looks up the organization by phone, then lists their
 * membership-documents from Supabase Storage.
 */
export function useApplicantDocuments(phone: string | undefined) {
  return useQuery<ApplicantDocStatus | null>({
    queryKey: ['admin', 'applicant-docs', phone],
    queryFn: async () => {
      if (!phone) return null;

      // Normalize phone to +7XXXXXXXXXX
      const digits = phone.replace(/\D/g, '');
      const normalized = digits.startsWith('7') ? `+${digits}` : `+7${digits}`;

      // Find organization by phone
      const { data: org } = await supabase
        .from('organizations' as any)
        .select('id')
        .eq('contact_phone', normalized)
        .maybeSingle();

      if (!org) return null;

      const orgId = (org as any).id as string;

      // List files in each subdirectory separately
      const [docsRes, signedRes, paymentRes] = await Promise.all([
        supabase.storage.from('membership-documents').list(`${orgId}/docs`, { limit: 100 }),
        supabase.storage.from('membership-documents').list(`${orgId}/signed`, { limit: 100 }),
        supabase.storage.from('membership-documents').list(`${orgId}/payment`, { limit: 100 }),
      ]);

      const docFiles = (docsRes.data ?? []).map(f => f.name);
      const signedFileNames = (signedRes.data ?? []).map(f => f.name);
      const paymentFileNames = (paymentRes.data ?? []).map(f => f.name);

      // Documents
      const documents: Record<string, string | null> = {};
      for (const slot of REQUIRED_DOCUMENTS) {
        const found = docFiles.find(f => f.startsWith(`${slot.key}_`));
        documents[slot.key] = found ? `docs/${found}` : null;
      }
      const allDocsUploaded = REQUIRED_DOCUMENTS.every(slot => documents[slot.key] !== null);

      // Signed
      const signedFile = signedFileNames.find(f => f.startsWith('application_'));
      const signed = !!signedFile;

      // Payment
      const paymentConfirmed = paymentFileNames.some(f => f === 'confirmed');
      const paymentSkipped = paymentFileNames.some(f => f === 'skipped');
      const receiptFile = paymentFileNames.find(f => f.startsWith('receipt_'));

      return {
        orgId,
        documents,
        allDocsUploaded,
        signed,
        signedFileName: signedFile ? `signed/${signedFile}` : null,
        paymentConfirmed,
        paymentSkipped,
        receiptFileName: receiptFile ? `payment/${receiptFile}` : null,
      };
    },
    enabled: !!phone,
  });
}
