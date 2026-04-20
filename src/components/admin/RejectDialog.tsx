import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onConfirm: (reason: string) => void;
}

export default function RejectDialog({ open, onOpenChange, isPending, onConfirm }: Props) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    onConfirm(reason);
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) setReason('');
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('admin.rejectDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('admin.rejectDialog.description')}
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder={t('admin.rejectDialog.placeholder')}
          rows={4}
        />
        <p className="text-xs" style={{ color: reason.trim().length >= 10 ? 'rgba(43,24,10,0.4)' : '#993333' }}>
          {t('admin.rejectDialog.charCount', { count: reason.trim().length })}
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            {t('admin.rejectDialog.cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={reason.trim().length < 10 || isPending}
            style={{ background: '#993333', color: '#fff' }}
          >
            {isPending ? t('admin.rejectDialog.rejecting') : t('admin.rejectDialog.reject')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
