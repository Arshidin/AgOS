import { useTranslation } from 'react-i18next';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fullName: string;
  role: string;
  isPending: boolean;
  onConfirm: () => void;
}

export default function ApproveDialog({ open, onOpenChange, fullName, role, isPending, onConfirm }: Props) {
  const { t } = useTranslation();
  const roleLabel = t(role === 'farmer' ? 'admin.approveDialog.farmerRole' : 'admin.approveDialog.processorRole');

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('admin.approveDialog.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('admin.approveDialog.description', { name: fullName, role: roleLabel })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{t('admin.approveDialog.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            style={{ background: 'var(--cta)', color: 'var(--cta-fg)' }}
          >
            {isPending ? t('admin.approveDialog.approving') : t('admin.approveDialog.approve')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
