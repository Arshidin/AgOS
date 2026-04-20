import { useTranslation } from 'react-i18next';
import { AdminStatusBadge } from '@/components/admin/ui/AdminStatusBadge';
import type { ApplicationStatus } from '@/types/admin';

const STATUS_VARIANT: Record<ApplicationStatus, 'warning' | 'success' | 'danger'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

export default function StatusBadge({ status }: { status: ApplicationStatus }) {
  const { t } = useTranslation();
  const variant = STATUS_VARIANT[status];

  return (
    <AdminStatusBadge variant={variant}>
      {t(`admin.statusBadge.${status}`)}
    </AdminStatusBadge>
  );
}
