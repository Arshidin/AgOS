import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, AlertTriangle, Clock, Shield } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface VetCaseData {
  case_id: string
  farm_id: string
  farm_name: string
  herd_group: { id: string; category_name: string; head_count: number } | null
  status: 'open' | 'in_progress' | 'resolved' | 'escalated'
  severity: 'minor' | 'moderate' | 'severe' | 'critical' | null
  symptoms_text: string
  symptoms_structured: { symptom_code: string; confidence: number }[] | null
  affected_heads: number | null
  created_at: string
  created_via: string
  diagnoses: {
    id: string
    disease_name: string
    confidence_pct: number
    source: string
    created_at: string
  }[]
  recommendations: {
    id: string
    type: string
    treatment_name: string | null
    application_method: string | null
    duration_days: number | null
    dosage_note: string
    withdrawal_days: number | null
    notes: string | null
    source: string
    created_at: string
  }[]
  health_restrictions: {
    restriction_type: string
    reason: string
    expires_at: string
  }[]
  consultation_request: {
    id: string | null
    status: string | null
    expert_name: string | null
  } | null
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: 'Открыт', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'В работе', color: 'bg-yellow-100 text-yellow-700' },
  resolved: { label: 'Решён', color: 'bg-green-100 text-green-700' },
  escalated: { label: 'Эскалирован', color: 'bg-red-100 text-red-700' },
}

const SEVERITY_LABELS: Record<string, { label: string; color: string }> = {
  minor: { label: 'Незначительная', color: 'bg-green-100 text-green-700' },
  moderate: { label: 'Умеренная', color: 'bg-yellow-100 text-yellow-700' },
  severe: { label: 'Серьёзная', color: 'bg-red-100 text-red-700' },
  critical: { label: 'Критическая', color: 'bg-red-200 text-red-900' },
}

const CREATED_VIA_LABELS: Record<string, string> = {
  cabinet_farmer: 'Кабинет',
  ai_whatsapp: 'WhatsApp',
  expert_manual: 'Эксперт',
}

const REC_TYPE_LABELS: Record<string, string> = {
  medication: 'Лечение',
  isolation: 'Изоляция',
  nutrition: 'Питание',
  monitoring: 'Наблюдение',
  specialist: 'Специалист',
}

