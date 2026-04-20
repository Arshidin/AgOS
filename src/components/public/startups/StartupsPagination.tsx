import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function StartupsPagination({ page, totalPages, onPageChange }: Props) {
  const { t } = useTranslation();

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-4 pt-8">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="flex items-center gap-1 text-sm font-medium disabled:opacity-30 transition-opacity hover:opacity-70"
        style={{ color: '#2B180A' }}
      >
        <ChevronLeft size={16} />
        {t('startups.pagination.prev')}
      </button>

      <span className="text-sm tabular-nums" style={{ color: 'rgba(43,24,10,0.5)' }}>
        {t('startups.pagination.pageOf', { page, total: totalPages })}
      </span>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="flex items-center gap-1 text-sm font-medium disabled:opacity-30 transition-opacity hover:opacity-70"
        style={{ color: '#2B180A' }}
      >
        {t('startups.pagination.next')}
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
