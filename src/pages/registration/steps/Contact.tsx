import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
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
 * Contact step — phone+password auth (v1 pattern).
 * Phone maps to fake email: 7XXXXXXXXXX@phone.turan.kz
 * Migration to OTP when Twilio is configured.
 */
export function Contact({ formData, onChange, onNext }: ContactProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
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

  const handleSubmit = async () => {
    if (!validate()) return
    setIsSubmitting(true)
    try {
      // v1 pattern: phone → fake email for Supabase Auth
      const phoneDigits = formData.phone.replace(/\D/g, '')
      const fakeEmail = `7${phoneDigits}@phone.turan.kz`

      const { error } = await supabase.auth.signUp({
        email: fakeEmail,
        password: formData.password,
      })

      if (error) {
        if (error.message.includes('already registered') || error.message.includes('already exists')) {
          toast.error('Этот номер уже зарегистрирован. Войдите в кабинет.')
        } else {
          toast.error('Ошибка регистрации')
          console.error('Auth error:', error)
        }
        return
      }

      onChange({ otp_verified: true })
      toast.success('Аккаунт создан')
      setTimeout(onNext, 300)
    } catch (err) {
      toast.error('Ошибка регистрации')
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-[#2B180A] font-serif">
          Контактные данные
        </h2>
        <p className="text-sm text-[#6b5744]">
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
          className="w-full h-14 px-4 bg-white border border-[#e8ddd0] rounded-xl text-left flex items-center justify-between hover:border-[#2B180A]/30 transition-colors"
        >
          <span className={selectedRegion ? 'text-[#2B180A]' : 'text-[#6b5744]/60'}>
            {selectedRegion?.name || 'Регион (необязательно)'}
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
        {isSubmitting ? 'Регистрация...' : 'Продолжить'}
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
