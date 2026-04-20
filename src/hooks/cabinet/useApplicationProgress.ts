import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { REQUIRED_DOCUMENTS, type ApplicationStep } from '@/types/application-flow';

export interface ApplicationProgress {
  /** Map of document slot key → uploaded file name (null if not uploaded) */
  documents: Record<string, string | null>;
  /** Whether the application form has been signed */
  signed: boolean;
  /** Signed file name if exists */
  signedFileName: string | null;
  /** Whether the entry fee has been paid (or skipped) */
  paymentCompleted: boolean;
  /** Whether payment was explicitly skipped */
  paymentSkipped: boolean;
  /** Current step the user should be on */
  currentStep: ApplicationStep;
  /** Whether all steps before review are complete */
  readyForReview: boolean;
}


export function useApplicationProgress() {
  const { organization } = useAuth();
  const orgId = organization?.id;

  return useQuery({
    queryKey: ['application-progress', orgId],
    queryFn: async (): Promise<ApplicationProgress> => {
      if (!orgId) throw new Error('No organization');

      // List files in each subdirectory separately
      const [docsRes, signedRes, paymentRes] = await Promise.all([
        supabase.storage.from('membership-documents').list(`${orgId}/docs`, { limit: 100 }),
        supabase.storage.from('membership-documents').list(`${orgId}/signed`, { limit: 100 }),
        supabase.storage.from('membership-documents').list(`${orgId}/payment`, { limit: 100 }),
      ]);

      const docFiles = (docsRes.data ?? []).map(f => `docs/${f.name}`);
      const signedFiles = (signedRes.data ?? []).map(f => `signed/${f.name}`);
      const paymentFiles = (paymentRes.data ?? []).map(f => `payment/${f.name}`);
      const fileNames = [...docFiles, ...signedFiles, ...paymentFiles];

      // Check document slots
      const documents: Record<string, string | null> = {};
      for (const slot of REQUIRED_DOCUMENTS) {
        const found = fileNames.find(f => f.startsWith(`docs/${slot.key}_`));
        documents[slot.key] = found ?? null;
      }

      // Check signed application
      const signedFile = fileNames.find(f => f.startsWith('signed/'));
      const signed = !!signedFile;

      // Check payment marker
      const paymentDone = fileNames.some(f => f === 'payment/confirmed');
      const paymentSkipped = fileNames.some(f => f === 'payment/skipped');

      // Determine current step
      const allDocsUploaded = REQUIRED_DOCUMENTS.every(slot => documents[slot.key] !== null);
      let currentStep: ApplicationStep = 'documents';
      if (allDocsUploaded) currentStep = 'signing';
      if (allDocsUploaded && signed) currentStep = 'payment';
      if (allDocsUploaded && signed && (paymentDone || paymentSkipped)) currentStep = 'review';

      const readyForReview = allDocsUploaded && signed && (paymentDone || paymentSkipped);

      return {
        documents,
        signed,
        signedFileName: signedFile ?? null,
        paymentCompleted: paymentDone || paymentSkipped,
        paymentSkipped,
        currentStep,
        readyForReview,
      };
    },
    enabled: !!orgId,
  });
}

export function useUploadDocument() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const orgId = organization?.id;

  return useMutation({
    mutationFn: async ({ slotKey, file }: { slotKey: string; file: File }) => {
      if (!orgId) throw new Error('No organization');

      // Remove existing file for this slot
      const { data: existing } = await supabase.storage
        .from('membership-documents')
        .list(`${orgId}/docs`, { limit: 100 });

      const toRemove = (existing ?? [])
        .filter(f => f.name.startsWith(`${slotKey}_`))
        .map(f => `${orgId}/docs/${f.name}`);

      if (toRemove.length > 0) {
        await supabase.storage.from('membership-documents').remove(toRemove);
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      const path = `${orgId}/docs/${slotKey}_${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from('membership-documents')
        .upload(path, file, { upsert: true });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application-progress', orgId] });
      toast.success(t('applicationFlow.docUploaded'));
    },
    onError: () => {
      toast.error(t('applicationFlow.uploadError'));
    },
  });
}

export function useDeleteDocument() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  const orgId = organization?.id;

  return useMutation({
    mutationFn: async (slotKey: string) => {
      if (!orgId) throw new Error('No organization');

      const { data: existing } = await supabase.storage
        .from('membership-documents')
        .list(`${orgId}/docs`, { limit: 100 });

      const toRemove = (existing ?? [])
        .filter(f => f.name.startsWith(`${slotKey}_`))
        .map(f => `${orgId}/docs/${f.name}`);

      if (toRemove.length > 0) {
        const { error } = await supabase.storage.from('membership-documents').remove(toRemove);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application-progress', orgId] });
    },
  });
}

export function useUploadSignedApplication() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const orgId = organization?.id;

  return useMutation({
    mutationFn: async (file: File) => {
      if (!orgId) throw new Error('No organization');

      // Remove existing signed files
      const { data: existing } = await supabase.storage
        .from('membership-documents')
        .list(`${orgId}/signed`, { limit: 100 });

      const toRemove = (existing ?? [])
        .filter(f => f.name.startsWith('application_'))
        .map(f => `${orgId}/signed/${f.name}`);

      if (toRemove.length > 0) {
        await supabase.storage.from('membership-documents').remove(toRemove);
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      const path = `${orgId}/signed/application_${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from('membership-documents')
        .upload(path, file, { upsert: true });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application-progress', orgId] });
      toast.success(t('applicationFlow.signedUploaded'));
    },
    onError: () => {
      toast.error(t('applicationFlow.uploadError'));
    },
  });
}

export function useMarkPayment() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const orgId = organization?.id;

  return useMutation({
    mutationFn: async (action: 'confirm' | 'skip') => {
      if (!orgId) throw new Error('No organization');

      // Clean up old payment markers
      const { data: existing } = await supabase.storage
        .from('membership-documents')
        .list(`${orgId}/payment`, { limit: 100 });

      const toRemove = (existing ?? [])
        .map(f => `${orgId}/payment/${f.name}`);

      if (toRemove.length > 0) {
        await supabase.storage.from('membership-documents').remove(toRemove);
      }

      const markerName = action === 'confirm' ? 'confirmed' : 'skipped';
      const path = `${orgId}/payment/${markerName}`;
      const blob = new Blob(['1'], { type: 'text/plain' });

      const { error } = await supabase.storage
        .from('membership-documents')
        .upload(path, blob, { upsert: true });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application-progress', orgId] });
      toast.success(t('applicationFlow.paymentMarked'));
    },
    onError: () => {
      toast.error(t('applicationFlow.paymentError'));
    },
  });
}
