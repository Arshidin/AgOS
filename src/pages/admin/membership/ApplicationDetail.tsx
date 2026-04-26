import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Phone, MessageCircle, Loader2, FileText, FileSignature, CreditCard, CheckCircle2, Circle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import StatusBadge from '@/components/admin/StatusBadge';
import RoleBadge from '@/components/admin/RoleBadge';
import ApproveDialog from '@/components/admin/ApproveDialog';
import RejectDialog from '@/components/admin/RejectDialog';
import { useApplication } from '@/hooks/admin/useApplication';
import { useApproveApplication } from '@/hooks/admin/useApproveApplication';
import { useRejectApplication } from '@/hooks/admin/useRejectApplication';
import { useApplicantDocuments } from '@/hooks/admin/useApplicantDocuments';
import { getLocalizedLabel } from '@/lib/constants';
import { REQUIRED_DOCUMENTS } from '@/types/application-flow';

// ─────────────────────────────────────────────────
// Форматирование
// ─────────────────────────────────────────────────

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('7')) {
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`;
  }
  return phone;
}

function getWhatsAppUrl(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits}`;
}

function getTelUrl(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `tel:+${digits}`;
}

// ─────────────────────────────────────────────────
// Секция с парами label–value
// ─────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3
        className="text-xs uppercase tracking-wider mb-3"
        style={{ color: 'var(--fg3)', letterSpacing: '0.05em' }}
      >
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        {children}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs mb-0.5" style={{ color: 'var(--fg3)' }}>{label}</p>
      <p className="text-sm" style={{ color: 'var(--fg)' }}>{value || '—'}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Компонент
