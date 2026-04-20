import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Inbox, ChevronLeft, ChevronRight as ChevronR, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminPageHeader } from '@/components/admin/ui/AdminPageHeader';
import StartupStatusBadge from '@/components/admin/StartupStatusBadge';
import { useAdminStartups } from '@/hooks/admin/useAdminStartups';
import { useDeleteStartup } from '@/hooks/admin/useDeleteStartup';
import { useToast } from '@/hooks/use-toast';
import { STARTUP_CATEGORIES, STARTUP_STAGES } from '@/lib/constants';
import type { AdminStartupsFilters, SubmissionStatus } from '@/types/adminStartup';
import type { StartupCategory, StartupStage } from '@/types/startup';

type StatusTab = 'all' | 'pending_review' | 'approved' | 'rejected';

export default function StartupList() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<StatusTab>('all');
  const [filters, setFilters] = useState<AdminStartupsFilters>({
    submission_status: null,
    category: null,
    stage: null,
    page: 1,
  });

  const handleTabChange = (tab: StatusTab) => {
    setActiveTab(tab);
    setFilters(f => ({
      ...f,
      submission_status: tab === 'all' ? null : tab as SubmissionStatus,
      page: 1,
    }));
  };

  const { data, isLoading, error, refetch } = useAdminStartups(filters);
  const { toast } = useToast();
  const deleteStartup = useDeleteStartup();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteStartup.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast({ title: t('admin.startups.deleted') });
        setDeleteTarget(null);
      },
    });
  };

  const updateFilter = (key: keyof AdminStartupsFilters, value: unknown) => {
    setFilters(f => ({ ...f, [key]: value, page: 1 }));
  };

  const resetFilters = () => {
    setFilters({
      submission_status: activeTab === 'all' ? null : activeTab as SubmissionStatus,
      category: null,
      stage: null,
      page: 1,
    });
  };

  const hasNonDefaultFilters = filters.category !== null || filters.stage !== null;

  const startups = data?.data ?? [];
  const totalPages = data?.total_pages ?? 1;

  const monthsShort = t('admin.monthsShort', { returnObjects: true }) as string[];

  function formatDate(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    if (d.toDateString() === now.toDateString()) return `${t('admin.startupList.today')}, ${time}`;

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return `${t('admin.startupList.yesterday')}, ${time}`;

    return `${d.getDate()} ${monthsShort[d.getMonth()]} ${d.getFullYear()}`;
  }

  function formatAmount(amount: number | null): string {
    if (!amount) return '—';
    if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
    return `$${amount}`;
  }

  const TABS: { key: StatusTab; label: string }[] = [
    { key: 'all', label: t('admin.startupList.tabs.all') },
    { key: 'pending_review', label: t('admin.startupList.tabs.pending') },
    { key: 'approved', label: t('admin.startupList.tabs.approved') },
    { key: 'rejected', label: t('admin.startupList.tabs.rejected') },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <AdminPageHeader
        title={t('admin.startupList.title')}
        badge={data && data.pending_count > 0 ? { count: data.pending_count, label: t('admin.startupList.newLabel') } : undefined}
      />

      {/* Segmented control */}
      <div className="flex rounded-md bg-muted p-0.5 gap-0 mb-4">
        {TABS.map(tab => {
          const active = activeTab === tab.key;
          const pending = tab.key === 'pending_review' ? (data?.pending_count ?? 0) : 0;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 flex-1 min-w-0 justify-center ${
                active ? 'bg-admin-surface text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {pending > 0 && (
                <span
                  className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-md text-[10px] font-medium ${
                    active ? 'bg-muted text-muted-foreground' : 'bg-background/50 text-muted-foreground'
                  }`}
                >
                  {pending}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Select
          value={filters.category ?? 'all'}
          onValueChange={v => updateFilter('category', v === 'all' ? null : v as StartupCategory)}
        >
          <SelectTrigger className="w-[200px] h-9 text-sm bg-background border-border">
            <SelectValue placeholder={t('admin.startupList.filters.category')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.startupList.filters.allCategories')}</SelectItem>
            {STARTUP_CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{t(`constants.startupCategories.${c.value}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.stage ?? 'all'}
          onValueChange={v => updateFilter('stage', v === 'all' ? null : v as StartupStage)}
        >
          <SelectTrigger className="w-[160px] h-9 text-sm bg-background border-border">
            <SelectValue placeholder={t('admin.startupList.filters.stage')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.startupList.filters.allStages')}</SelectItem>
            {STARTUP_STAGES.map(s => (
              <SelectItem key={s.value} value={s.value}>{t(`constants.startupStages.${s.value}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasNonDefaultFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs text-muted-foreground">
            {t('admin.startupList.filters.resetFilters')}
          </Button>
        )}
      </div>

      {/* Count */}
      {data && (
        <p className="text-sm text-muted-foreground mb-3">
          {t('admin.startupList.showing', { shown: startups.length, total: data.total })}
        </p>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="rounded-lg border border-border overflow-hidden bg-admin-surface">
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-card p-8 text-center">
          <p className="text-sm mb-3 text-destructive">{t('admin.startupList.errorLoading')}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>{t('admin.startupList.retry')}</Button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && startups.length === 0 && (
        <div className="rounded-lg border border-border bg-admin-surface p-12 text-center">
          <Inbox className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" strokeWidth={1.5} />
          <p className="text-sm font-medium mb-1 text-muted-foreground">{t('admin.startupList.noResults')}</p>
          <p className="text-xs text-muted-foreground">{t('admin.startupList.tryChanging')}</p>
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && startups.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden bg-admin-surface">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border">
                <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground" style={{ width: 100 }}>{t('admin.startupList.columns.date')}</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground" style={{ width: 200 }}>{t('admin.startupList.columns.title')}</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground" style={{ width: 140 }}>{t('admin.startupList.columns.category')}</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground" style={{ width: 100 }}>{t('admin.startupList.columns.stage')}</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground" style={{ width: 100 }}>{t('admin.startupList.columns.fundingAsk')}</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground" style={{ width: 160 }}>{t('admin.startupList.columns.region')}</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground" style={{ width: 130 }}>{t('admin.startupList.columns.status')}</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground w-10" />
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border">
              {startups.map(s => (
                <TableRow
                  key={s.id}
                  onClick={() => navigate(`/admin/startups/${s.id}`)}
                  className="cursor-pointer admin-table-row-hover transition-colors"
                >
                  <TableCell className="px-4 py-3.5 text-sm text-muted-foreground">
                    {formatDate(s.created_at)}
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-sm font-medium text-foreground">
                    {s.title}
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-sm text-muted-foreground">
                    {t(`constants.startupCategories.${s.category}`)}
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-sm text-muted-foreground">
                    {t(`constants.startupStages.${s.stage}`)}
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-sm text-muted-foreground tabular-nums">
                    {formatAmount(s.funding_ask)}
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-sm text-muted-foreground">
                    {s.location_region ? t(`constants.regions.${s.location_region}`, s.location_region) : '—'}
                  </TableCell>
                  <TableCell className="px-4 py-3.5">
                    <StartupStatusBadge status={s.submission_status} />
                  </TableCell>
                  <TableCell className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/admin/startups/${s.id}`)}>
                          {t('admin.startups.open')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteTarget({ id: s.id, title: s.title })}
                        >
                          {t('common.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.startups.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.startups.deleteMessage', { name: deleteTarget?.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pagination */}
      {!isLoading && data && data.total > 20 && (
        <div className="flex items-center justify-center gap-4 mt-5">
          <Button
            variant="ghost"
            size="sm"
            disabled={filters.page <= 1}
            onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
            className="text-sm gap-1 text-muted-foreground"
          >
            <ChevronLeft className="w-4 h-4" /> {t('admin.startupList.prev')}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t('admin.startupList.pageOf', { page: filters.page, total: totalPages })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={filters.page >= totalPages}
            onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
            className="text-sm gap-1 text-muted-foreground"
          >
            {t('admin.startupList.next')} <ChevronR className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
