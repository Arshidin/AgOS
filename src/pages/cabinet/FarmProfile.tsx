import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Plus, Pencil, Stethoscope, Check, X, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { StatusBadge } from '@/components/ui/status-badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Farm, HerdGroup } from '@/contexts/AuthContext'

const SHELTER_TYPES = [
  { value: 'stall', label: 'Стойловое (закрытое)' },
  { value: 'pasture', label: 'Пастбищное (открытое)' },
  { value: 'mixed', label: 'Смешанное' },
  { value: 'feedlot', label: 'Откормочная площадка' },
]

const CALVING_SYSTEMS = [
  { value: 'spring', label: 'Весенний (март–май)' },
  { value: 'autumn', label: 'Осенний (сен–ноя)' },
  { value: 'year_round', label: 'Круглогодичный' },
  { value: 'two_season', label: 'Весна + осень' },
]

const ACTIVITY_TYPES = [
  { id: 'cow_calf', label: 'Мясное маточное стадо' },
  { id: 'finishing', label: 'Откорм' },
  { id: 'dairy', label: 'Молочное скотоводство' },
  { id: 'breeding', label: 'Племенное разведение' },
  { id: 'mixed', label: 'Смешанное' },
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

const ANIMAL_CATEGORIES = [
  { code: 'YOUNG_CALF', name: 'Телята отъёмные (3-8 мес)' },
  { code: 'BULL_CALF', name: 'Бычки (8-18 мес)' },
  { code: 'STEER', name: 'Бычки на откорме (12-30 мес)' },
  { code: 'HEIFER_YOUNG', name: 'Тёлки (8-18 мес)' },
  { code: 'HEIFER_PREG', name: 'Нетели (18-30 мес)' },
  { code: 'COW', name: 'Коровы (30+ мес)' },
  { code: 'COW_CULL', name: 'Коровы выбракованные' },
  { code: 'BULL_BREEDING', name: 'Быки-производители' },
  { code: 'BULL_CULL', name: 'Быки выбракованные' },
]

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-widest font-semibold mb-4"
       style={{ color: 'var(--fg3)' }}>
      {children}
    </p>
  )
}

function PropRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-x-4 py-2.5 border-b border-[var(--bd)] last:border-0">
      <span className="text-sm" style={{ color: 'var(--fg3)' }}>{label}</span>
      <span className="text-sm font-medium" style={{ color: value ? 'var(--fg)' : 'var(--fg3)' }}>
        {value || '—'}
      </span>
    </div>
  )
}

