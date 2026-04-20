// Application flow step tracking

export type ApplicationStep = 'documents' | 'signing' | 'payment' | 'review';

export interface DocumentSlot {
  key: string;
  labelKey: string;
  descriptionKey: string;
  required: boolean;
}

export const REQUIRED_DOCUMENTS: DocumentSlot[] = [
  {
    key: 'registration_certificate',
    labelKey: 'applicationFlow.docs.registrationCertificate',
    descriptionKey: 'applicationFlow.docs.registrationCertificateDesc',
    required: true,
  },
  {
    key: 'identity_document',
    labelKey: 'applicationFlow.docs.identityDocument',
    descriptionKey: 'applicationFlow.docs.identityDocumentDesc',
    required: true,
  },
  {
    key: 'bank_details',
    labelKey: 'applicationFlow.docs.bankDetails',
    descriptionKey: 'applicationFlow.docs.bankDetailsDesc',
    required: true,
  },
];

export const APPLICATION_STEPS: { key: ApplicationStep; labelKey: string }[] = [
  { key: 'documents', labelKey: 'applicationFlow.steps.documents' },
  { key: 'signing', labelKey: 'applicationFlow.steps.signing' },
  { key: 'payment', labelKey: 'applicationFlow.steps.payment' },
  { key: 'review', labelKey: 'applicationFlow.steps.review' },
];

export const ACCEPTED_FILE_TYPES = '.pdf,.jpg,.jpeg,.png';
export const MAX_FILE_SIZE_MB = 10;
