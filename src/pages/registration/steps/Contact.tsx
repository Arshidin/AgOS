import { useState } from 'react'
import { FloatingInput } from '../components/FloatingInput'
import { PhoneInput } from '../components/PhoneInput'
import { BottomSheet } from '../components/BottomSheet'
import { REGIONS } from '../constants'
import type { RegistrationFormData } from '../constants'

interface ContactProps {
  formData: RegistrationFormData
  onChange: (updates: Partial<RegistrationFormData>) => void
  onNext: () => void
}

/**
 * Contact step — collects name, phone, password, region.
 * NO auth call here — account is created at Agreement step (after consent).
 */
export function Contact({ formData, onChange, onNext }: ContactProps) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [regionSheetOpen, setRegionSheetOpen] = useState(false)

  const selectedRegion = REGIONS.find((r) => r.id === formData.region_id)

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!formData.full_name.trim() || formData.full_name.trim().length < 2) {
      errs.full_name = 'Введите ваше имя'
    }
    if (formData.phone.length < 10) {
      errs.phone = 'Введите номер телефона'
    }
    if (!formData.password || formData.password.length < 6) {
      errs.password = 'Минимум 6 символов'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleNext = () => {
    if (!validate()) return
    onNext()
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-turan-fg font-serif">
          Контактные данные
        </h2>
        <p className="text-sm text-turan-fg2">
          Как с вами связаться
        </p>
      </div>

      <div className="space-y-4">
        <FloatingInput
          label="Ваше имя"
          value={formData.full_name}
          onChange={(v) => {
            onChange({ full_name: v })
            if (errors.full_name) setErrors((e) => ({ ...e, full_name: '' }))
          }}
          error={errors.full_name}
        />

        <PhoneInput
          value={formData.phone}
          onChange={(v) => {
            onChange({ phone: v })
            if (errors.phone) setErrors((e) => ({ ...e, phone: '' }))
          }}
          error={errors.phone}
        />

        <FloatingInput
          label="Придумайте пароль"
          value={formData.password}
          onChange={(v) => {
            onChange({ password: v })
            if (errors.password) setErrors((e) => ({ ...e, password: '' }))
          }}
          error={errors.password}
          type="password"
        />

        <button
          type="button"
          onClick={() => setRegionSheetOpen(true)}
          className="w-full h-14 px-4 bg-turan-bg-c border border-turan-bd rounded-xl text-left flex items-center justify-between hover:border-turan-bd-h transition-colors"
        >
          <span className={selectedRegion ? 'text-turan-fg' : 'text-turan-fg3'}>
            {selectedRegion?.name || 'Регион (необязательно)'}
          </span>
          <svg className="h-4 w-4 text-turan-fg3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <button
        onClick={handleNext}
        className="reg-btn-primary w-full"
      >
        Продолжить
      </button>

      <BottomSheet
        open={regionSheetOpen}
        onClose={() => setRegionSheetOpen(false)}
        title="Выберите регион"
        options={REGIONS.map((r) => ({ value: r.id, label: r.name }))}
        value={formData.region_id}
        onChange={(v) => onChange({ region_id: v })}
      />
    </div>
  )
}