// ─────────────────────────────────────────────────

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: app, isLoading, error } = useApplication(id);
  const approve = useApproveApplication();
  const reject = useRejectApplication();

  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  // Fetch applicant's uploaded documents & application progress
  const { data: docStatus } = useApplicantDocuments(app?.phone);

  // Translated months for date formatting
  const months = t('admin.months', { returnObjects: true }) as string[];

  function formatDateFull(iso: string): string {
    const d = new Date(iso);
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  }

  const handleApprove = async () => {
    try {
      await approve.mutateAsync(id!);
      toast.success(t('admin.detail.approvedToast'));
      navigate('/admin/applications');
    } catch (err: any) {
      toast.error(err.message || t('admin.detail.approveError'));
    }
    setApproveOpen(false);
  };

  const handleReject = async (reason: string) => {
    try {
      await reject.mutateAsync({ id: id!, reason });
      toast.success(t('admin.detail.rejectedToast'));
      navigate('/admin/applications');
    } catch (err: any) {
      toast.error(err.message || t('admin.detail.rejectError'));
    }
    setRejectOpen(false);
  };

  // ── Loading
  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  // ── Error
  if (error || !app) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <div className="mx-auto max-w-2xl px-4 py-8 text-center">
          <p className="text-sm mb-3" style={{ color: 'var(--red)' }}>{t('admin.detail.notFound')}</p>
          <Button variant="outline" onClick={() => navigate('/admin/applications')}>
            {t('admin.detail.backToList')}
          </Button>
        </div>
      </div>
    );
  }

  const isFarmer = app.role === 'farmer';

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-6 sm:py-8">

        {/* ── Навигация ── */}
        <div className="mb-6">
          <Link
            to="/admin/applications"
            className="inline-flex items-center gap-1.5 text-sm transition-colors"
            style={{ color: 'var(--fg3)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            {t('admin.detail.backToList')}
          </Link>
        </div>

        {/* ── Шапка ── */}
        <div
          className="rounded-xl border p-5 sm:p-6 mb-6"
          style={{ background: 'var(--bg-c)', borderColor: 'var(--bd-s)' }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <StatusBadge status={app.status} />
              <RoleBadge role={app.role} />
            </div>
            <p className="text-xs" style={{ color: 'var(--fg3)' }}>
              {formatDateFull(app.created_at)}
            </p>
          </div>

          <h1 className="text-xl sm:text-2xl font-semibold mb-2" style={{ color: 'var(--fg)' }}>
            {app.full_name}
          </h1>

          <div className="flex flex-wrap items-center gap-3 mb-1">
            <a
              href={getTelUrl(app.phone)}
              className="inline-flex items-center gap-1.5 text-sm"
              style={{ color: 'var(--fg)' }}
            >
              <Phone className="w-3.5 h-3.5" />
              {formatPhone(app.phone)}
            </a>
            <a
              href={getWhatsAppUrl(app.phone)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(37,211,102,0.1)', color: '#128C7E' }}
            >
              <MessageCircle className="w-3 h-3" />
              WhatsApp
            </a>
          </div>

          {app.region && (
            <p className="text-sm" style={{ color: 'var(--fg3)' }}>{app.region}</p>
          )}
        </div>

        {/* ── Секции данных ── */}
        <div className="space-y-0">
          {isFarmer ? (
            <>
              {/* Farmer sections */}
              <div className="rounded-xl border p-5 sm:p-6 mb-4" style={{ background: 'var(--bg-c)', borderColor: 'var(--bd-s)' }}>
                <Section title={t('admin.detail.aboutFarm')}>
                  <Field label={t('admin.detail.name')} value={app.farm_name} />
                  <Field label={t('admin.detail.binIin')} value={app.bin_iin} />
                  <Field label={t('admin.detail.herdSize')} value={getLocalizedLabel(t, 'herdSizes', app.herd_size)} />
                  <Field label={t('admin.detail.primaryBreed')} value={app.primary_breed} />
                </Section>
              </div>

              <div className="rounded-xl border p-5 sm:p-6 mb-4" style={{ background: 'var(--bg-c)', borderColor: 'var(--bd-s)' }}>
                <Section title={t('admin.detail.salesPlans')}>
                  <Field label={t('admin.detail.readiness')} value={getLocalizedLabel(t, 'readyToSell', app.ready_to_sell)} />
                  <Field label={t('admin.detail.plannedVolume')} value={app.sell_count} />
                </Section>
              </div>
            </>
          ) : (
            <>
              {/* MPK sections */}
              <div className="rounded-xl border p-5 sm:p-6 mb-4" style={{ background: 'var(--bg-c)', borderColor: 'var(--bd-s)' }}>
                <Section title={t('admin.detail.aboutCompany')}>
                  <Field label={t('admin.detail.name')} value={app.company_name} />
                  <Field label={t('admin.detail.bin')} value={app.bin} />
                  <Field label={t('admin.detail.activityType')} value={getLocalizedLabel(t, 'companyTypes', app.company_type)} />
                  <Field label={t('admin.detail.purchaseVolume')} value={getLocalizedLabel(t, 'monthlyVolumes', app.monthly_volume)} />
                </Section>
              </div>

              <div className="rounded-xl border p-5 sm:p-6 mb-4" style={{ background: 'var(--bg-c)', borderColor: 'var(--bd-s)' }}>
                <Section title={t('admin.detail.purchaseNeeds')}>
                  <Field label={t('admin.detail.breeds')} value={app.target_breeds?.join(', ')} />
                  <Field label={t('admin.detail.targetWeight')} value={app.target_weight} />
                  <Field label={t('admin.detail.purchaseFreq')} value={getLocalizedLabel(t, 'procurementFreq', app.procurement_frequency)} />
                </Section>
              </div>
            </>
          )}

          {/* Дополнительно */}
          <div className="rounded-xl border p-5 sm:p-6 mb-4" style={{ background: 'var(--bg-c)', borderColor: 'var(--bd-s)' }}>
            <Section title={t('admin.detail.additional')}>
              <Field label={t('admin.detail.consentGiven')} value={app.consent_given ? t('admin.detail.yes') : t('admin.detail.no')} />
              <Field label={t('admin.detail.source')} value={getLocalizedLabel(t, 'howHeard', app.how_heard)} />
            </Section>
          </div>

          {/* Документы и прогресс заявки */}
          {docStatus && (
            <div className="rounded-xl border p-5 sm:p-6 mb-4" style={{ background: 'var(--bg-c)', borderColor: 'var(--bd-s)' }}>
              <h3
                className="text-xs uppercase tracking-wider mb-3"
                style={{ color: 'var(--fg3)', letterSpacing: '0.05em' }}
              >
                {t('admin.detail.applicationProgress')}
              </h3>
              <div className="space-y-3">
                {/* Documents */}
                <div className="space-y-2">
                  <p className="text-xs font-medium" style={{ color: 'var(--fg2)' }}>
                    {t('admin.detail.documents')}
                  </p>
                  {REQUIRED_DOCUMENTS.map(slot => {
                    const uploaded = docStatus.documents[slot.key] !== null;
                    return (
                      <div key={slot.key} className="flex items-center gap-2 text-sm">
                        {uploaded ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                        )}
                        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className={uploaded ? 'text-foreground' : 'text-muted-foreground'}>
                          {t(slot.labelKey)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Signing */}
                <div className="flex items-center gap-2 text-sm pt-1">
                  {docStatus.signed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                  )}
                  <FileSignature className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className={docStatus.signed ? 'text-foreground' : 'text-muted-foreground'}>
                    {t('admin.detail.applicationSigned')}
                  </span>
                </div>

                {/* Payment */}
                <div className="flex items-center gap-2 text-sm">
                  {docStatus.paymentConfirmed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  ) : docStatus.paymentSkipped ? (
                    <XCircle className="h-4 w-4 text-yellow-500 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                  )}
                  <CreditCard className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className={docStatus.paymentConfirmed || docStatus.paymentSkipped ? 'text-foreground' : 'text-muted-foreground'}>
                    {docStatus.paymentConfirmed
                      ? t('admin.detail.paymentConfirmed')
                      : docStatus.paymentSkipped
                        ? t('admin.detail.paymentSkipped')
                        : t('admin.detail.paymentPending')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Рассмотрение (только если не pending) */}
          {app.status !== 'pending' && (
            <div className="rounded-xl border p-5 sm:p-6 mb-4" style={{ background: 'var(--bg-c)', borderColor: 'var(--bd-s)' }}>
              <Section title={t('admin.detail.review')}>
                <Field label={t('admin.detail.decision')} value={app.status === 'approved' ? t('admin.detail.approvedStatus') : t('admin.detail.rejectedStatus')} />
                <Field label={t('admin.detail.reviewedBy')} value={app.reviewed_by} />
                <Field label={t('admin.detail.decisionDate')} value={app.reviewed_at ? formatDateFull(app.reviewed_at) : '—'} />
                {app.status === 'rejected' && (
                  <Field label={t('admin.detail.rejectionReason')} value={app.rejection_reason} />
                )}
              </Section>
            </div>
          )}
        </div>

        {/* ── Действия (только pending) ── */}
        {app.status === 'pending' && (
          <div
            className="rounded-xl border p-4 sm:p-5 mt-4 flex gap-3"
            style={{ background: 'var(--bg-c)', borderColor: 'var(--bd-s)' }}
          >
            <Button
              className="flex-1 h-11 text-white font-medium"
              style={{ background: 'var(--cta)', color: 'var(--cta-fg)' }}
              onClick={() => setApproveOpen(true)}
              disabled={approve.isPending || reject.isPending}
            >
              {approve.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('admin.detail.approveBtn')}
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-11 font-medium"
              style={{ color: 'var(--red)', borderColor: 'var(--bd)' }}
              onClick={() => setRejectOpen(true)}
              disabled={approve.isPending || reject.isPending}
            >
              {reject.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('admin.detail.rejectBtn')}
            </Button>
          </div>
        )}

        {/* Dialogs */}
        <ApproveDialog
          open={approveOpen}
          onOpenChange={setApproveOpen}
          fullName={app.full_name}
          role={app.role}
          isPending={approve.isPending}
          onConfirm={handleApprove}
        />
        <RejectDialog
          open={rejectOpen}
          onOpenChange={setRejectOpen}
          isPending={reject.isPending}
          onConfirm={handleReject}
        />
      </div>
    </div>
  );
}
