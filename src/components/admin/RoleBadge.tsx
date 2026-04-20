import { useTranslation } from 'react-i18next';
import { AdminStatusBadge } from '@/components/admin/ui/AdminStatusBadge';
import type { ApplicationRole } from '@/types/admin';

export default function RoleBadge({ role }: { role: ApplicationRole }) {
  const { t } = useTranslation();

  return (
    <AdminStatusBadge variant="primary">
      {t(`admin.roleBadge.${role}`)}
    </AdminStatusBadge>
  );
}