export function FarmProfile() {
  const { userContext, isContextLoading, organization, refreshContext } = useAuth()
  const navigate = useNavigate()
  const farm = userContext?.farms?.[0] as Farm | undefined
  const membership = userContext?.memberships?.[0]

  const [isEditingFarm, setIsEditingFarm] = useState(false)
  const [farmName, setFarmName] = useState('')
  const [shelterType, setShelterType] = useState('')
  const [calvingSystem, setCalvingSystem] = useState('')
  const [isSavingFarm, setIsSavingFarm] = useState(false)
  const [farmNameError, setFarmNameError] = useState(false)

  const [activities, setActivities] = useState<string[]>([])

  const [showHerdForm, setShowHerdForm] = useState(false)
  const [herdForm, setHerdForm] = useState<HerdGroupFormData>(EMPTY_HERD_FORM)
  const [isSavingHerd, setIsSavingHerd] = useState(false)
  const [herdErrors, setHerdErrors] = useState<Record<string, string>>({})

  const [breedsDb, setBreedsDb] = useState<Array<{ id: string; name: string }>>([])
  useEffect(() => {
    supabase.from('breeds').select('id, name_ru').eq('is_active', true).order('name_ru')
      .then(({ data }) => { if (data) setBreedsDb(data.map(b => ({ id: b.id, name: b.name_ru }))) })
  }, [])

  useEffect(() => {
    if (farm) {
      setFarmName(farm.name || '')
      setShelterType(farm.shelter_type || '')
      setCalvingSystem(farm.calving_system || '')
      setIsEditingFarm(false)
    } else {
      setIsEditingFarm(true)
    }
  }, [farm])

  const cancelEdit = () => {
    setIsEditingFarm(false)
    setFarmName(farm?.name || '')
    setShelterType(farm?.shelter_type || '')
    setCalvingSystem(farm?.calving_system || '')
    setFarmNameError(false)
  }

  const handleSaveFarm = async () => {
    if (!farmName.trim()) {
      setFarmNameError(true)
      toast.error('Введите название фермы')
      return
    }
    setFarmNameError(false)
    if (!organization?.id) {
      toast.error('Организация не найдена. Перезагрузите страницу.')
      return
    }
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
      if (error) { toast.error(error.message || 'Ошибка сохранения'); return }
      toast.success(farm ? 'Данные фермы обновлены' : 'Ферма создана!')
      await refreshContext()
      setIsEditingFarm(false)
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
      ? activities.filter(a => a !== activityId)
      : [...activities, activityId]
    setActivities(newActivities)
    try {
      const { error } = await supabase.rpc('rpc_set_farm_activity_types', {
        p_organization_id: organization!.id,
        p_farm_id: farm.id,
        p_activity_types: newActivities,
      })
      if (error) { toast.error('Ошибка сохранения'); setActivities(activities) }
    } catch {
      setActivities(activities)
    }
  }

  const handleSaveHerdGroup = async () => {
    const errs: Record<string, string> = {}
    if (!herdForm.animal_category_code) errs.category = 'Выберите категорию'
    const headCount = parseInt(herdForm.head_count)
    if (!herdForm.head_count || isNaN(headCount) || headCount < 1) errs.head_count = 'Укажите количество голов'
    if (herdForm.avg_weight_kg) {
      const w = parseFloat(herdForm.avg_weight_kg)
      if (isNaN(w) || w < 1 || w > 2000) errs.avg_weight = 'Вес должен быть от 1 до 2000 кг'
    }
    setHerdErrors(errs)
    if (Object.keys(errs).length > 0) return
    if (!organization?.id || !farm?.id) { toast.error('Сначала сохраните ферму'); return }

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
      if (error) { toast.error(error.message || 'Ошибка сохранения'); return }
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

  // ─── Derived ─────────────────────────────────────────────────────────────────
  const totalHeads = farm?.herd_groups?.reduce((s, g) => s + (g.head_count || 0), 0) || 0
  const groupCount = farm?.herd_groups?.length || 0
  const hasRestrictions = (userContext?.health_restrictions?.length || 0) > 0

  const membershipBadgeStatus =
    membership?.status === 'active' ? 'approved' :
    membership?.status === 'applicant' ? 'submitted' : 'open'
  const membershipLabel =
    membership?.status === 'active' ? 'Член ассоциации' :
    membership?.status === 'applicant' ? 'Заявка подана' : 'Зарегистрирован'

  const shelterLabel = SHELTER_TYPES.find(s => s.value === farm?.shelter_type)?.label
  const calvingLabel = CALVING_SYSTEMS.find(c => c.value === farm?.calving_system)?.label

  // ─── Plural helper ────────────────────────────────────────────────────────────
  const groupWord = groupCount === 1 ? 'группа' : groupCount < 5 ? 'группы' : 'групп'

  // ─── Loading ──────────────────────────────────────────────────────────────────
  if (isContextLoading) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-5">
        <div className="flex items-start gap-4">
          <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-5 w-28" />
          </div>
        </div>
        <Skeleton className="h-px w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-px w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  // ─── Create-farm state (no farm yet) ──────────────────────────────────────────
  if (!farm) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex items-start gap-4 mb-8">
          <div className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center text-base font-semibold select-none"
            style={{ background: 'var(--bg-m)', color: 'var(--fg3)' }}>
            Ф
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--fg)' }}>
              Создать ферму
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--fg2)' }}>
              Добавьте информацию о вашем хозяйстве
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--fg2)' }}>
              Название фермы <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <input
              value={farmName}
              onChange={e => { setFarmName(e.target.value); setFarmNameError(false) }}
              placeholder="Например: КХ «Айгерим»"
              className="w-full h-11 px-3 rounded-xl text-sm outline-none transition-colors"
              style={{
                background: 'var(--bg-c)',
                border: `1px solid ${farmNameError ? 'var(--red)' : 'var(--bd)'}`,
                color: 'var(--fg)',
              }}
              onFocus={e => (e.target.style.borderColor = farmNameError ? 'var(--red)' : 'var(--cta)')}
              onBlur={e => (e.target.style.borderColor = farmNameError ? 'var(--red)' : 'var(--bd)')}
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--fg2)' }}>Тип содержания</label>
            <Select value={shelterType || undefined} onValueChange={setShelterType}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Не указано" /></SelectTrigger>
              <SelectContent>
                {SHELTER_TYPES.map(st => <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--fg2)' }}>Система отёлов</label>
            <Select value={calvingSystem || undefined} onValueChange={setCalvingSystem}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Не указано" /></SelectTrigger>
              <SelectContent>
                {CALVING_SYSTEMS.map(cs => <SelectItem key={cs.value} value={cs.value}>{cs.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <button
            onClick={handleSaveFarm}
            disabled={isSavingFarm}
            className="w-full h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 mt-2 transition-opacity disabled:opacity-40"
            style={{ background: 'var(--cta)', color: 'var(--cta-fg)' }}
          >
            {isSavingFarm && <Loader2 className="h-4 w-4 animate-spin" />}
            Создать ферму
          </button>
        </div>
      </div>
    )
  }

  // ─── Main layout (farm exists) ────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-2xl mx-auto">

      {/* ── HERO ───────────────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4 mb-8">
        {/* Farm avatar */}
        <div
          className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center text-base font-semibold select-none"
          style={{ background: 'var(--bg-m)', color: 'var(--fg2)' }}
        >
          {(farmName || 'Ф').charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          {/* Name row */}
          <div className="flex items-center justify-between gap-3">
            {isEditingFarm ? (
              <input
                value={farmName}
                onChange={e => { setFarmName(e.target.value); setFarmNameError(false) }}
                autoFocus
                className="flex-1 text-xl font-semibold bg-transparent outline-none border-b pb-px transition-colors"
                style={{
                  color: 'var(--fg)',
                  borderColor: farmNameError ? 'var(--red)' : 'var(--cta)',
                }}
                placeholder="Название фермы"
              />
            ) : (
              <h1 className="text-xl font-semibold tracking-tight truncate" style={{ color: 'var(--fg)' }}>
                {farm.name}
              </h1>
            )}

            {/* Edit / Save / Cancel */}
            {isEditingFarm ? (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={handleSaveFarm}
                  disabled={isSavingFarm}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-40"
                  style={{ background: 'var(--cta)', color: 'var(--cta-fg)' }}
                >
                  {isSavingFarm ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Сохранить
                </button>
                <button
                  onClick={cancelEdit}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--fg3)] hover:text-[var(--fg)] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditingFarm(true)}
                className="shrink-0 flex items-center gap-1.5 text-xs transition-colors"
                style={{ color: 'var(--fg3)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--fg)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg3)')}
              >
                <Pencil className="h-3 w-3" />
                Изменить
              </button>
            )}
          </div>

          {/* Subtitle — metadata strip */}
          {!isEditingFarm && (shelterLabel || calvingLabel) && (
            <p className="text-sm mt-0.5 flex items-center gap-1.5 flex-wrap" style={{ color: 'var(--fg2)' }}>
              {shelterLabel}
              {shelterLabel && calvingLabel && <span style={{ color: 'var(--bd-h)' }}>·</span>}
              {calvingLabel}
            </p>
          )}

          {/* Stats strip */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <StatusBadge status={membershipBadgeStatus} label={membershipLabel} />
            {totalHeads > 0 && (
              <span className="text-xs" style={{ color: 'var(--fg3)' }}>
                {totalHeads.toLocaleString('ru-RU')} гол.
              </span>
            )}
            {groupCount > 0 && (
              <span className="text-xs" style={{ color: 'var(--fg3)' }}>
                {groupCount} {groupWord}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── EDIT FIELDS (shelter + calving) ───────────────────────────────────── */}
      {isEditingFarm && (
        <div className="mb-8 space-y-3 p-4 rounded-xl border"
          style={{ borderColor: 'var(--bd)', background: 'var(--bg-c)' }}>
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--fg2)' }}>Тип содержания</label>
            <Select value={shelterType || undefined} onValueChange={setShelterType}>
              <SelectTrigger className="h-10 bg-transparent"><SelectValue placeholder="Не указано" /></SelectTrigger>
              <SelectContent>
                {SHELTER_TYPES.map(st => <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--fg2)' }}>Система отёлов</label>
            <Select value={calvingSystem || undefined} onValueChange={setCalvingSystem}>
              <SelectTrigger className="h-10 bg-transparent"><SelectValue placeholder="Не указано" /></SelectTrigger>
              <SelectContent>
                {CALVING_SYSTEMS.map(cs => <SelectItem key={cs.value} value={cs.value}>{cs.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* ── SECTION: ХАРАКТЕРИСТИКИ (view only) ──────────────────────────────── */}
      {!isEditingFarm && (
        <section className="mb-8">
          <SectionLabel>Характеристики</SectionLabel>
          <PropRow label="Тип содержания" value={shelterLabel} />
          <PropRow label="Система отёлов" value={calvingLabel} />
        </section>
      )}

      {/* ── SECTION: ВИДЫ ДЕЯТЕЛЬНОСТИ ───────────────────────────────────────── */}
      <section className="mb-8">
        <SectionLabel>Виды деятельности</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {ACTIVITY_TYPES.map(at => {
            const selected = activities.includes(at.id)
            return (
              <button
                key={at.id}
                onClick={() => handleActivityToggle(at.id)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  background: selected ? 'var(--cta)' : 'var(--bg-m)',
                  color: selected ? 'var(--cta-fg)' : 'var(--fg2)',
                  border: `1px solid ${selected ? 'transparent' : 'var(--bd)'}`,
                }}
              >
                {at.label}
              </button>
            )
          })}
        </div>
        {activities.length === 0 && (
          <p className="text-xs mt-2" style={{ color: 'var(--fg3)' }}>
            Нажмите на категорию чтобы выбрать
          </p>
        )}
      </section>

      {/* ── SECTION: ПОГОЛОВЬЕ ───────────────────────────────────────────────── */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <SectionLabel>Поголовье</SectionLabel>
          <button
            onClick={() => { setHerdForm(EMPTY_HERD_FORM); setShowHerdForm(true); setHerdErrors({}) }}
            className="flex items-center gap-1 text-xs transition-colors -mt-4"
            style={{ color: 'var(--fg3)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--fg)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg3)')}
          >
            <Plus className="h-3.5 w-3.5" />
            Добавить
          </button>
        </div>

        {/* Herd rows */}
        {farm.herd_groups && farm.herd_groups.length > 0 ? (
          <div>
            {farm.herd_groups.map(group => (
              <div
                key={group.id}
                className="flex items-center justify-between py-3 border-b group"
                style={{ borderColor: 'var(--bd)' }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                    {group.animal_category_name || group.animal_category_code}
                  </p>
                  {group.breed_name && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--fg3)' }}>
                      {group.breed_name}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--fg)' }}>
                    {group.head_count} гол.
                  </span>
                  {group.avg_weight_kg != null && (
                    <span className="text-xs tabular-nums w-14 text-right" style={{ color: 'var(--fg3)' }}>
                      {group.avg_weight_kg} кг
                    </span>
                  )}
                  <button
                    onClick={() => editHerdGroup(group)}
                    className="p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--fg3)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--fg)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg3)')}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !showHerdForm && (
            <div className="py-8 text-center">
              <p className="text-sm" style={{ color: 'var(--fg3)' }}>Нет групп животных</p>
              <button
                onClick={() => { setHerdForm(EMPTY_HERD_FORM); setShowHerdForm(true) }}
                className="mt-1.5 text-sm underline underline-offset-2 transition-colors"
                style={{ color: 'var(--fg2)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--fg)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg2)')}
              >
                Добавить первую группу
              </button>
            </div>
          )
        )}

        {/* Inline herd form */}
        {showHerdForm && (
          <div className="mt-4 p-4 rounded-xl border space-y-3"
            style={{ borderColor: 'var(--bd)', background: 'var(--bg-c)' }}>
            <p className="text-xs font-semibold" style={{ color: 'var(--fg2)' }}>
              {herdForm.id ? 'Редактировать группу' : 'Новая группа'}
            </p>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--fg2)' }}>Категория *</label>
              <Select
                value={herdForm.animal_category_code || undefined}
                onValueChange={v => { setHerdForm(f => ({ ...f, animal_category_code: v })); if (herdErrors.category) setHerdErrors(e => ({ ...e, category: '' })) }}
              >
                <SelectTrigger className="h-10" style={{ borderColor: herdErrors.category ? 'var(--red)' : undefined }}>
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {ANIMAL_CATEGORIES.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {herdErrors.category && <p className="text-xs mt-1" style={{ color: 'var(--red)' }}>{herdErrors.category}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'var(--fg2)' }}>Голов *</label>
                <input
                  type="number" min="1"
                  value={herdForm.head_count}
                  onChange={e => { setHerdForm(f => ({ ...f, head_count: e.target.value })); if (herdErrors.head_count) setHerdErrors(e => ({ ...e, head_count: '' })) }}
                  placeholder="0"
                  className="w-full h-10 px-3 rounded-xl text-sm outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  style={{ background: 'var(--bg-s)', border: `1px solid ${herdErrors.head_count ? 'var(--red)' : 'var(--bd)'}`, color: 'var(--fg)' }}
                  onFocus={e => (e.target.style.borderColor = herdErrors.head_count ? 'var(--red)' : 'var(--cta)')}
                  onBlur={e => (e.target.style.borderColor = herdErrors.head_count ? 'var(--red)' : 'var(--bd)')}
                />
                {herdErrors.head_count && <p className="text-xs mt-1" style={{ color: 'var(--red)' }}>{herdErrors.head_count}</p>}
              </div>
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'var(--fg2)' }}>Ср. вес (кг)</label>
                <input
                  type="number" min="1" max="2000"
                  value={herdForm.avg_weight_kg}
                  onChange={e => { setHerdForm(f => ({ ...f, avg_weight_kg: e.target.value })); if (herdErrors.avg_weight) setHerdErrors(e => ({ ...e, avg_weight: '' })) }}
                  placeholder="—"
                  className="w-full h-10 px-3 rounded-xl text-sm outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  style={{ background: 'var(--bg-s)', border: `1px solid ${herdErrors.avg_weight ? 'var(--red)' : 'var(--bd)'}`, color: 'var(--fg)' }}
                  onFocus={e => (e.target.style.borderColor = herdErrors.avg_weight ? 'var(--red)' : 'var(--cta)')}
                  onBlur={e => (e.target.style.borderColor = herdErrors.avg_weight ? 'var(--red)' : 'var(--bd)')}
                />
                {herdErrors.avg_weight && <p className="text-xs mt-1" style={{ color: 'var(--red)' }}>{herdErrors.avg_weight}</p>}
              </div>
            </div>

            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--fg2)' }}>Порода</label>
              <Select value={herdForm.breed_id || undefined} onValueChange={v => setHerdForm(f => ({ ...f, breed_id: v }))}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Не указана" /></SelectTrigger>
                <SelectContent>
                  {breedsDb.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSaveHerdGroup}
                disabled={isSavingHerd}
                className="flex-1 h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
                style={{ background: 'var(--cta)', color: 'var(--cta-fg)' }}
              >
                {isSavingHerd && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {herdForm.id ? 'Обновить' : 'Добавить'}
              </button>
              <button
                onClick={() => { setShowHerdForm(false); setHerdForm(EMPTY_HERD_FORM); setHerdErrors({}) }}
                className="h-10 px-4 text-sm rounded-xl transition-colors"
                style={{ color: 'var(--fg2)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--fg)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg2)')}
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── HEALTH RESTRICTION WARNING ────────────────────────────────────────── */}
      {hasRestrictions && (
        <section className="mb-8 pt-6 border-t" style={{ borderColor: 'var(--bd)' }}>
          <div className="flex items-start gap-3 p-4 rounded-xl"
            style={{ background: 'rgba(192,57,43,0.07)', border: '1px solid rgba(192,57,43,0.14)' }}>
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--red)' }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--red)' }}>Ограничение на продажу</p>
              {userContext!.health_restrictions.map(hr => (
                <p key={hr.id} className="text-xs mt-0.5" style={{ color: 'var(--red)' }}>
                  {hr.reason} — до {new Date(hr.expires_at).toLocaleDateString('ru-RU')}
                </p>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── QUICK ACTION ─────────────────────────────────────────────────────── */}
      <div className="pt-6 border-t" style={{ borderColor: 'var(--bd)' }}>
        <button
          onClick={() => navigate('/cabinet/vet/new')}
          className="flex items-center gap-2 text-sm transition-opacity hover:opacity-70"
          style={{ color: 'var(--red)' }}
        >
          <Stethoscope className="h-4 w-4" />
          Сообщить о болезни
        </button>
      </div>

    </div>
  )
}
