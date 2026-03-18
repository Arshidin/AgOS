import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { BottomSheet } from '../components/BottomSheet'
import { HOW_HEARD } from '../constants'
import type { RegistrationFormData } from '../constants'

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

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-[#2B180A] font-serif">
          Завершение регистрации
        </h2>
      </div>

      <div className="space-y-4">
        {/* Consent checkboxes */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.consent_terms}
            onChange={(e) => {
              onChange({ consent_terms: e.target.checked })
              if (errors.consent_terms) setErrors((prev) => ({ ...prev, consent_terms: '' }))
            }}
            className="mt-1 w-5 h-5 rounded border-[#e8ddd0] text-[hsl(24,73%,54%)] focus:ring-[hsl(24,73%,54%)] shrink-0"
          />
          <span className="text-sm text-[#2B180A]/80">
            Согласен с{' '}
            <a href="/membership-policy" target="_blank" className="text-[hsl(24,73%,54%)] underline">
              условиями использования платформы
            </a>
          </span>
        </label>
        {errors.consent_terms && (
          <p className="text-xs text-red-500 pl-8">{errors.consent_terms}</p>
        )}

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.consent_data}
            onChange={(e) => {
              onChange({ consent_data: e.target.checked })
              if (errors.consent_data) setErrors((prev) => ({ ...prev, consent_data: '' }))
            }}
            className="mt-1 w-5 h-5 rounded border-[#e8ddd0] text-[hsl(24,73%,54%)] focus:ring-[hsl(24,73%,54%)] shrink-0"
          />
          <span className="text-sm text-[#2B180A]/80">
            Согласен на обработку персональных данных
          </span>
        </label>
        {errors.consent_data && (
          <p className="text-xs text-red-500 pl-8">{errors.consent_data}</p>
        )}

        {/* How heard */}
        <button
          type="button"
          onClick={() => setHowHeardOpen(true)}
          className="w-full h-14 px-4 bg-white border border-[#e8ddd0] rounded-xl text-left flex items-center justify-between hover:border-[#2B180A]/30 transition-colors"
        >
          <span className={selectedHowHeard ? 'text-[#2B180A]' : 'text-[#6b5744]/60'}>
            {selectedHowHeard?.label || 'Как узнали о нас? (необязательно)'}
          </span>
          <svg className="h-4 w-4 text-[#6b5744]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
