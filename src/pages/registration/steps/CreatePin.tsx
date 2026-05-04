import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { phoneToFakeEmail } from '@/lib/auth-utils'
import { PinInput } from '../components/PinInput'
import type { RegistrationFormData } from '../constants'

interface CreatePinProps {
  formData: RegistrationFormData
  onChange: (updates: Partial<RegistrationFormData>) => void
  onNext: () => void
}

export function CreatePin({ formData, onChange, onNext }: CreatePinProps) {
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [step, setStep] = useState<'enter' | 'confirm'>('enter')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const phone = `+7${formData.phone}`

  const handlePinEntered = (value: string) => {
    if (value.length < 6) return
    setPin(value)
    setStep('confirm')
    setPinConfirm('')
    setError(null)
  }

  const handleConfirm = async (value: string) => {
    if (value.length < 6) return
    if (value !== pin) {
      setError('PIN-коды не совпадают — попробуйте снова')
      setPinConfirm('')
      setStep('enter')
      setPin('')
      return
    }
    setError(null)
    setIsLoading(true)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('bird-otp', {
        body: { action: 'register', phone, pin: value },
      })
      if (fnErr || data?.error) {
        toast.error(data?.error || fnErr?.message || 'Ошибка создания аккаунта')
        return
      }

      // Sign in immediately after account creation
      const email = phoneToFakeEmail(phone)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: value,
      })
      if (signInError) {
        toast.error('Аккаунт создан — войдите через /login')
        return
      }

      onChange({ password: value })
      onNext()
    } catch {
      toast.error('Ошибка сети — проверьте соединение')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-[#2B180A] font-serif">
          {step === 'enter' ? 'Придумайте PIN-код' : 'Повторите PIN-код'}
        </h2>
        <p className="text-sm text-[#6b5744]">
          {step === 'enter'
            ? '6 цифр — для быстрого входа в аккаунт'
            : 'Введите PIN ещё раз для подтверждения'}
        </p>
      </div>

      {step === 'enter' ? (
        <PinInput
          key="enter"
          value={pin}
          onChange={setPin}
          onComplete={handlePinEntered}
          label="Введите 6-значный PIN"
          disabled={isLoading}
        />
      ) : (
        <PinInput
          key="confirm"
          value={pinConfirm}
          onChange={setPinConfirm}
          onComplete={handleConfirm}
          label="Повторите PIN"
          disabled={isLoading}
          error={error ?? undefined}
        />
      )}

      {step === 'confirm' && (
        <button
          onClick={() => handleConfirm(pinConfirm)}
          disabled={pinConfirm.length < 6 || isLoading}
          className="reg-btn-primary w-full flex items-center justify-center gap-2"
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isLoading ? 'Создание аккаунта…' : 'Подтвердить'}
        </button>
      )}

      {error && step === 'enter' && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg text-center">
          {error}
        </p>
      )}
    </div>
  )
}
