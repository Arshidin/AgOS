import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Plus, Pencil, Stethoscope } from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { StatusBadge } from '@/components/ui/status-badge'
import type { Farm, HerdGroup } from '@/contexts/AuthContext'

const SHELTER_TYPES = [
  { value: 'open', label: 'Открытое содержание' },
  { value: 'semi_open', label: 'Полуоткрытое' },
  { value: 'closed', label: 'Закрытое (коровник)' },
  { value: 'combined', label: 'Комбинированное' },
]

const CALVING_SYSTEMS = [
  { value: 'seasonal_spring', label: 'Сезонный (весна)' },
  { value: 'seasonal_autumn', label: 'Сезонный (осень)' },
  { value: 'year_round', label: 'Круглогодичный' },
]

const ACTIVITY_TYPES = [
  { id: 'beef_cattle', label: 'Мясное скотоводство' },
  { id: 'dairy_cattle', label: 'Молочное скотоводство' },
  { id: 'sheep', label: 'Овцеводство' },
  { id: 'goat', label: 'Козоводство' },
  { id: 'horse', label: 'Коневодство' },
]

interface HerdGroupFormData {
  id: string | null
  animal_category_code: string
  head_count: string
  avg_weight_kg: string
  breed_id: string
}

const EMPTY_HERD_FORM: HerdGroupFormData = {
  id: null,
  animal_category_code: '',
  head_count: '',
  avg_weight_kg: '',
  breed_id: '',
}

// Hardcoded for now (P8 future: from DB)
const ANIMAL_CATEGORIES = [
  { code: 'bulls_under_6m', name: 'Бычки до 6 мес' },
  { code: 'bulls_6_12m', name: 'Бычки 6-12 мес' },
  { code: 'bulls_12_18m', name: 'Бычки 12-18 мес' },
  { code: 'bulls_over_18m', name: 'Бычки 18+ мес' },
  { code: 'heifers_under_12m', name: 'Тёлки до 12 мес' },
  { code: 'heifers_12_24m', name: 'Тёлки 12-24 мес' },
  { code: 'cows', name: 'Коровы' },
  { code: 'breeding_bulls', name: 'Быки-производители' },
]

const BREEDS_LIST = [
  { id: 'kazakh_whiteheaded', name: 'Казахская белоголовая' },
  { id: 'angus', name: 'Ангус' },
  { id: 'hereford', name: 'Герефорд' },
  { id: 'simmental', name: 'Симментальская' },
  { id: 'auliekol', name: 'Аулиекольская' },
  { id: 'kalmyk', name: 'Калмыцкая' },
  { id: 'mixed', name: 'Смешанная' },
]

