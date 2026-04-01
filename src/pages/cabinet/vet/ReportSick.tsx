import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/ui/page-header'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

export function ReportSick() {
  const { userContext, isContextLoading, organization } = useAuth()
  const navigate = useNavigate()

  const farms = userContext?.farms || []
  const selectedFarm = farms.length === 1 ? farms[0] : null

  const [farmId, setFarmId] = useState(selectedFarm?.id || '')
  const [herdGroupId, setHerdGroupId] = useState('')
  const [symptomsText, setSymptomsText] = useState('')
  const [affectedHeads, setAffectedHeads] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Auto-select farm if single
  if (farms.length === 1 && !farmId && farms[0]) {
    setFarmId(farms[0].id)
  }

  const currentFarm = farms.find((f) => f.id === farmId)
  const herdGroups = currentFarm?.herd_groups || []

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!farmId) {
      errs.farm = 'Выберите ферму'
    }
    if (!symptomsText.trim() || symptomsText.trim().length < 10) {
      errs.symptoms = 'Опишите симптомы подробнее (минимум 10 символов)'
    }
    if (affectedHeads) {
      const n = parseInt(affectedHeads)
      if (isNaN(n) || n < 1) {
        errs.affected = 'Укажите число больше 0'
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    if (!organization?.id) return

    setIsSubmitting(true)
    try {
      // Step 1: Create vet case first
      const { data, error } = await supabase.rpc('rpc_create_vet_case', {
        p_organization_id: organization.id,
        p_farm_id: farmId,
        p_herd_group_id: herdGroupId || null,
        p_symptoms_text: symptomsText.trim(),
        p_severity: null,
        p_affected_heads: affectedHeads ? parseInt(affectedHeads) : null,
        p_created_via: 'cabinet_farmer',
      })

      if (error) {
        toast.error(error.message || 'Ошибка создания обращения')
        return
      }

      const result = data as { vet_case_id: string } | null
      if (!result?.vet_case_id) {
        navigate('/cabinet')
        return
      }

      toast.success('Обращение создано. AI анализирует...')
      navigate(`/cabinet/vet/${result.vet_case_id}`)

      // Step 2: Create dedicated conversation for this case + get AI response (async)
      const gatewayUrl = import.meta.env.VITE_AI_GATEWAY_URL
      if (gatewayUrl) {
        fetch(`${gatewayUrl}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organization_id: organization.id,
            user_message: `[VET_CASE:${result.vet_case_id}] ${symptomsText.trim()}`,
            farm_id: farmId,
            phone: userContext?.phone || undefined,
            channel: 'web',
          }),
        })
          .then(r => r.json())
          .then(d => {
            // Link conversation to vet case
            if (d?.conversation_id) {
              supabase.rpc('rpc_link_vet_case_conversation', {
                p_organization_id: organization.id,
                p_vet_case_id: result.vet_case_id,
                p_conversation_id: d.conversation_id,
              }).then(() => {})
            }
          })
          .catch(() => {})
      }
    } catch (err) {
      toast.error('Ошибка создания обращения')
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isContextLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <PageHeader title="Сообщить о болезни" description="AI проанализирует симптомы" />

      <div className="space-y-4">
        {/* Farm selector */}
        {farms.length > 1 ? (
          <div>
            <label className="text-xs text-[var(--fg2)] mb-1 block">Ферма *</label>
            <select
              value={farmId}
              onChange={(e) => {
                setFarmId(e.target.value)
                setHerdGroupId('')
                if (errors.farm) setErrors((prev) => ({ ...prev, farm: '' }))
              }}
              className="reg-input w-full h-12 px-3 bg-[var(--bg-c)] border border-[var(--bd)] rounded-xl text-sm text-[var(--fg)] outline-none focus:border-[var(--cta)]"
              style={{ borderColor: errors.farm ? 'var(--red)' : undefined }}
            >
              <option value="">Выберите ферму</option>
              {farms.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            {errors.farm && <p className="text-xs mt-1" style={{ color: 'var(--red)' }}>{errors.farm}</p>}
          </div>
        ) : farms.length === 1 ? (
          <div className="p-3 bg-[var(--bg)] rounded-xl">
            <p className="text-sm text-[var(--fg)] font-medium">{farms[0]?.name}</p>
          </div>
        ) : (
          <div className="p-3 rounded-xl" style={{ background: 'rgba(179,122,16,0.08)', border: '1px solid rgba(179,122,16,0.15)' }}>
            <p className="text-sm" style={{ color: 'var(--amber)' }}>
              У вас нет ферм. Сначала создайте ферму в разделе "Профиль".
            </p>
          </div>
        )}

        {/* Herd group selector */}
        {herdGroups.length > 0 && (
          <div>
            <label className="text-xs text-[var(--fg2)] mb-1 block">
              Какая группа животных? (необязательно)
            </label>
            <select
              value={herdGroupId}
              onChange={(e) => setHerdGroupId(e.target.value)}
              className="reg-input w-full h-12 px-3 bg-[var(--bg-c)] border border-[var(--bd)] rounded-xl text-sm text-[var(--fg)] outline-none focus:border-[var(--cta)]"
            >
              <option value="">Не знаю / Вся ферма</option>
              {herdGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.animal_category_name || g.animal_category_code}
                  {g.breed_name ? ` (${g.breed_name})` : ''}
                  {` — ${g.head_count} гол.`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Symptoms */}
        <div>
          <label className="text-xs text-[var(--fg2)] mb-1 block">
            Опишите что случилось *
          </label>
          <Textarea
            value={symptomsText}
            onChange={(e) => {
              setSymptomsText(e.target.value)
              if (errors.symptoms) setErrors((prev) => ({ ...prev, symptoms: '' }))
            }}
            placeholder="Например: телёнок не ест второй день, температура 40 градусов, вялый"
            className="h-32 resize-none"
            style={{ borderColor: errors.symptoms ? 'var(--red)' : undefined }}
          />
          <div className="flex items-center justify-between mt-1">
            {errors.symptoms ? (
              <p className="text-xs" style={{ color: 'var(--red)' }}>{errors.symptoms}</p>
            ) : (
              <span />
            )}
            <span className="text-xs text-[var(--fg2)]/50">
              {symptomsText.length}/5000
            </span>
          </div>
        </div>

        {/* Affected heads */}
        <div>
          <label className="text-xs text-[var(--fg2)] mb-1 block">
            Сколько голов болеет? (необязательно)
          </label>
          <input
            type="number"
            value={affectedHeads}
            onChange={(e) => {
              setAffectedHeads(e.target.value)
              if (errors.affected) setErrors((prev) => ({ ...prev, affected: '' }))
            }}
            placeholder="0"
            min="1"
            className="reg-input w-full h-12 px-3 bg-[var(--bg-c)] border border-[var(--bd)] rounded-xl text-sm text-[var(--fg)] outline-none focus:border-[var(--cta)]"
            style={{ borderColor: errors.affected ? 'var(--red)' : undefined }}
          />
          {errors.affected && <p className="text-xs mt-1" style={{ color: 'var(--red)' }}>{errors.affected}</p>}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isSubmitting || farms.length === 0}
        className="w-full h-12 bg-[var(--fg)] text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40"
      >
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {isSubmitting ? 'Отправка...' : 'Отправить'}
      </button>
    </div>
  )
}
