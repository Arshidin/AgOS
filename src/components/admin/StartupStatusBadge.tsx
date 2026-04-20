import { useTranslation } from 'react-i18next';
import { AdminStatusBadge } from '@/components/admin/ui/AdminStatusBadge';
import type { SubmissionStatus } from '@/types/adminStartup';

const STATUS_VARIANT: Record<SubmissionStatus, 'warning' | 'success' | 'danger'> = {
  pending_review: 'warning',
  approved: 'success',
  rejected: 'danger',
};

export default function StartupStatusBadge({ status }: { status: SubmissionStatus }) {
  const { t } = useTranslation();
  const variant = STATUS_VARIANT[status];

  return (
    <AdminStatusBadge variant={variant}>
      {t(`admin.startupStatusBadge.${status}`)}
    </AdminStatusBadge>
  );
}
