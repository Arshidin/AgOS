import { useState } from 'react'
import { Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BottomSheet } from '../components/BottomSheet'
import { HOW_HEARD, HERD_SIZES, COMPANY_TYPES, MONTHLY_VOLUMES } from '../constants'
import type { RegistrationFormData } from '../constants'

function formatPhoneDisplay(digits: string): string {
  if (digits.length !== 10) return `+7${digits}`
  return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`
}

interface AgreementProps {
  formData: RegistrationFormData
  onChange: (updates: Partial<RegistrationFormData>) => void
  onSubmit: () => Promise<void>
  isSubmitting: boolean
}

export function Agreement({ formData, onChange, onSubmit, isSubmitting }: AgreementProps) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [howHeardOpen, setHowHeardOpen] = useState(false)

  const selectedHowHeard = HOW_HEARD.find((h) => h.value === formData.how_heard)

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!formData.consent_terms) {
      errs.consent_terms = 'Необходимо согласие'
    }
    if (!formData.consent_data) {
      errs.consent_data = 'Необходимо согласие'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    await onSubmit()
  }

  // Build summary items based on role
  const summaryItems: { label: string; value: string }[] = []
  summaryItems.push({ label: 'Имя', value: formData.full_name })
  if (formData.phone) {
    summaryItems.push({ label: 'Телефон', value: formatPhoneDisplay(formData.phone) })
  }
  if (formData.role === 'farmer') {
    if (formData.farm_name) summaryItems.push({ label: 'Хозяйство', value: formData.farm_name })
    if (formData.bin_iin) summaryItems.push({ label: 'БИН/ИИН', value: formData.bin_iin })
    const herdLabel = HERD_SIZES.find((h) => h.value === formData.herd_size)?.label
    if (herdLabel) summaryItems.push({ label: 'Поголовье', value: herdLabel })
  } else {
    if (formData.company_name) summaryItems.push({ label: 'Компания', value: formData.company_name })
    if (formData.bin) summaryItems.push({ label: 'БИН', value: formData.bin })
    if (formData.role === 'mpk') {
      const typeLabel = COMPANY_TYPES.find((t) => t.value === formData.company_type)?.label
      if (typeLabel) summaryItems.push({ label: 'Тип', value: typeLabel })
      const volLabel = MONTHLY_VOLUMES.find((v) => v.value === formData.monthly_volume)?.label
      if (volLabel) summaryItems.push({ label: 'Объём', value: volLabel })
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-turan-fg font-serif">
          Завершение регистрации
        </h2>
      </div>

      {/* Summary box */}
      <div className="rounded-2xl p-5" style={{ background: 'color-mix(in srgb, var(--fg) 2%, transparent)' }}>
        <div className="flex flex-col gap-3.5">
          {summaryItems.map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-turan-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                <Check size={12} className="text-turan-accent" strokeWidth={3} />
              </div>
              <p className="text-sm leading-relaxed text-turan-fg2">
                <span className="text-turan-fg font-medium">{item.label}:</span>{' '}
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {/* Consent checkboxes */}
        <label className="flex items-start gap-3 cursor-pointer">
          <div className="relative shrink-0 mt-0.5">
            <input
              type="checkbox"
              checked={formData.consent_terms}
              onChange={(e) => {
                onChange({ consent_terms: e.target.checked })
                if (errors.consent_terms) setErrors((prev) => ({ ...prev, consent_terms: '' }))
              }}
              className="sr-only"
            />
            <div
              className={cn(
                'w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-200',
                formData.consent_terms
                  ? 'bg-turan-fg border-turan-fg'
                  : errors.consent_terms
                    ? 'border-turan-red bg-turan-bg-c'
                    : 'border-turan-bd-h bg-turan-bg-c',
              )}
            >
              {formData.consent_terms && <Check size={14} className="text-white" strokeWidth={3} />}
            </div>
          </div>
          <span className="text-sm leading-relaxed text-turan-fg/80">
            Согласен с{' '}
            <a
              href="/membership-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              style={{ color: 'var(--accent)' }}
              onClick={(e) => e.stopPropagation()}
            >
              условиями использования платформы
            </a>
          </span>
        </label>
        {errors.consent_terms && (
          <p className="text-xs text-turan-red ml-9 -mt-2 mb-2">{errors.consent_terms}</p>
        )}

        <label className="flex items-start gap-3 cursor-pointer">
          <div className="relative shrink-0 mt-0.5">
            <input
              type="checkbox"
              checked={formData.consent_data}
              onChange={(e) => {
                onChange({ consent_data: e.target.checked })
                if (errors.consent_data) setErrors((prev) => ({ ...prev, consent_data: '' }))
              }}
              className="sr-only"
            />
            <div
              className={cn(
                'w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-200',
                formData.consent_data
                  ? 'bg-turan-fg border-turan-fg'
                  : errors.consent_data
                    ? 'border-turan-red bg-turan-bg-c'
                    : 'border-turan-bd-h bg-turan-bg-c',
              )}
            >
              {formData.consent_data && <Check size={14} className="text-white" strokeWidth={3} />}
            </div>
          </div>
          <span className="text-sm leading-relaxed text-turan-fg/80">
            Согласен на обработку персональных данных
          </span>
        </label>
        {errors.consent_data && (
          <p className="text-xs text-turan-red ml-9 -mt-2 mb-2">{errors.consent_data}</p>
        )}

        {/* How heard */}
        <button
          type="button"
          onClick={() => setHowHeardOpen(true)}
          className="w-full h-14 px-4 bg-turan-bg-c border border-turan-bd rounded-xl text-left flex items-center justify-between hover:border-turan-bd-h transition-colors"
        >
          <span className={selectedHowHeard ? 'text-turan-fg' : 'text-turan-fg2/60'}>
            {selectedHowHeard?.label || 'Как узнали о нас? (необязательно)'}
          </span>
          <svg className="h-4 w-4 text-turan-fg2/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="reg-btn-primary w-full flex items-center justify-center gap-2"
      >
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {isSubmitting ? 'Регистрация...' : 'Зарегистрироваться'}
      </button>

      <BottomSheet
        open={howHeardOpen}
        onClose={() => setHowHeardOpen(false)}
        title="Как узнали о нас?"
        options={HOW_HEARD}
        value={formData.how_heard}
        onChange={(v) => onChange({ how_heard: v })}
      />
    </div>
  )
}
