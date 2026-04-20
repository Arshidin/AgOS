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
import StatusBadge from '@/components/admin/StatusBadge';
import RoleBadge from '@/components/admin/RoleBadge';
import { useApplications } from '@/hooks/admin/useApplications';
import { useDeleteApplication } from '@/hooks/admin/useDeleteApplication';
import { useToast } from '@/hooks/use-toast';
import { REGIONS, getLocalizedLabel } from '@/lib/constants';
import type { ApplicationsFilters, ApplicationRole, ApplicationStatus, Application } from '@/types/admin';

type RoleTab = 'all' | 'farmer' | 'mpk';

function getPendingCount(tab: RoleTab, data: { pending_all: number; pending_farmer: number; pending_mpk: number } | undefined) {
  if (!data) return 0;
  if (tab === 'farmer') return data.pending_farmer;
  if (tab === 'mpk') return data.pending_mpk;
  return data.pending_all;
}

export default function ApplicationList() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<RoleTab>('all');
  const [filters, setFilters] = useState<ApplicationsFilters>({
    status: 'pending',
    role: null,
    region: null,
    dateFrom: null,
    dateTo: null,
    page: 1,
  });

  const handleTabChange = (tab: RoleTab) => {
    setActiveTab(tab);
    setFilters(f => ({ ...f, role: tab === 'all' ? null : tab as ApplicationRole, page: 1 }));
  };

  const { data, isLoading, error, refetch } = useApplications(filters);
  const { toast } = useToast();
  const deleteApplication = useDeleteApplication();
  const [deleteTarget, setDeleteTarget] = useState<Application | null>(null);

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteApplication.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast({ title: t('admin.applications.deleted') });
        setDeleteTarget(null);
      },
    });
  };

  const updateFilter = (key: keyof ApplicationsFilters, value: unknown) => {
    setFilters(f => ({ ...f, [key]: value, page: 1 }));
  };

  const resetFilters = () => {
    setFilters({ status: 'pending', role: activeTab === 'all' ? null : activeTab as ApplicationRole, region: null, dateFrom: null, dateTo: null, page: 1 });
  };

  const hasNonDefaultFilters = filters.status !== 'pending' || filters.region !== null || filters.dateFrom !== null || filters.dateTo !== null;

  const apps = data?.data ?? [];
  const totalPages = data?.total_pages ?? 1;

  const monthsShort = t('admin.monthsShort', { returnObjects: true }) as string[];

  function formatDate(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    if (d.toDateString() === now.toDateString()) return `${t('admin.list.today')}, ${time}`;

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return `${t('admin.list.yesterday')}, ${time}`;

    return `${d.getDate()} ${monthsShort[d.getMonth()]} ${d.getFullYear()}`;
  }

  const TABS: { key: RoleTab; label: string }[] = [
    { key: 'all', label: t('admin.list.tabs.all') },
    { key: 'farmer', label: t('admin.list.tabs.farmers') },
    { key: 'mpk', label: t('admin.list.tabs.processors') },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <AdminPageHeader
        title={t('admin.list.title')}
        badge={data && data.pending_all > 0 ? { count: data.pending_all, label: t('admin.list.newLabel') } : undefined}
      />

      {/* Segmented control (filter) — rounded-md, not pill */}
      <div className="flex rounded-md bg-muted p-0.5 gap-0 mb-4">
        {TABS.map(tab => {
          const active = activeTab === tab.key;
          const pending = getPendingCount(tab.key, data);
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 min-w-[4rem] justify-center ${
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
          value={filters.status ?? 'all'}
          onValueChange={v => updateFilter('status', v === 'all' ? null : v as ApplicationStatus)}
        >
          <SelectTrigger className="w-[180px] h-9 text-sm bg-background border-border">
            <SelectValue placeholder={t('admin.list.filters.status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.list.filters.allStatuses')}</SelectItem>
            <SelectItem value="pending">{t('admin.list.filters.pending')}</SelectItem>
            <SelectItem value="approved">{t('admin.list.filters.approved')}</SelectItem>
            <SelectItem value="rejected">{t('admin.list.filters.rejected')}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.region ?? 'all'}
          onValueChange={v => updateFilter('region', v === 'all' ? null : v)}
        >
          <SelectTrigger className="w-[220px] h-9 text-sm bg-background border-border">
            <SelectValue placeholder={t('admin.list.filters.region')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.list.filters.allRegions')}</SelectItem>
            {REGIONS.map(r => (
              <SelectItem key={r.value} value={r.value}>{t(`constants.regions.${r.value}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasNonDefaultFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs text-muted-foreground">
            {t('admin.list.filters.resetFilters')}
          </Button>
        )}
      </div>

      {/* Counter */}
      {data && (
        <p className="text-sm text-muted-foreground mb-3">
          {t('admin.list.showing', { shown: apps.length, total: data.total })}
        </p>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="rounded-lg border border-border overflow-hidden bg-admin-surface">
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-card p-8 text-center">
          <p className="text-sm mb-3 text-destructive">{t('admin.list.errorLoading')}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>{t('admin.list.retry')}</Button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && apps.length === 0 && (
        <div className="rounded-lg border border-border bg-admin-surface p-12 text-center">
          <Inbox className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" strokeWidth={1.5} />
          <p className="text-sm font-medium mb-1 text-muted-foreground">{t('admin.list.noResults')}</p>
          <p className="text-xs text-muted-foreground">{t('admin.list.tryChanging')}</p>
        </div>
      )}

      {/* Table — surface, medium density cells */}
      {!isLoading && !error && apps.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden bg-admin-surface">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border">
                <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground" style={{ width: 100 }}>{t('admin.list.columns.date')}</TableHead>
                {activeTab === 'all' && (
                  <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground" style={{ width: 80 }}>{t('admin.list.columns.type')}</TableHead>
                )}
                <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground" style={{ width: 180 }}>{t('admin.list.columns.name')}</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground" style={{ width: 200 }}>
                  {activeTab === 'mpk' ? t('admin.list.columns.enterprise') : activeTab === 'farmer' ? t('admin.list.columns.farm') : t('admin.list.columns.organization')}
                </TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground" style={{ width: 180 }}>{t('admin.list.columns.region')}</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground" style={{ width: 120 }}>
                  {activeTab === 'mpk' ? t('admin.list.columns.volumeMonth') : activeTab === 'farmer' ? t('admin.list.columns.herdSize') : t('admin.list.columns.volume')}
                </TableHead>
                {activeTab === 'farmer' && (
                  <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground" style={{ width: 120 }}>{t('admin.list.columns.readiness')}</TableHead>
                )}
                {activeTab === 'mpk' && (
                  <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground" style={{ width: 140 }}>{t('admin.list.columns.companyType')}</TableHead>
                )}
                <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground" style={{ width: 130 }}>{t('admin.list.columns.status')}</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground w-10" />
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border">
              {apps.map((app: Application) => (
                <TableRow
                  key={app.id}
                  onClick={() => navigate(`/admin/applications/${app.id}`)}
                  className="cursor-pointer admin-table-row-hover transition-colors"
                >
                  <TableCell className="px-4 py-3.5 text-sm text-muted-foreground">
                    {formatDate(app.created_at)}
                  </TableCell>
                  {activeTab === 'all' && (
                    <TableCell className="px-4 py-3.5"><RoleBadge role={app.role} /></TableCell>
                  )}
                  <TableCell className="px-4 py-3.5 text-sm font-medium text-foreground">
                    {app.full_name}
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-sm text-muted-foreground">
                    {app.role === 'farmer' ? (app.farm_name || '—') : (app.company_name || '—')}
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-sm text-muted-foreground">
                    {app.region || '—'}
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-sm text-muted-foreground">
                    {app.role === 'farmer'
                      ? getLocalizedLabel(t, 'herdSizes', app.herd_size)
                      : getLocalizedLabel(t, 'monthlyVolumes', app.monthly_volume)
                    }
                  </TableCell>
                  {activeTab === 'farmer' && (
                    <TableCell className="px-4 py-3.5 text-sm text-muted-foreground">
                      {getLocalizedLabel(t, 'readyToSell', app.ready_to_sell)}
                    </TableCell>
                  )}
                  {activeTab === 'mpk' && (
                    <TableCell className="px-4 py-3.5 text-sm text-muted-foreground">
                      {getLocalizedLabel(t, 'companyTypes', app.company_type)}
                    </TableCell>
                  )}
                  <TableCell className="px-4 py-3.5">
                    <StatusBadge status={app.status} />
                  </TableCell>
                  <TableCell className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/admin/applications/${app.id}`)}>
                          {t('admin.applications.open')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteTarget(app)}
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
            <AlertDialogTitle>{t('admin.applications.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.applications.deleteMessage', { name: deleteTarget?.full_name })}
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
            <ChevronLeft className="w-4 h-4" /> {t('admin.list.prev')}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t('admin.list.pageOf', { page: filters.page, total: totalPages })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={filters.page >= totalPages}
            onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
            className="text-sm gap-1 text-muted-foreground"
          >
            {t('admin.list.next')} <ChevronR className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