export function FarmProfile() {
  const { userContext, isContextLoading, organization, refreshContext } = useAuth()
  const navigate = useNavigate()
  const farm = userContext?.farms?.[0] as Farm | undefined
  const membership = userContext?.memberships?.[0]

  // Farm edit state
  const [farmName, setFarmName] = useState('')
  const [shelterType, setShelterType] = useState('')
  const [calvingSystem, setCalvingSystem] = useState('')
  const [isSavingFarm, setIsSavingFarm] = useState(false)
  const [farmNameError, setFarmNameError] = useState(false)

  // Activity types
  const [activities, setActivities] = useState<string[]>([])

  // Herd group form
  const [showHerdForm, setShowHerdForm] = useState(false)
  const [herdForm, setHerdForm] = useState<HerdGroupFormData>(EMPTY_HERD_FORM)
  const [isSavingHerd, setIsSavingHerd] = useState(false)
  const [herdErrors, setHerdErrors] = useState<Record<string, string>>({})

  // Sync farm data to local state
  useEffect(() => {
    if (farm) {
      setFarmName(farm.name || '')
      setShelterType(farm.shelter_type || '')
      setCalvingSystem(farm.calving_system || '')
    }
  }, [farm])

  const handleSaveFarm = async () => {
    if (!farmName.trim()) {
      setFarmNameError(true)
      toast.error('Введите название фермы')
      return
    }
    setFarmNameError(false)
    if (!organization?.id) return

    setIsSavingFarm(true)
    try {
      const { error } = await supabase.rpc('rpc_upsert_farm', {
        p_organization_id: organization.id,
        p_farm_id: farm?.id || null,
        p_name: farmName.trim(),
        p_region_id: null,
        p_shelter_type: shelterType || null,
        p_calving_system: calvingSystem || null,
      })
      if (error) {
        toast.error(error.message || 'Ошибка сохранения')
        return
      }
      toast.success('Данные фермы сохранены')
      await refreshContext()
    } catch (err) {
      toast.error('Ошибка сохранения')
      console.error(err)
    } finally {
      setIsSavingFarm(false)
    }
  }

  const handleActivityToggle = async (activityId: string) => {
    if (!farm?.id) return
    const newActivities = activities.includes(activityId)
      ? activities.filter((a) => a !== activityId)
      : [...activities, activityId]
    setActivities(newActivities)

    try {
      const { error } = await supabase.rpc('rpc_set_farm_activity_types', {
        p_farm_id: farm.id,
        p_activity_type_ids: newActivities,
      })
      if (error) {
        toast.error('Ошибка сохранения')
        // Revert
        setActivities(activities)
      }
    } catch {
      setActivities(activities)
    }
  }

  const handleSaveHerdGroup = async () => {
    const errs: Record<string, string> = {}
    if (!herdForm.animal_category_code) {
      errs.category = 'Выберите категорию'
    }
    const headCount = parseInt(herdForm.head_count)
    if (!herdForm.head_count || isNaN(headCount) || headCount < 1) {
      errs.head_count = 'Укажите количество голов'
    }
    if (herdForm.avg_weight_kg) {
      const w = parseFloat(herdForm.avg_weight_kg)
      if (isNaN(w) || w < 1 || w > 2000) {
        errs.avg_weight = 'Вес должен быть от 1 до 2000 кг'
      }
    }
    setHerdErrors(errs)
    if (Object.keys(errs).length > 0) return

    if (!organization?.id || !farm?.id) return

    setIsSavingHerd(true)
    try {
      const { error } = await supabase.rpc('rpc_upsert_herd_group', {
        p_organization_id: organization.id,
        p_farm_id: farm.id,
        p_herd_group_id: herdForm.id || null,
        p_animal_category_code: herdForm.animal_category_code,
        p_head_count: parseInt(herdForm.head_count),
        p_avg_weight_kg: herdForm.avg_weight_kg ? parseFloat(herdForm.avg_weight_kg) : null,
        p_breed_id: herdForm.breed_id || null,
      })
      if (error) {
        toast.error(error.message || 'Ошибка сохранения')
        return
      }
      toast.success(herdForm.id ? 'Группа обновлена' : 'Группа добавлена')
      setShowHerdForm(false)
      setHerdForm(EMPTY_HERD_FORM)
      await refreshContext()
    } catch (err) {
      toast.error('Ошибка сохранения')
      console.error(err)
    } finally {
      setIsSavingHerd(false)
    }
  }

  const editHerdGroup = (group: HerdGroup) => {
    setHerdForm({
      id: group.id,
      animal_category_code: group.animal_category_code,
      head_count: String(group.head_count),
      avg_weight_kg: group.avg_weight_kg ? String(group.avg_weight_kg) : '',
      breed_id: group.breed_id || '',
    })
    setShowHerdForm(true)
    setHerdErrors({})
  }

  // Loading skeleton
  if (isContextLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  const membershipBadgeStatus = membership?.status === 'active'
    ? 'approved'
    : membership?.status === 'applicant'
    ? 'submitted'
    : 'open'

  const membershipLabel = membership?.status === 'active'
    ? 'Член ассоциации'
    : membership?.status === 'applicant'
    ? 'Заявка подана'
    : 'Зарегистрирован'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--fg)] font-serif">
            {farm?.name || 'Моя ферма'}
          </h2>
          <StatusBadge status={membershipBadgeStatus} label={membershipLabel} className="mt-1" />
        </div>
      </div>

      {/* Health restrictions warning */}
      {userContext?.health_restrictions && userContext.health_restrictions.length > 0 && (
        <div className="p-3 rounded-xl" style={{ background: 'rgba(192,57,43,0.08)', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(192,57,43,0.15)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--red)' }}>
            Ограничение на продажу
          </p>
          {userContext.health_restrictions.map((hr) => (
            <p key={hr.id} className="text-xs mt-1" style={{ color: 'var(--red)' }}>
              {hr.reason} — до {new Date(hr.expires_at).toLocaleDateString('ru-RU')}
            </p>
          ))}
        </div>
      )}

      {/* Farm Info Section */}
      <div className="bg-[var(--bg-c)] rounded-xl border border-[var(--bd)] p-4 space-y-4">
        <h3 className="text-sm font-medium text-[var(--fg)]">Данные фермы</h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-[var(--fg2)] mb-1 block">Название фермы *</label>
            <input
              value={farmName}
              onChange={(e) => { setFarmName(e.target.value); if (farmNameError) setFarmNameError(false) }}
              className="reg-input w-full h-11 px-3 bg-[var(--bg)] border border-[var(--bd)] rounded-lg text-sm text-[var(--fg)] outline-none focus:border-[var(--cta)]"
              style={{ borderColor: farmNameError ? 'var(--red)' : undefined }}
            />
          </div>

          <div>
            <label className="text-xs text-[var(--fg2)] mb-1 block">Тип содержания</label>
            <select
              value={shelterType}
              onChange={(e) => setShelterType(e.target.value)}
              className="reg-input w-full h-11 px-3 bg-[var(--bg)] border border-[var(--bd)] rounded-lg text-sm text-[var(--fg)] outline-none focus:border-[var(--cta)]"
            >
              <option value="">Не указано</option>
              {SHELTER_TYPES.map((st) => (
                <option key={st.value} value={st.value}>{st.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-[var(--fg2)] mb-1 block">Система отёлов</label>
            <select
              value={calvingSystem}
              onChange={(e) => setCalvingSystem(e.target.value)}
              className="reg-input w-full h-11 px-3 bg-[var(--bg)] border border-[var(--bd)] rounded-lg text-sm text-[var(--fg)] outline-none focus:border-[var(--cta)]"
            >
              <option value="">Не указано</option>
              {CALVING_SYSTEMS.map((cs) => (
                <option key={cs.value} value={cs.value}>{cs.label}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSaveFarm}
            disabled={isSavingFarm}
            className="w-full h-11 bg-[var(--fg)] text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {isSavingFarm && <Loader2 className="h-4 w-4 animate-spin" />}
            Сохранить
          </button>
        </div>
      </div>

      {/* Activity Types */}
      <div className="bg-[var(--bg-c)] rounded-xl border border-[var(--bd)] p-4 space-y-3">
        <h3 className="text-sm font-medium text-[var(--fg)]">Виды деятельности</h3>
        <div className="space-y-2">
          {ACTIVITY_TYPES.map((at) => (
            <label key={at.id} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={activities.includes(at.id)}
                onChange={() => handleActivityToggle(at.id)}
                className="w-4.5 h-4.5 rounded border-[var(--bd)] text-[var(--cta)] focus:ring-[var(--cta)]"
              />
              <span className="text-sm text-[var(--fg)]/80">{at.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Herd Groups */}
      <div className="bg-[var(--bg-c)] rounded-xl border border-[var(--bd)] p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-[var(--fg)]">Группы животных</h3>
          <button
            onClick={() => {
              setHerdForm(EMPTY_HERD_FORM)
              setShowHerdForm(true)
              setHerdErrors({})
            }}
            className="flex items-center gap-1.5 text-xs text-[var(--cta)] font-medium hover:opacity-80"
          >
            <Plus className="h-3.5 w-3.5" />
            Добавить
          </button>
        </div>

        {/* Existing groups */}
        {farm?.herd_groups && farm.herd_groups.length > 0 ? (
          <div className="space-y-2">
            {farm.herd_groups.map((group) => (
              <div
                key={group.id}
                className="flex items-center justify-between p-3 bg-[var(--bg)] rounded-lg"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--fg)] truncate">
                    {group.animal_category_name || group.animal_category_code}
                    {group.breed_name ? ` (${group.breed_name})` : ''}
                  </p>
                  <p className="text-xs text-[var(--fg2)] mt-0.5">
                    {group.head_count} гол.
                    {group.avg_weight_kg ? ` / ${group.avg_weight_kg} кг` : ''}
                    {' '}
                    <span className="text-[var(--fg2)]/50">
                      {group.data_source === 'ai_extracted' ? 'AI' : 'ручной ввод'}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => editHerdGroup(group)}
                  className="p-2 text-[var(--fg2)] hover:text-[var(--fg)]"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          !showHerdForm && (
            <p className="text-sm text-[var(--fg2)]/60 text-center py-4">
              Добавьте группы животных
            </p>
          )
        )}

        {/* Inline form */}
        {showHerdForm && (
          <div className="border border-[var(--bd)] rounded-lg p-3 space-y-3 bg-[var(--bg)]">
            <div>
              <label className="text-xs text-[var(--fg2)] mb-1 block">Категория *</label>
              <select
                value={herdForm.animal_category_code}
                onChange={(e) => {
                  setHerdForm((f) => ({ ...f, animal_category_code: e.target.value }))
                  if (herdErrors.category) setHerdErrors((e2) => ({ ...e2, category: '' }))
                }}
                className="reg-input w-full h-10 px-3 bg-[var(--bg-c)] border border-[var(--bd)] rounded-lg text-sm text-[var(--fg)]"
                style={{ borderColor: herdErrors.category ? 'var(--red)' : undefined }}
              >
                <option value="">Выберите категорию</option>
                {ANIMAL_CATEGORIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
              {herdErrors.category && <p className="text-xs text-red-500 mt-1">{herdErrors.category}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--fg2)] mb-1 block">Голов *</label>
                <input
                  type="number"
                  value={herdForm.head_count}
                  onChange={(e) => {
                    setHerdForm((f) => ({ ...f, head_count: e.target.value }))
                    if (herdErrors.head_count) setHerdErrors((e2) => ({ ...e2, head_count: '' }))
                  }}
                  placeholder="0"
                  min="1"
                  className="reg-input w-full h-10 px-3 bg-[var(--bg-c)] border border-[var(--bd)] rounded-lg text-sm text-[var(--fg)]"
                  style={{ borderColor: herdErrors.head_count ? 'var(--red)' : undefined }}
                />
                {herdErrors.head_count && <p className="text-xs text-red-500 mt-1">{herdErrors.head_count}</p>}
              </div>
              <div>
                <label className="text-xs text-[var(--fg2)] mb-1 block">Ср. вес (кг)</label>
                <input
                  type="number"
                  value={herdForm.avg_weight_kg}
                  onChange={(e) => {
                    setHerdForm((f) => ({ ...f, avg_weight_kg: e.target.value }))
                    if (herdErrors.avg_weight) setHerdErrors((e2) => ({ ...e2, avg_weight: '' }))
                  }}
                  placeholder="0"
                  className="reg-input w-full h-10 px-3 bg-[var(--bg-c)] border border-[var(--bd)] rounded-lg text-sm text-[var(--fg)]"
                  style={{ borderColor: herdErrors.avg_weight ? 'var(--red)' : undefined }}
                />
                {herdErrors.avg_weight && <p className="text-xs text-red-500 mt-1">{herdErrors.avg_weight}</p>}
              </div>
            </div>

            <div>
              <label className="text-xs text-[var(--fg2)] mb-1 block">Порода</label>
              <select
                value={herdForm.breed_id}
                onChange={(e) => setHerdForm((f) => ({ ...f, breed_id: e.target.value }))}
                className="reg-input w-full h-10 px-3 bg-[var(--bg-c)] border border-[var(--bd)] rounded-lg text-sm text-[var(--fg)]"
              >
                <option value="">Не указана</option>
                {BREEDS_LIST.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSaveHerdGroup}
                disabled={isSavingHerd}
                className="flex-1 h-10 bg-[var(--fg)] text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-40"
              >
                {isSavingHerd && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {herdForm.id ? 'Обновить' : 'Добавить'}
              </button>
              <button
                onClick={() => {
                  setShowHerdForm(false)
                  setHerdForm(EMPTY_HERD_FORM)
                  setHerdErrors({})
                }}
                className="h-10 px-4 text-sm text-[var(--fg2)] hover:text-[var(--fg)]"
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigate to vet */}
      <button
        onClick={() => navigate('/cabinet/vet/new')}
        className="w-full flex items-center gap-3 p-4 rounded-xl transition-colors text-left"
        style={{ background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.10)' }}
      >
        <Stethoscope className="h-5 w-5 shrink-0" style={{ color: 'var(--red)' }} />
        <span className="text-sm font-medium" style={{ color: 'var(--red)' }}>Сообщить о болезни</span>
      </button>
    </div>
  )
}