export function VetCaseDetail() {
  const { caseId } = useParams<{ caseId: string }>()
  const { organization } = useAuth()
  const navigate = useNavigate()

  const [vetCase, setVetCase] = useState<VetCaseData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'live' | 'error'>('connecting')

  // Load case data
  const loadCase = async () => {
    if (!organization?.id || !caseId) return

    try {
      const { data, error: rpcError } = await supabase.rpc('rpc_get_vet_case_detail', {
        p_organization_id: organization.id,
        p_vet_case_id: caseId,
      })

      if (rpcError) {
        setError(rpcError.message || 'Ошибка загрузки')
        return
      }

      setVetCase(data as unknown as VetCaseData)
    } catch (err) {
      setError('Ошибка загрузки данных')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCase()
  }, [organization?.id, caseId])

  // Realtime subscription on platform_events
  useEffect(() => {
    if (!organization?.id || !caseId) return

    const channel = supabase
      .channel(`vet-case-${caseId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'platform_events',
          filter: `entity_id=eq.${caseId}`,
        },
        () => {
          // Refetch case data on any new event
          loadCase()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('live')
        } else if (status === 'CHANNEL_ERROR') {
          setRealtimeStatus('error')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [organization?.id, caseId])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    )
  }

  if (error || !vetCase) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/cabinet')}
          className="flex items-center gap-2 text-sm text-[#6b5744] hover:text-[#2B180A]"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад
        </button>
        <div className="p-4 bg-red-50 rounded-xl text-center">
          <p className="text-sm text-red-700">{error || 'Случай не найден'}</p>
          <button
            onClick={loadCase}
            className="mt-2 text-sm text-red-600 underline"
          >
            Повторить
          </button>
        </div>
      </div>
    )
  }

  const statusInfo = STATUS_LABELS[vetCase.status] ?? { label: 'Открыт', color: 'bg-blue-100 text-blue-700' }
  const severityInfo = vetCase.severity
    ? SEVERITY_LABELS[vetCase.severity] || null
    : null

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/cabinet')}
            className="p-1.5 text-[#6b5744] hover:text-[#2B180A] transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-[#2B180A] font-serif">
              Ветеринарный случай
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn('px-2 py-0.5 rounded text-xs font-medium', statusInfo.color)}>
                {statusInfo.label}
              </span>
              {severityInfo && (
                <span className={cn('px-2 py-0.5 rounded text-xs font-medium', severityInfo.color)}>
                  {severityInfo.label}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Realtime indicator */}
        <div className="flex items-center gap-1.5" title={
          realtimeStatus === 'live' ? 'Обновления в реальном времени' : 'Подключение...'
        }>
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              realtimeStatus === 'live' ? 'bg-green-500 animate-pulse' :
              realtimeStatus === 'error' ? 'bg-red-400' : 'bg-gray-400'
            )}
          />
        </div>
      </div>

      {/* Escalation banner */}
      {vetCase.status === 'escalated' && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <Shield className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700">
              Случай передан эксперту-ветеринару ТУРАН
            </p>
            {vetCase.consultation_request?.expert_name && (
              <p className="text-xs text-red-600 mt-0.5">
                Эксперт: {vetCase.consultation_request.expert_name}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Withdrawal/restriction banner */}
      {vetCase.health_restrictions.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            {vetCase.health_restrictions.map((hr, idx) => (
              <p key={idx} className="text-sm text-amber-700">
                Ограничение на продажу до {new Date(hr.expires_at).toLocaleDateString('ru-RU')}
                {hr.reason && <span className="text-xs text-amber-600 block">{hr.reason}</span>}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Case info */}
      <div className="bg-white rounded-xl border border-[#e8ddd0] p-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-[#6b5744]">
          <span>
            {new Date(vetCase.created_at).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          <span className="px-2 py-0.5 bg-[#fdf6ee] rounded text-[10px]">
            {CREATED_VIA_LABELS[vetCase.created_via] || vetCase.created_via}
          </span>
        </div>
        {vetCase.farm_name && (
          <p className="text-sm text-[#2B180A]">
            {vetCase.farm_name}
            {vetCase.herd_group && ` / ${vetCase.herd_group.category_name} (${vetCase.herd_group.head_count} гол.)`}
          </p>
        )}
        {vetCase.affected_heads && (
          <p className="text-xs text-[#6b5744]">
            Больных голов: {vetCase.affected_heads}
          </p>
        )}
      </div>

      {/* Symptoms */}
      <div className="bg-white rounded-xl border border-[#e8ddd0] p-4 space-y-3">
        <h3 className="text-sm font-medium text-[#2B180A]">Симптомы</h3>
        <blockquote className="text-sm text-[#2B180A]/80 bg-[#fdf6ee] p-3 rounded-lg border-l-3 border-[hsl(24,73%,54%)] italic">
          {vetCase.symptoms_text}
        </blockquote>

        {vetCase.symptoms_structured && vetCase.symptoms_structured.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {vetCase.symptoms_structured.map((s, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 bg-[#fdf6ee] rounded-full text-xs text-[#2B180A]/70 border border-[#e8ddd0]"
              >
                {s.symptom_code}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Diagnoses */}
      <div className="bg-white rounded-xl border border-[#e8ddd0] p-4 space-y-3">
        <h3 className="text-sm font-medium text-[#2B180A]">Диагноз</h3>

        {vetCase.diagnoses.length > 0 ? (
          <div className="space-y-3">
            {vetCase.diagnoses.map((diag) => (
              <div key={diag.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#2B180A]">
                    {diag.disease_name}
                  </span>
                  <span className="text-xs text-[#6b5744] px-2 py-0.5 bg-[#fdf6ee] rounded">
                    {diag.source === 'ai_analysis' ? 'AI-анализ' : 'Эксперт'}
                  </span>
                </div>
                {/* Confidence bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-[#e8ddd0] rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        diag.confidence_pct >= 70 ? 'bg-green-500' :
                        diag.confidence_pct >= 40 ? 'bg-yellow-500' : 'bg-red-400'
                      )}
                      style={{ width: `${diag.confidence_pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-[#6b5744] w-10 text-right">
                    {diag.confidence_pct}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 py-4 justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-[#6b5744]" />
            <span className="text-sm text-[#6b5744]">
              AI анализирует симптомы...
            </span>
          </div>
        )}
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-xl border border-[#e8ddd0] p-4 space-y-3">
        <h3 className="text-sm font-medium text-[#2B180A]">Рекомендации</h3>

        {vetCase.recommendations.length > 0 ? (
          <div className="space-y-3">
            {vetCase.recommendations.map((rec) => (
              <div
                key={rec.id}
                className="p-3 bg-[#fdf6ee] rounded-lg border border-[#e8ddd0] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#2B180A]">
                    {REC_TYPE_LABELS[rec.type] || rec.type}
                    {rec.treatment_name ? `: ${rec.treatment_name}` : ''}
                  </span>
                  <span className="text-[10px] text-[#6b5744] px-1.5 py-0.5 bg-white rounded">
                    {rec.source === 'ai_generated' ? 'AI' :
                     rec.source === 'expert_manual' ? 'Эксперт' : 'Протокол'}
                  </span>
                </div>

                {rec.application_method && (
                  <p className="text-xs text-[#6b5744]">
                    Способ: {rec.application_method}
                  </p>
                )}

                {rec.duration_days && (
                  <p className="text-xs text-[#6b5744]">
                    Длительность: {rec.duration_days} дней
                  </p>
                )}

                {/* P-AI-4 CRITICAL: NEVER show numeric dosage */}
                <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1.5 rounded flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  {rec.dosage_note || 'Дозировку определяет ветеринарный врач'}
                </p>

                {rec.withdrawal_days != null && rec.withdrawal_days > 0 && (
                  <p className="text-xs text-red-600 bg-red-50 px-2 py-1.5 rounded flex items-center gap-1.5">
                    <Clock className="h-3 w-3 shrink-0" />
                    Период выведения: {rec.withdrawal_days} дней
                  </p>
                )}

                {rec.notes && (
                  <p className="text-xs text-[#6b5744] italic">{rec.notes}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 py-4 justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-[#6b5744]" />
            <span className="text-sm text-[#6b5744]">
              Рекомендации будут добавлены после анализа
            </span>
          </div>
        )}
      </div>

      {/* Timeline placeholder */}
      <div className="bg-white rounded-xl border border-[#e8ddd0] p-4 space-y-3">
        <h3 className="text-sm font-medium text-[#2B180A]">Хронология</h3>
        <div className="space-y-3">
          {/* Case created */}
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-[hsl(24,73%,54%)] mt-1.5 shrink-0" />
            <div>
              <p className="text-xs text-[#2B180A]">Обращение создано</p>
              <p className="text-[10px] text-[#6b5744]">
                {new Date(vetCase.created_at).toLocaleDateString('ru-RU', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
          </div>

          {/* Diagnoses */}
          {vetCase.diagnoses.map((d) => (
            <div key={d.id} className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
              <div>
                <p className="text-xs text-[#2B180A]">Диагноз: {d.disease_name}</p>
                <p className="text-[10px] text-[#6b5744]">
                  {new Date(d.created_at).toLocaleDateString('ru-RU', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))}

          {/* Recommendations */}
          {vetCase.recommendations.map((r) => (
            <div key={r.id} className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5 shrink-0" />
              <div>
                <p className="text-xs text-[#2B180A]">
                  Рекомендация: {r.treatment_name || REC_TYPE_LABELS[r.type] || r.type}
                </p>
                <p className="text-[10px] text-[#6b5744]">
                  {new Date(r.created_at).toLocaleDateString('ru-RU', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
