import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { FloatingInput } from '../components/FloatingInput'
import { PhoneInput } from '../components/PhoneInput'
import { OtpInput } from '../components/OtpInput'
import { BottomSheet } from '../components/BottomSheet'
import { REGIONS } from '../constants'
import type { RegistrationFormData } from '../constants'

interface ContactProps {
  formData: RegistrationFormData
  onChange: (updates: Partial<RegistrationFormData>) => void
  onNext: () => void
}

export function Contact({ formData, onChange, onNext }: ContactProps) {
  const [otpCode, setOtpCode] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [otpError, setOtpError] = useState('')
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
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSendOtp = async () => {
    if (!validate()) return
    setIsSending(true)
    try {
      const phone = `+7${formData.phone}`
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: { shouldCreateUser: true },
      })
      if (error) {
        toast.error('Ошибка отправки SMS')
        console.error('OTP send error:', error)
        return
      }
      onChange({ otp_sent: true })
      toast.success('Код отправлен на ваш номер')
    } catch (err) {
      toast.error('Ошибка отправки SMS')
      console.error(err)
    } finally {
      setIsSending(false)
    }
  }

  const handleVerifyOtp = async (code: string) => {
    setIsVerifying(true)
    setOtpError('')
    try {
      const phone = `+7${formData.phone}`
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: code,
        type: 'sms',
      })
      if (error) {
        setOtpError('Неверный код')
        return
      }
      onChange({ otp_verified: true })
      // Small delay so user sees success state
      setTimeout(onNext, 300)
    } catch (err) {
      setOtpError('Ошибка проверки кода')
      console.error(err)
    } finally {
      setIsVerifying(false)
    }
  }

  if (formData.otp_sent && !formData.otp_verified) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-[#2B180A] font-serif">
            Подтверждение
          </h2>
          <p className="text-sm text-[#6b5744]">
            Код отправлен на +7{formData.phone}
          </p>
        </div>

        <OtpInput
          value={otpCode}
          onChange={(v) => {
            setOtpCode(v)
            setOtpError('')
          }}
          onComplete={handleVerifyOtp}
          error={otpError}
          disabled={isVerifying}
        />

        {isVerifying && (
          <div className="flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-[#6b5744]" />
          </div>
        )}

        <button
          onClick={() => {
            onChange({ otp_sent: false })
            setOtpCode('')
            setOtpError('')
          }}
          className="reg-btn-secondary w-full"
        >
          Изменить номер
        </button>
      </div>
    )
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
        onClick={handleSendOtp}
        disabled={isSending}
        className="reg-btn-primary w-full flex items-center justify-center gap-2"
      >
        {isSending && <Loader2 className="h-4 w-4 animate-spin" />}
        {isSending ? 'Отправка...' : 'Получить код'}
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
